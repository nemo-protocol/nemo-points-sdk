import type { CoinData } from "../api/types";
import type { CoinConfig } from "../api/types";
import type { MarketState } from "../api/types";
import type { LpPosition } from "../types/position";
import { Transaction } from "@mysten/sui/transactions";

import { redeemSyCoin } from "../lib/txHelper/index";
import { getPriceVoucher } from "../lib/txHelper/price";
import { burnSCoin } from "../lib/txHelper/coin";
import { initPyPosition } from "../core/trade/initPyPosition";
import { mergeLpPositions } from "../core/market/mergeLpPositions";
import { claimReward } from "../core/market/rewards";
import { redeemInterest } from "../core/market/redeem";
import Decimal from "decimal.js";
import { NO_SUPPORT_UNDERLYING_COINS } from "../lib/constants";
import { redeemPy, burnLp, swapExactPtForSy } from "../lib/txHelper";

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
  // Optional transaction object
  tx?: Transaction;
}

export async function removeLiquidity(
  params: RemoveLiquidityParams
): Promise<Transaction> {
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
    tx = new Transaction(),
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

    return tx;
  } catch (error) {
    throw error;
  }
} 