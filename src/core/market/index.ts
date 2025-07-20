// New Object-Oriented API (Recommended)
export { Market } from "./Market";
export { LiquidityOperations } from "./LiquidityOperations";
export { PositionOperations } from "./PositionOperations";
export { RedemptionOperations } from "./RedemptionOperations";
export { RewardsOperations } from "./RewardsOperations";
export { MarketOperations, type MarketConfig, type OperationOptions, type OperationResult } from "./base/MarketOperations";

// Backward Compatibility - Legacy Functional API
// Wrappers around the new OOP classes for backward compatibility
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import type { LpPosition } from "../../types/position";
import { Market } from "./Market";
import type { MarketConfig } from "./base/MarketOperations";

/**
 * @deprecated Use Market.liquidity.addLiquiditySingleSy instead
 */
export function handleAddLiquiditySingleSy(
    tx: Transaction,
    config: MarketConfig,
    syCoin: TransactionObjectArgument,
    ptValue: string,
    minLpAmount: string,
    priceVoucher: TransactionObjectArgument,
    pyPosition: TransactionObjectArgument
) {
    const market = new Market(tx, config);
    const { result } = market.liquidity.addLiquiditySingleSy(syCoin, ptValue, minLpAmount, priceVoucher, pyPosition);
    return result;
}

/**
 * @deprecated Use Market.liquidity.mintLp instead
 */
export function handleMintLp(
    tx: Transaction,
    config: MarketConfig,
    syCoin: TransactionObjectArgument,
    ptAmount: TransactionObjectArgument,
    minLpAmount: string,
    priceVoucher: TransactionObjectArgument,
    pyPosition: TransactionObjectArgument
) {
    const market = new Market(tx, config);
    const { result } = market.liquidity.mintLp(syCoin, ptAmount, minLpAmount, priceVoucher, pyPosition);
    return result;
}

/**
 * @deprecated Use Market.liquidity.seedLiquidity instead
 */
export function seedLiquidity(
    tx: Transaction,
    config: MarketConfig,
    syCoin: TransactionObjectArgument,
    minLpAmount: string,
    priceVoucher: TransactionObjectArgument,
    pyPosition: TransactionObjectArgument
) {
    const market = new Market(tx, config);
    const { result } = market.liquidity.seedLiquidity(syCoin, minLpAmount, priceVoucher, pyPosition);
    return result;
}

/**
 * @deprecated Use Market.positions.mergeLpPositions instead
 */
export function mergeLpPositions(
    tx: Transaction,
    config: MarketConfig,
    lpPositions: LpPosition[],
    lpAmount: string
) {
    const market = new Market(tx, config);
    const { result } = market.positions.mergeLpPositions(lpPositions, lpAmount);
    return result;
}

/**
 * @deprecated Use Market.redemptions.redeemSyCoin instead
 */
export function redeemSyCoin(
    tx: Transaction,
    config: MarketConfig,
    syCoin: TransactionObjectArgument
) {
    const market = new Market(tx, config);
    const { result } = market.redemptions.redeemSyCoin(syCoin);
    return result;
}

/**
 * @deprecated Use Market.redemptions.redeemInterest instead
 */
export function redeemInterest(
    tx: Transaction,
    config: MarketConfig,
    pyPosition: TransactionObjectArgument,
    priceVoucher: TransactionObjectArgument
) {
    const market = new Market(tx, config);
    const { result } = market.redemptions.redeemInterest(pyPosition, priceVoucher);
    return result;
}

/**
 * @deprecated Use Market.rewards.claimReward instead
 */
export function claimReward(
    tx: Transaction,
    config: MarketConfig,
    lpPosition: TransactionObjectArgument,
    syCoinType: string,
    coinType: string
) {
    const market = new Market(tx, config);
    const { result } = market.rewards.claimReward(lpPosition, syCoinType, coinType);
    return result;
}

/**
 * @deprecated Use Market.create instead
 * Legacy wrapper for backward compatibility
 */
export function createMarket(tx: Transaction, config: MarketConfig): Market {
    return Market.create(tx, config);
} 