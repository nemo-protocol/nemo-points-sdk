import { Decimal } from "decimal.js";
import { bcs } from "@mysten/sui/bcs";
import { burnSCoin } from "@/lib/txHelper/coin";
import { getCoinValue } from "./lib/txHelper/coin";
import type { PositionQueryConfig } from "./types";
import { NEED_MIN_VALUE_LIST } from "./lib/constants";
import { Transaction } from "@mysten/sui/transactions";
import { getPriceVoucher } from "./lib/txHelper/price";
import { initPyPosition } from "./lib/txHelper/position";
import { queryYield } from "./dryrun/syCoinValue/queryYield";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { redeemSyCoin, redeemInterest } from "./lib/txHelper/redeem";
import { claimReward } from "./lib/txHelper/rewards";
import { mergeLpPositions } from "./lib/txHelper/lp";
import type {
  LpPosition,
  PyPosition,
  LpPositionRaw,
  // PyPositionRaw,
  QueryYieldParams,
} from "./types/position";
import type { RewardMetric } from "./types";
import type { ClaimRewardConfig } from "./types/rewards";

export class PositionQuery {
  private client: SuiClient;
  private graphqlEndpoint: string;

  constructor({ rpcUrl, network = "mainnet" }: PositionQueryConfig) {
    const url = rpcUrl || getFullnodeUrl(network);
    this.client = new SuiClient({ url });
    // 修正GraphQL endpoint
    this.graphqlEndpoint =
      network === "mainnet"
        ? "https://sui-mainnet.mystenlabs.com/graphql"
        : network === "testnet"
          ? "https://sui-testnet.mystenlabs.com/graphql"
          : "https://sui-mainnet.mystenlabs.com/graphql"; // 默认主网
  }

  /**
 * 通用的GraphQL分页查询方法
 */
  private async queryGraphQLWithPagination<T>(
    query: string,
    variables: Record<string, any>,
    pageSize: number = 50
  ): Promise<{ nodes: T[]; errors: string[] }> {
    const allNodes: T[] = [];
    const errors: string[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let pageCount = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3; // 连续失败3次后停止

    console.log(`开始GraphQL分页查询，每页${pageSize}条记录`);

    while (hasNextPage) {
      pageCount++;
      console.log(`正在获取第${pageCount}页数据...`);

      try {
        const response: Response = await fetch(this.graphqlEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            variables: {
              ...variables,
              first: pageSize,
              after: cursor,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const data: any = await response.json();
        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const objects: any = data.data?.objects;
        if (!objects) {
          throw new Error("Invalid GraphQL response structure");
        }

        const nodes: T[] = objects.nodes || [];
        const pageInfo: any = objects.pageInfo;

        allNodes.push(...nodes);
        console.log(`第${pageCount}页获取到${nodes.length}条记录，总计${allNodes.length}条`);

        // 更新分页信息
        hasNextPage = pageInfo?.hasNextPage || false;
        cursor = pageInfo?.endCursor || null;
        consecutiveFailures = 0; // 重置连续失败计数

        // 添加延迟避免触发100 req/min速率限制
        if (hasNextPage) {
          console.log(`等待585ms避免触发速率限制...`);
          await new Promise(resolve => setTimeout(resolve, 585));
        }
      } catch (error) {
        consecutiveFailures++;
        const errorMessage = `第${pageCount}页查询失败: ${error}`;
        console.error(errorMessage);
        errors.push(errorMessage);

        // 如果连续失败次数过多，停止查询
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`连续失败${maxConsecutiveFailures}次，停止查询`);
          break;
        }

        // 等待更长时间后重试
        console.log(`等待2秒后继续查询下一页...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`GraphQL分页查询完成，共获取${allNodes.length}条记录，分${pageCount}页，错误数: ${errors.length}`);
    return { nodes: allNodes, errors };
  }

  /**
   * Query LP Position data
   */
  async queryLpPositions(options: {
    address: string;
    maturity?: string;
    marketStateId?: string;
    positionTypes: string[];
  }): Promise<LpPosition[]> {
    const { address, positionTypes, maturity, marketStateId } = options;

    if (!address) {
      throw new Error("address is required");
    }

    if (!positionTypes || positionTypes.length === 0) {
      throw new Error("positionTypes are required");
    }

    try {
      const response = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          MatchAny: positionTypes.map((type) => ({ StructType: type })),
        },
        options: {
          showContent: true,
        },
      });

      return response.data
        .map(
          (item) => (item.data?.content as { fields?: LpPositionRaw })?.fields
        )
        .filter((item): item is LpPositionRaw => !!item)
        .map((item) => ({
          id: item.id,
          name: item.name,
          expiry: item.expiry,
          lpAmount: item.lp_amount,
          description: item.description,
          marketStateId: item.market_state_id,
        }))
        .filter((item) => {
          const matchesMaturity = !maturity || item.expiry === maturity;
          const matchesMarketStateId =
            !marketStateId || item.marketStateId === marketStateId;
          return matchesMaturity && matchesMarketStateId;
        })
        .sort((a, b) => Decimal.sub(b.lpAmount, a.lpAmount).toNumber());
    } catch (error) {
      throw new Error(`Failed to query LP positions: ${error}`);
    }
  }

  /**
   * Query PY Position data (including PT and YT balance)
   */
  async queryPyPositions(options: {
    address: string;
    positionTypes: string[];
    maturity?: string;
    pyStateId?: string;
  }): Promise<PyPosition[]> {
    const { address, positionTypes, maturity, pyStateId } = options;

    if (!address) {
      throw new Error("address is required");
    }

    if (!positionTypes || positionTypes.length === 0) {
      throw new Error("positionTypes are required");
    }

    try {
      const allPositions: PyPosition[] = [];

      for (const positionType of positionTypes) {
        const query = `
          query GetPyPositions($type: String!) {
            objects(filter: { type: $type }) {
              nodes {
                address
                digest
                asMoveObject {
                  contents { 
                    json 
                  }
                }
              }
            }
          }
        `;

        const response: Response = await fetch(this.graphqlEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            variables: { type: positionType },
          }),
        });

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const data: any = await response.json();

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const nodes: any[] = data.data?.objects?.nodes || [];

        // 在映射之前先过滤
        const filteredNodes = nodes.filter((node: any) => {
          const fields = node.asMoveObject?.contents?.json;
          if (!fields) return false;

          // 检查 maturity 匹配
          if (maturity && fields.expiry !== maturity) return false;

          // 检查 pyStateId 匹配
          if (pyStateId && fields.py_state_id !== pyStateId) return false;

          return true;
        });

        const positions = filteredNodes
          .map((node: any) => {
            const fields = node.asMoveObject?.contents?.json;
            if (!fields) return null;

            return {
              id: node.address,
              maturity: fields.expiry,
              ptBalance: fields.pt_balance,
              ytBalance: fields.yt_balance,
              pyStateId: fields.py_state_id,
            };
          })
          .filter((item: any): item is PyPosition => !!item);

        allPositions.push(...positions);
      }

      return allPositions;
    } catch (error) {
      throw new Error(`Failed to query PY positions: ${error}`);
    }
  }

  /**
   * Query total PT and YT balances (sum of all PY Positions)
   */
  async queryPyBalance(options: {
    address: string;
    maturity?: string;
    pyStateId?: string;
    positionTypes: string[];
  }): Promise<{
    ptBalance: string;
    ytBalance: string;
  }> {
    const pyPositions = await this.queryPyPositions(options);

    const ptBalance = pyPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.ptBalance).toString(),
      "0"
    );

    const ytBalance = pyPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.ytBalance).toString(),
      "0"
    );

    return {
      ptBalance,
      ytBalance,
    };
  }

  /**
   * Query total LP balance (sum of all LP Positions)
   */
  async queryLpBalance(options: {
    address: string;
    positionTypes: string[];
    maturity?: string;
    marketStateId?: string;
  }): Promise<string> {
    const lpPositions = await this.queryLpPositions(options);

    return lpPositions.reduce(
      (sum, position) => new Decimal(sum).plus(position.lpAmount).toString(),
      "0"
    );
  }

  /**
   * Query YT Yield amount (simulate redeem_due_interest)
   */
  async queryYield({
    config,
    address,
    ytBalance,
    pyPositions,
    receivingType = "sy",
  }: QueryYieldParams): Promise<{
    outputValue: string;
    outputAmount: string;
  }> {
    if (!address) {
      throw new Error("Address is required");
    }
    if (!config) {
      throw new Error("config is required");
    }
    if (!ytBalance || ytBalance === "0") {
      throw new Error("No YT balance to claim");
    }

    try {
      const tx = new Transaction();
      tx.setSender(address);

      const { pyPosition, created } = initPyPosition({
        tx,
        config,
        pyPositions,
      });

      const [priceVoucher] = getPriceVoucher(tx, config);

      const syCoin = redeemInterest(tx, config, pyPosition, priceVoucher);

      const yieldToken = redeemSyCoin(tx, config, syCoin);

      if (created) {
        tx.transferObjects([pyPosition], address);
      }

      if (receivingType === "underlying") {
        const minValue =
          NEED_MIN_VALUE_LIST.find(
            (item) =>
              item.provider === config.provider ||
              item.coinType === config.coinType
          )?.minValue || "0";

        const { syValue } = await queryYield({
          config,
          address,
          ytBalance,
          pyPositions,
          client: this.client,
        });

        if (new Decimal(syValue).gte(minValue)) {
          const underlyingCoin = await burnSCoin({
            tx,
            config,
            address,
            sCoin: yieldToken,
          });

          getCoinValue(tx, underlyingCoin, config.underlyingCoinType);
        } else {
          throw new Error("Insufficient yield amount to burn underlying coin");
        }
      } else {
        getCoinValue(tx, yieldToken, config.coinType);
      }

      const result = await this.client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: this.client,
          onlyTransactionKind: true,
        }),
      });

      if (result.error) {
        throw new Error(`Failed to query yield: ${result.error}`);
      }

      const lastResult = result.results?.[result.results.length - 1];
      if (!lastResult || lastResult?.returnValues?.[0][1] !== "u64") {
        throw new Error("Failed to get yield amount");
      }

      const decimal = Number(config.decimal);
      const outputAmount = bcs.U64.parse(
        new Uint8Array(lastResult.returnValues[0][0])
      );
      const outputValue = new Decimal(outputAmount)
        .div(10 ** decimal)
        .toString();

      return { outputAmount, outputValue };
    } catch (error) {
      throw new Error(`Failed to query yield: ${error}`);
    }
  }

  /**
   * Query PY Position holders count using GraphQL
   * 统计持有特定类型PY Position的用户数量，PT和YT分开统计
   */
  async queryPyPositionHoldersCount(options: {
    positionTypes: string[];
    maturity?: string;
    pyStateId?: string;
    pageSize?: number; // 可配置的分页大小
  }): Promise<{
    ptHolders: number;
    ytHolders: number;
    totalHolders: number;
    holdersByType: Record<string, { ptHolders: number; ytHolders: number }>;
    totalPositions: number;
  }> {
    const { positionTypes, maturity, pyStateId, pageSize = 50 } = options;

    if (!positionTypes || positionTypes.length === 0) {
      throw new Error("positionTypes are required");
    }

    try {
      // 用for循环分别请求每个type
      const allNodes: any[] = [];

      console.log(`开始查询PY Position持有者数量，共${positionTypes.length}种类型`);

      for (let i = 0; i < positionTypes.length; i++) {
        const positionType = positionTypes[i];
        console.log(`正在查询第${i + 1}/${positionTypes.length}种类型: ${positionType}`);

        const query = `
          query GetPyPositionHolders($type: String!, $first: Int!, $after: String) {
            objects(filter: { type: $type }, first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                address
                asMoveObject {
                  contents {
                    json
                  }
                }
              }
            }
          }
        `;

        const result = await this.queryGraphQLWithPagination(query, { type: positionType }, pageSize);

        // 记录错误信息
        if (result.errors.length > 0) {
          console.warn(`类型${positionType}查询过程中出现${result.errors.length}个错误:`, result.errors);
        }

        // 在添加到 allNodes 之前先过滤
        const filteredNodes = result.nodes.filter((node: any) => {
          const fields = node.asMoveObject?.contents?.json;
          if (!fields) return false;

          // 检查 maturity 匹配
          if (maturity && fields.expiry !== maturity) return false;

          // 检查 pyStateId 匹配
          if (pyStateId && fields.py_state_id !== pyStateId) return false;

          return true;
        });

        console.log(`类型${positionType}过滤后剩余${filteredNodes.length}条记录`);
        allNodes.push(...filteredNodes);
      }

      // 统计PT和YT持有者，使用独立的map
      const ptOwners = new Set<string>();
      const ytOwners = new Set<string>();
      const ptAddressMap: Record<string, boolean> = {};
      const ytAddressMap: Record<string, boolean> = {};

      console.log("queryPyPositionHoldersCount allNodes", allNodes);

      allNodes.forEach((node: any) => {
        const address = node.address;
        const fields = node.asMoveObject?.contents?.json;
        if (!address || !fields) return;

        // 检查PT余额
        const ptBalance = new Decimal(fields.pt_balance || "0");
        if (ptBalance.gt(0) && !ptAddressMap[address]) {
          ptAddressMap[address] = true;
          ptOwners.add(address);
        }

        // 检查YT余额
        const ytBalance = new Decimal(fields.yt_balance || "0");
        if (ytBalance.gt(0) && !ytAddressMap[address]) {
          ytAddressMap[address] = true;
          ytOwners.add(address);
        }
      });

      return {
        ptHolders: ptOwners.size,
        ytHolders: ytOwners.size,
        totalHolders: new Set([...ptOwners, ...ytOwners]).size,
        holdersByType: {},
        totalPositions: allNodes.length,
      };
    } catch (error) {
      throw new Error(`Failed to query PY position holders count: ${error}`);
    }
  }

  /**
   * Query LP Position holders count using GraphQL
   * 统计持有特定类型LP Position的用户数量
   */
  async queryLpPositionHoldersCount(options: {
    positionTypes: string[];
    maturity?: string;
    marketStateId?: string;
    pageSize?: number; // 可配置的分页大小
  }): Promise<{
    totalHolders: number;
    holdersByType: Record<string, number>;
    totalPositions: number;
  }> {
    const { positionTypes, maturity, marketStateId, pageSize = 50 } = options;

    if (!positionTypes || positionTypes.length === 0) {
      throw new Error("positionTypes are required");
    }

    try {
      // 根据文档，我们需要分别查询每种类型，然后合并结果
      const allNodes: any[] = [];

      console.log(`开始查询LP Position持有者数量，共${positionTypes.length}种类型`);

      for (let i = 0; i < positionTypes.length; i++) {
        const positionType = positionTypes[i];
        console.log(`正在查询第${i + 1}/${positionTypes.length}种类型: ${positionType}`);

        const query = `
          query GetLpPositionHolders($type: String!, $first: Int!, $after: String) {
            objects(filter: { type: $type }, first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                address
                asMoveObject {
                  contents {
                    json
                  }
                }
              }
            }
          }
        `;

        const result = await this.queryGraphQLWithPagination(query, { type: positionType }, pageSize);

        // 记录错误信息
        if (result.errors.length > 0) {
          console.warn(`类型${positionType}查询过程中出现${result.errors.length}个错误:`, result.errors);
        }

        // 在添加到 allNodes 之前先过滤
        const filteredNodes = result.nodes.filter((node: any) => {
          const fields = node.asMoveObject?.contents?.json;
          if (!fields) return false;

          // 检查maturity匹配
          if (maturity && fields.expiry !== maturity) return false;

          // 检查marketStateId匹配
          if (marketStateId && fields.market_state_id !== marketStateId)
            return false;

          return true;
        });

        console.log(`类型${positionType}过滤后剩余${filteredNodes.length}条记录`);
        allNodes.push(...filteredNodes);
      }

      console.log("queryLpPositionHoldersCount allNodes", allNodes);

      // 统计LP持有者，每个地址只统计一次
      const lpOwners = new Set<string>();
      const addressMap: Record<string, boolean> = {};

      allNodes.forEach((node: any) => {
        const address = node.address;
        const fields = node.asMoveObject?.contents?.json;
        if (!address || !fields) return;

        // 检查lp_amount_display是否大于0
        const lpAmountDisplay = new Decimal(fields.lp_amount_display || "0");
        if (lpAmountDisplay.gt(0) && !addressMap[address]) {
          addressMap[address] = true;
          lpOwners.add(address);
        }
      });

      return {
        totalHolders: lpOwners.size,
        holdersByType: {},
        totalPositions: allNodes.length,
      };
    } catch (error) {
      throw new Error(`Failed to query LP position holders count: ${error}`);
    }
  }

  /**
   * Query rewards for multiple reward metrics
   */
  async queryRewards(options: {
    address: string;
    config: Omit<ClaimRewardConfig, "syCoinType">;
    lpPositions: LpPosition[];
    rewardMetrics: RewardMetric[];
  }): Promise<Array<{
    coinType: string;
    coinName: string;
    amount: string;
  }>> {
    const { address, config, lpPositions, rewardMetrics } = options;
    const results: Array<{ coinType: string; coinName: string; amount: string }> = [];

    try {
      const tx = new Transaction();
      tx.setSender(address);

      // 合并LP仓位
      const mergedLpPosition = mergeLpPositions(tx, config, lpPositions, "0", false);

      // 依次添加每个奖励币种的claim和getCoinValue
      for (let i = 0; i < rewardMetrics.length; i++) {
        const rewardMetric = rewardMetrics[i];
        const coin = claimReward(
          tx,
          config,
          mergedLpPosition,
          rewardMetric.syCoinType,
          rewardMetric.tokenType,
          false
        );
        getCoinValue(tx, coin, rewardMetric.tokenType);
      }

      // dry-run
      const result = await this.client.devInspectTransactionBlock({
        sender: address,
        transactionBlock: await tx.build({
          client: this.client,
          onlyTransactionKind: true,
        }),
      });

      if (!result.results) throw new Error("No results returned from devInspect");

      // 解析每个奖励币种的返回
      let index = 1;
      for (let i = 0; i < rewardMetrics.length; i++) {
        const rewardMetric = rewardMetrics[i];
        const flatIndex = index;
        index += 2;

        const resultItem = result.results[flatIndex];
        if (!resultItem || !resultItem.returnValues || resultItem.returnValues.length === 0) {
          continue;
        }

        const [[balanceBytes]] = resultItem.returnValues;
        const rewardRaw = bcs.U64.parse(new Uint8Array(balanceBytes));
        const decimal = Number(rewardMetric.decimal);
        const amount = new Decimal(rewardRaw).div(new Decimal(10).pow(decimal)).toString();

        results.push({
          coinType: rewardMetric.tokenType,
          coinName: rewardMetric.tokenName || rewardMetric.tokenType,
          amount,
        });
      }
    } catch (error) {
      // 只抛出异常，不返回 errors 字段
      throw error;
    }

    return results;
  }
}
