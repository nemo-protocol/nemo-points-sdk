import type { CoinData } from "../api/types.js";
import type { CoinConfig } from "../api/types.js";
import type { MarketState } from "../api/types.js";
import type { LpPosition } from "../types/position";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";

import {
  mintPY,
  redeemSyCoin,
  depositSyCoin,
  splitCoinHelper,
  mergeAllLpPositions,
} from "../lib/txHelper/index";
import { getPriceVoucher } from "../lib/txHelper/price";
import { mintMultiSCoin, mintSCoin } from "../lib/txHelper/coin";
import { initPyPosition } from "../core/trade/initPyPosition.js";

import Decimal from "decimal.js";
import { NEED_MIN_VALUE_LIST } from "../lib/constants";
import { safeDivide } from "../utils";
import { estimateLpOut } from "../lib/lpEstimate.js";
import { addLiquiditySinglePtDryRun } from "../dryrun/pt/addLiquiditySinglePt.js";
import { mintCoin } from "../dryrun/syCoinValue/mintCoin";
import {
  handleAddLiquiditySingleSy,
  handleMintLp,
  seedLiquidity,
} from "../core/market";

interface MintLpParams {
  tx: Transaction;
  address: string;
  vaultId?: string;
  slippage: string;
  addAmount: string;
  tokenType: number;
  minLpAmount: string;
  coinData: CoinData[];
  coinConfig: CoinConfig;
  pyPosition: TransactionObjectArgument;
  marketState: MarketState;
  // LP position data
  lpPositions: LpPosition[];
  // estimateLpOut required dependencies
  suiClient: any;
  defaultAddress: string;
}

interface AddLiquiditySingleSyParams {
  tx: Transaction;
  vaultId?: string;
  slippage: string;
  addAmount: string;
  tokenType: number;
  coinConfig: CoinConfig;
  coinData: CoinData[];
  coinType: string;
  pyPosition: TransactionObjectArgument;
  address: string;
  minLpAmount: string;
  conversionRate: string;
  syCoinParam?: TransactionObjectArgument;
  // SDK dependencies
  suiClient: any;
  defaultAddress: string;
  // LP position data
  lpPositions: LpPosition[];
}

interface SeedLiquidityParams {
  tx: Transaction;
  addAmount: string;
  tokenType: number;
  coinConfig: CoinConfig;
  coinData: CoinData[];
  coinType: string;
  pyPosition: TransactionObjectArgument;
  address: string;
  minLpAmount: string;
  vaultId?: string;
  slippage: string;
}

interface AddLiquidityParams {
  decimal: number;
  addType: string;
  address: string;
  slippage: string;
  lpValue: string;
  coinType: string;
  coinConfig: CoinConfig;
  conversionRate: string;
  marketStateData: any;
  coinData: CoinData[];
  insufficientBalance: boolean;
  addValue: string;
  tokenType: number;
  pyPositionData: any;
  vaultId?: string;
  action: string;
  // LP position data
  lpPositions: LpPosition[];
  // SDK dependencies
  suiClient: any;
  defaultAddress: string;
  // Optional transaction object
  tx?: Transaction;
}

function mintLp(params: MintLpParams): Promise<void> {
  const {
    tx,
    vaultId,
    slippage,
    address,
    coinData,
    tokenType,
    addAmount,
    pyPosition,
    coinConfig,
    minLpAmount,
    marketState,
    lpPositions,
    suiClient,
    defaultAddress,
  } = params;

  return new Promise(async (resolve, reject) => {
    try {
      const limited =
        tokenType === 0
          ? NEED_MIN_VALUE_LIST.some(
              (item) =>
                item.provider === coinConfig.provider ||
                item.coinType === coinConfig.coinType
            )
          : false;
      const mintResult = limited
        ? await mintCoin({
            suiClient,
            defaultAddress,
            coinConfig,
            coinData,
            vaultId,
            slippage,
            amount: addAmount,
          })
        : { coinAmount: "0" };

      const coinAmount = Number(mintResult.coinAmount);

      const lpOut = await estimateLpOut({
        coinConfig,
        marketState,
        syAmount: addAmount,
        suiClient,
        defaultAddress,
      });

      const splitAmounts = [
        new Decimal(lpOut.syValue).toFixed(0, Decimal.ROUND_HALF_UP),
        new Decimal(lpOut.syForPtValue).toFixed(0, Decimal.ROUND_HALF_UP),
      ];

      const [splitCoinForSy, splitCoinForPt, sCoin] =
        tokenType === 0
          ? await mintMultiSCoin({
              tx,
              limited,
              vaultId,
              address,
              slippage,
              coinData,
              config: coinConfig,
              coinAmount,
              splitAmounts,
              amount: addAmount,
            })
          : splitCoinHelper(tx, coinData, splitAmounts, coinConfig.coinType);

      if (sCoin) {
        tx.transferObjects([sCoin], address);
      }

      const syCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForSy,
        coinConfig.coinType
      );

      const pyCoin = depositSyCoin(
        tx,
        coinConfig,
        splitCoinForPt,
        coinConfig.coinType
      );

      const [priceVoucher] = getPriceVoucher(tx, coinConfig);
      const [pt_amount] = mintPY(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition
      );

      const [priceVoucherForMintLp] = getPriceVoucher(tx, coinConfig);

      const config = {
        nemoContractId: coinConfig.nemoContractId,
        version: coinConfig.version,
        pyStateId: coinConfig.pyStateId,
        marketStateId: coinConfig.marketStateId,
        syCoinType: coinConfig.syCoinType,
      };

      const result = handleMintLp(
        tx,
        config,
        syCoin,
        pt_amount,
        minLpAmount,
        priceVoucherForMintLp,
        pyPosition,
        false
      );
      const [remainingSyCoin, marketPosition] = result;

      const yieldToken = redeemSyCoin(tx, coinConfig, remainingSyCoin);

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        marketPosition
      );

      tx.transferObjects([yieldToken, mergedPosition], address);

      console.log("mint lp completed");
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function addLiquiditySingleSy(
  params: AddLiquiditySingleSyParams
): Promise<void> {
  const {
    tx,
    vaultId,
    slippage,
    addAmount,
    tokenType,
    coinConfig,
    coinData,
    coinType,
    pyPosition,
    address,
    minLpAmount,
    conversionRate,
    syCoinParam,
    suiClient,
    defaultAddress,
    lpPositions,
  } = params;

  return new Promise(async (resolve, reject) => {
    try {
      let syCoin;
      if (!syCoinParam) {
        const splitCoin =
          tokenType === 0
            ? await mintSCoin({
                tx,
                vaultId,
                address,
                slippage,
                coinData,
                config: coinConfig,
                amount: addAmount,
              })
            : splitCoinHelper(tx, coinData, [addAmount], coinType)[0];

        syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType);
      } else {
        syCoin = syCoinParam;
      }

      const syAmount =
        tokenType === 0
          ? safeDivide(addAmount, conversionRate, "decimal").toFixed(0)
          : addAmount;

      const [ptValue] = await addLiquiditySinglePtDryRun({
        suiClient,
        defaultAddress,
        coinConfig,
        netSyIn: syAmount,
        coinData,
      });

      const [priceVoucher] = getPriceVoucher(tx, coinConfig);

      const config = {
        nemoContractId: coinConfig.nemoContractId,
        version: coinConfig.version,
        pyStateId: coinConfig.pyStateId,
        marketFactoryConfigId: coinConfig.marketFactoryConfigId,
        marketStateId: coinConfig.marketStateId,
        syCoinType: coinConfig.syCoinType,
      };

      const mp = handleAddLiquiditySingleSy(
        tx,
        config,
        syCoin,
        ptValue,
        minLpAmount,
        priceVoucher,
        pyPosition,
        false
      );

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        mp
      );

      tx.transferObjects([mergedPosition], address);

      console.log("add_liquidity_single_sy completed");
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function handleSeedLiquidity(params: SeedLiquidityParams): Promise<void> {
  const {
    tx,
    addAmount,
    tokenType,
    coinConfig,
    coinData,
    coinType,
    pyPosition,
    address,
    minLpAmount,
    vaultId,
    slippage,
  } = params;

  const splitCoin =
    tokenType === 0
      ? await mintSCoin({
          tx,
          vaultId,
          address,
          slippage,
          coinData,
          config: coinConfig,
          amount: addAmount,
        })
      : splitCoinHelper(tx, coinData, [addAmount], coinType)[0];

  const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType);
  const [priceVoucher] = getPriceVoucher(tx, coinConfig);

  const config = {
    nemoContractId: coinConfig.nemoContractId,
    version: coinConfig.version,
    pyStateId: coinConfig.pyStateId,
    yieldFactoryConfigId: coinConfig.yieldFactoryConfigId,
    marketStateId: coinConfig.marketStateId,
    syCoinType: coinConfig.syCoinType,
  };

  const lp = seedLiquidity(
    tx,
    config,
    syCoin,
    minLpAmount,
    priceVoucher,
    pyPosition
  );

  tx.transferObjects([lp], tx.pure.address(address));
}

export async function addLiquidity(
  params: AddLiquidityParams
): Promise<Transaction> {
  const {
    decimal,
    addType,
    address,
    slippage,
    lpValue,
    coinType,
    coinConfig,
    conversionRate,
    marketStateData,
    coinData,
    insufficientBalance,
    addValue,
    tokenType,
    pyPositionData,
    vaultId,
    action,
    lpPositions,
    suiClient,
    defaultAddress,
    tx = new Transaction(),
  } = params;

  if (
    decimal &&
    addType &&
    address &&
    slippage &&
    lpValue &&
    coinType &&
    coinConfig &&
    conversionRate &&
    marketStateData &&
    coinData?.length &&
    !insufficientBalance
  ) {
    try {
      const addAmount = new Decimal(addValue).mul(10 ** decimal).toFixed(0);

      const { pyPosition, created } = initPyPosition({
        tx,
        config: coinConfig,
        pyPositions: pyPositionData,
      });

      const minLpAmount = new Decimal(lpValue)
        .mul(10 ** decimal)
        .mul(1 - new Decimal(slippage).div(100).toNumber())
        .toFixed(0);

      if (marketStateData.lpSupply === "0") {
        await handleSeedLiquidity({
          tx,
          addAmount,
          tokenType,
          coinConfig,
          coinData,
          coinType: coinConfig.coinType,
          pyPosition,
          address,
          minLpAmount,
          vaultId,
          slippage,
        });
      } else if (action === "mint") {
        await mintLp({
          tx,
          vaultId,
          address,
          slippage,
          coinData,
          addAmount,
          tokenType,
          coinConfig,
          pyPosition,
          minLpAmount,
          marketState: marketStateData,
          lpPositions,
          suiClient,
          defaultAddress,
        });
      } else if (action === "swap") {
        await addLiquiditySingleSy({
          tx,
          address,
          vaultId,
          slippage,
          coinData,
          addAmount,
          tokenType,
          pyPosition,
          coinConfig,
          minLpAmount,
          conversionRate,
          coinType: coinConfig.coinType,
          suiClient,
          defaultAddress,
          lpPositions,
        });
      }

      if (created) {
        tx.transferObjects([pyPosition], tx.pure.address(address));
      }

      return tx;
    } catch (error) {
      throw error;
    }
  }

  throw new Error("Invalid parameters for adding liquidity");
}
