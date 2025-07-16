import type { CoinData } from "../types";
import type { CoinConfig } from "../types";
import type { MarketState } from "../types";
import type { DebugInfo, MoveCallInfo } from "../types";
import type { LpPosition } from "../types/position";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/*
  How to create keypair from hexadecimal private key string:
  
  Method 1: Using utility function (recommended)
  import { createKeypairFromHex } from "../utils/keypair"
  const keypair = createKeypairFromHex("your_private_key_hex_string") // can include or exclude 0x prefix
  
  Method 2: Using Sui SDK directly
  import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
  import { fromHEX } from "@mysten/bcs"
  const privateKeyHex = "your_private_key_hex_string" // without 0x prefix
  const privateKeyBytes = fromHEX(privateKeyHex)
  const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes)
*/
import {
  mintPY,
  redeemSyCoin,
  depositSyCoin,
  splitCoinHelper,
  mergeAllLpPositions,
} from "./txHelper/index";
import { getPriceVoucher } from "./txHelper/price";
import { mintMultiSCoin, mintSCoin, burnSCoin } from "./txHelper/coin";
import { initPyPosition } from "./txHelper/position";
import { mergeLpPositions } from "./txHelper/lp";
import { claimReward } from "./txHelper/rewards";
import { redeemInterest } from "./txHelper/redeem";
import Decimal from "decimal.js";
import { NEED_MIN_VALUE_LIST, NO_SUPPORT_UNDERLYING_COINS } from "./constants";
import { safeDivide } from "../utils.js";
import { estimateLpOut } from "./lpEstimate";
import { addLiquiditySinglePtDryRun } from "../dryrun/pt/addLiquiditySinglePt.js";
import { mintCoin } from "../dryrun/syCoinValue/mintCoin";

import { burnLp, redeemPy, swapExactPtForSy } from "./txHelper";

async function burnLpForSyCoinDryRun(_params: {
  lpAmount: string;
  pyPositions: any[];
  marketPositions: LpPosition[];
  ptAmount?: string;
  isSwapPt?: boolean;
}): Promise<{ ptAmount: string; syAmount: string; syValue: string }> {
  // TODO: Implement dry run logic
  throw new Error("burnLpForSyCoinDryRun function not implemented yet");
}

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
  // Keypair for signing
  keypair: Ed25519Keypair;
}

interface RemoveLiquidityParams {
  address: string;
  lpAmount: string;
  slippage: string;
  vaultId?: string;
  minSyOut?: string;
  ytBalance: string;
  ptCoins?: CoinData[];
  coinConfig: CoinConfig;
  action: "swap" | "redeem";
  lpPositions: LpPosition[];
  pyPositions: any[];
  minValue?: string | number;
  isSwapPt?: boolean;
  receivingType?: "underlying" | "sy";
  marketState: MarketState;
  // SDK dependencies
  suiClient: any;
  defaultAddress: string;
  keypair: Ed25519Keypair;
}

type DryRunResult<T extends boolean> = T extends true ? DebugInfo : void;

export function mintLp<T extends boolean = false>(
  params: MintLpParams,
  debug: T = false as T
): Promise<DryRunResult<T>> {
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

      const [[splitCoinForSy, splitCoinForPt, sCoin], mintSCoinMoveCall] =
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
              debug: true,
              splitAmounts,
              amount: addAmount,
            })
          : [
              splitCoinHelper(tx, coinData, splitAmounts, coinConfig.coinType),
              [] as MoveCallInfo[],
            ];

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

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig
      );
      const [pt_amount] = mintPY(
        tx,
        coinConfig,
        pyCoin,
        priceVoucher,
        pyPosition
      );

      const [priceVoucherForMintLp, priceVoucherForMintLpMoveCall] =
        getPriceVoucher(tx, coinConfig);

      const mintLpMoveCall = {
        target: `${coinConfig.nemoContractId}::market::mint_lp`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "pt_amount", value: "pt_amount" },
          { name: "min_lp_amount", value: minLpAmount },
          { name: "price_voucher", value: "priceVoucherForMintLp" },
          { name: "py_position", value: "pyPosition" },
          { name: "py_state", value: coinConfig.pyStateId },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      };

      const [remainingSyCoin, marketPosition] = tx.moveCall({
        ...mintLpMoveCall,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          pt_amount,
          tx.pure.u64(minLpAmount),
          priceVoucherForMintLp,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
      });

      const yieldToken = redeemSyCoin(tx, coinConfig, remainingSyCoin);

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        marketPosition
      );

      tx.transferObjects([yieldToken, mergedPosition], address);

      const debugInfo: DebugInfo = {
        moveCall: [
          ...mintSCoinMoveCall,
          priceVoucherMoveCall,
          priceVoucherForMintLpMoveCall,
          mintLpMoveCall,
        ],
        rawResult: {},
      };

      if (!debug) {
        console.log("mint lp debug info:", debugInfo);
      }

      resolve((debug ? debugInfo : undefined) as DryRunResult<T>);
    } catch (error) {
      reject(error);
    }
  });
}

export function addLiquiditySingleSy<T extends boolean = false>(
  params: AddLiquiditySingleSyParams,
  debug: T = false as T
): Promise<DryRunResult<T>> {
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
        const [splitCoin] =
          tokenType === 0
            ? await mintSCoin({
                tx,
                vaultId,
                address,
                slippage,
                coinData,
                config: coinConfig,
                debug: true,
                amount: addAmount,
              })
            : splitCoinHelper(tx, coinData, [addAmount], coinType);

        syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType);
      } else {
        syCoin = syCoinParam;
      }

      const syAmount =
        tokenType === 0
          ? safeDivide(addAmount, conversionRate, "decimal").toFixed(0)
          : addAmount;

      const [ptValue, addLiquiditySinglePtMoveCall] =
        await addLiquiditySinglePtDryRun({
          suiClient,
          defaultAddress,
          coinConfig,
          netSyIn: syAmount,
          coinData,
          debug: true,
        });

      const [priceVoucher, priceVoucherMoveCall] = getPriceVoucher(
        tx,
        coinConfig
      );

      const addLiquidityMoveCall = {
        target: `${coinConfig.nemoContractId}::router::add_liquidity_single_sy`,
        arguments: [
          { name: "version", value: coinConfig.version },
          { name: "sy_coin", value: "syCoin" },
          { name: "pt_value", value: ptValue },
          { name: "min_lp_amount", value: minLpAmount },
          { name: "price_voucher", value: "priceVoucher" },
          { name: "py_position", value: "pyPosition" },
          { name: "py_state", value: coinConfig.pyStateId },
          {
            name: "market_factory_config",
            value: coinConfig.marketFactoryConfigId,
          },
          { name: "market_state", value: coinConfig.marketStateId },
          { name: "clock", value: "0x6" },
        ],
        typeArguments: [coinConfig.syCoinType],
      };

      const [mp] = tx.moveCall({
        target: addLiquidityMoveCall.target,
        arguments: [
          tx.object(coinConfig.version),
          syCoin,
          tx.pure.u64(ptValue),
          tx.pure.u64(minLpAmount),
          priceVoucher,
          pyPosition,
          tx.object(coinConfig.pyStateId),
          tx.object(coinConfig.marketFactoryConfigId),
          tx.object(coinConfig.marketStateId),
          tx.object("0x6"),
        ],
        typeArguments: addLiquidityMoveCall.typeArguments,
      });

      const debugInfo: DebugInfo = {
        moveCall: [
          ...addLiquiditySinglePtMoveCall.moveCall,
          priceVoucherMoveCall,
          addLiquidityMoveCall,
        ],
        rawResult: {},
      };

      const mergedPosition = mergeAllLpPositions(
        tx,
        coinConfig,
        lpPositions,
        mp
      );

      tx.transferObjects([mergedPosition], address);

      if (!debug) {
        console.log("add_liquidity_single_sy debugInfo:", debugInfo);
      }

      resolve((debug ? debugInfo : undefined) as DryRunResult<T>);
    } catch (error) {
      reject(error);
    }
  });
}

export async function handleSeedLiquidity(
  params: SeedLiquidityParams
): Promise<void> {
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

  const [splitCoin] =
    tokenType === 0
      ? [
          await mintSCoin({
            tx,
            vaultId,
            address,
            slippage,
            coinData,
            config: coinConfig,
            amount: addAmount,
          }),
        ]
      : splitCoinHelper(tx, coinData, [addAmount], coinType);

  const syCoin = depositSyCoin(tx, coinConfig, splitCoin, coinType);
  const [priceVoucher] = getPriceVoucher(tx, coinConfig);

  const seedLiquidityMoveCall = {
    target: `${coinConfig.nemoContractId}::market::seed_liquidity`,
    arguments: [
      coinConfig.version,
      syCoin,
      minLpAmount,
      priceVoucher,
      pyPosition,
      coinConfig.pyStateId,
      coinConfig.yieldFactoryConfigId,
      coinConfig.marketStateId,
      "0x6",
    ],
    typeArguments: [coinConfig.syCoinType],
  };

  const [lp] = tx.moveCall({
    ...seedLiquidityMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      tx.pure.u64(minLpAmount),
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
  });

  tx.transferObjects([lp], tx.pure.address(address));
}

export async function addLiquidity(params: AddLiquidityParams): Promise<any> {
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
    keypair,
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
      const tx = new Transaction();

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

      const res = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
      });

      return res;
    } catch (error) {
      throw error;
    }
  }
}

export async function removeLiquidity(
  params: RemoveLiquidityParams
): Promise<any> {
  const {
    address,
    lpAmount,
    minSyOut = "0",
    ytBalance,
    coinConfig,
    action,
    lpPositions,
    pyPositions,
    minValue = 0,
    receivingType = "underlying",
    marketState,
    suiClient,

    keypair,
  } = params;

  if (!address || !lpAmount || !coinConfig?.coinType || !lpPositions?.length) {
    throw new Error("Invalid parameters for redeeming LP");
  }

  if (!marketState) {
    throw new Error("Market state is not available");
  }

  if (
    receivingType === "underlying" &&
    NO_SUPPORT_UNDERLYING_COINS.some(
      (item) => item.coinType === coinConfig.coinType
    )
  ) {
    throw new Error("Underlying protocol error, try to withdraw to sy");
  }

  try {
    const tx = new Transaction();

    // Claim all LP rewards first if available
    if (marketState?.rewardMetrics?.length) {
      const mergedPosition = mergeLpPositions(
        tx,
        coinConfig,
        lpPositions,
        lpAmount
      );
      for (const rewardMetric of marketState.rewardMetrics) {
        claimReward(
          tx,
          coinConfig,
          mergedPosition,
          coinConfig.syCoinType,
          rewardMetric.tokenType
        );
      }
    }

    const { pyPosition, created } = initPyPosition({
      tx,
      config: coinConfig,
      pyPositions,
    });

    const mergedPositionId = mergeLpPositions(
      tx,
      coinConfig,
      lpPositions,
      lpAmount
    );

    if (new Decimal(ytBalance).gt(0)) {
      const [priceVoucher] = getPriceVoucher(tx, coinConfig);

      const syCoinFromYt = redeemInterest(
        tx,
        coinConfig,
        pyPosition,
        priceVoucher
      );
      const yieldTokenFromYt = redeemSyCoin(tx, coinConfig, syCoinFromYt);

      // Handle receiving type for YT interest
      if (
        receivingType === "underlying" &&
        new Decimal(minValue).gt(0) &&
        !NO_SUPPORT_UNDERLYING_COINS.some(
          (item) => item.coinType === coinConfig.coinType
        )
      ) {
        const underlyingCoin = await burnSCoin({
          tx,
          address,
          config: coinConfig,
          sCoin: yieldTokenFromYt,
        });
        tx.transferObjects([underlyingCoin], address);
      } else {
        tx.transferObjects([yieldTokenFromYt], address);
      }
    }

    const syCoin = burnLp(
      tx,
      coinConfig,
      lpAmount,
      pyPosition,
      mergedPositionId
    );

    const { ptAmount, syValue } = await burnLpForSyCoinDryRun({
      lpAmount,
      pyPositions,
      marketPositions: lpPositions,
    });

    let syCoinValue = syValue;

    // Handle maturity check and different actions
    if (new Decimal(coinConfig?.maturity).lt(Date.now())) {
      // Handle expired case
      const [priceVoucherForOPY] = getPriceVoucher(tx, coinConfig);

      const syCoinFromPT = redeemPy(
        tx,
        coinConfig,
        "0",
        ptAmount,
        priceVoucherForOPY,
        pyPosition
      );
      const yieldTokenFromPT = redeemSyCoin(tx, coinConfig, syCoinFromPT);

      // Handle underlying vs sy receiving logic for expired PT
      if (
        receivingType === "underlying" &&
        new Decimal(syCoinValue).gt(minValue) &&
        !NO_SUPPORT_UNDERLYING_COINS.some(
          (item) => item.coinType === coinConfig.coinType
        )
      ) {
        const underlyingCoin = await burnSCoin({
          tx,
          address,
          config: coinConfig,
          sCoin: yieldTokenFromPT,
        });
        tx.transferObjects([underlyingCoin], address);
      } else {
        tx.transferObjects([yieldTokenFromPT], address);
      }
    } else if (action === "swap") {
      // Handle swap case for non-expired
      const [priceVoucherForSwapSy] = getPriceVoucher(tx, coinConfig);

      const syCoinFromSwapPt = swapExactPtForSy(
        tx,
        coinConfig,
        ptAmount,
        pyPosition,
        priceVoucherForSwapSy,
        minSyOut
      );
      tx.mergeCoins(syCoin, [syCoinFromSwapPt]);

      const { syValue: swapSyValue } = await burnLpForSyCoinDryRun({
        lpAmount,
        ptAmount,
        pyPositions,
        isSwapPt: true,
        marketPositions: lpPositions,
      });

      syCoinValue = swapSyValue;
    }

    // Final coin redemption and transfer logic
    const yieldToken = redeemSyCoin(tx, coinConfig, syCoin);

    // Handle receiving type (underlying vs sy)
    if (
      receivingType === "underlying" &&
      new Decimal(syCoinValue).gt(minValue)
    ) {
      const underlyingCoin = await burnSCoin({
        tx,
        address,
        config: coinConfig,
        sCoin: yieldToken,
      });
      tx.transferObjects([underlyingCoin], address);
    } else {
      tx.transferObjects([yieldToken], address);
    }

    if (created) {
      tx.transferObjects([pyPosition], address);
    }

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    return result;
  } catch (error) {
    throw error;
  }
}
