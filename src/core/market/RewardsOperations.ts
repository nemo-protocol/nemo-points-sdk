import { MarketOperations, type OperationOptions, type OperationResult } from "./base/MarketOperations";
import type { TransactionResult, TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Rewards Operations Class
 * Groups all reward-related operations together
 */
export class RewardsOperations extends MarketOperations {
    /**
     * Claim rewards
     * Replaces claimReward function in rewards.ts
     */
    claimReward(
        lpPosition: TransactionObjectArgument,
        syCoinType: string,
        coinType: string,
        options?: OperationOptions
    ): OperationResult<TransactionResult> {
        return this.executeMove<TransactionResult>(
            `${this.config.nemoContractId}::market::claim_reward`,
            [
                { name: "version", value: this.config.version },
                { name: "market_state", value: this.config.marketStateId },
                { name: "lp_position", value: lpPosition },
                { name: "clock", value: "0x6" },
            ],
            [syCoinType, coinType],
            [
                this.obj(this.config.version),
                this.obj(this.config.marketStateId),
                lpPosition,
                this.clock,
            ],
            options
        );
    }
} 