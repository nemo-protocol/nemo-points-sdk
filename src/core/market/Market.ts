import { Transaction } from "@mysten/sui/transactions";
import type { MarketConfig } from "./base/MarketOperations";
import { LiquidityOperations } from "./LiquidityOperations";
import { PositionOperations } from "./PositionOperations";
import { RedemptionOperations } from "./RedemptionOperations";
import { RewardsOperations } from "./RewardsOperations";

/**
 * Main Market class that combines all operations
 * Provides a unified interface for all market operations
 */
export class Market {
    public readonly liquidity: LiquidityOperations;
    public readonly positions: PositionOperations;
    public readonly redemptions: RedemptionOperations;
    public readonly rewards: RewardsOperations;

    constructor(tx: Transaction, config: MarketConfig) {
        this.liquidity = new LiquidityOperations(tx, config);
        this.positions = new PositionOperations(tx, config);
        this.redemptions = new RedemptionOperations(tx, config);
        this.rewards = new RewardsOperations(tx, config);
    }

    /**
     * Static factory method for easy instantiation
     */
    static create(tx: Transaction, config: MarketConfig): Market {
        return new Market(tx, config);
    }
} 