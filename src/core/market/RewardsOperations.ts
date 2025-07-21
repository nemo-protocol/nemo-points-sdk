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
    async claimReward(
        lpPosition: TransactionObjectArgument,
        syCoinType: string,
        coinType: string,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionResult>> {
        return await this.executeMove<TransactionResult>(
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

    /**
     * Claim all available rewards for LP positions
     * Handles the complete reward claiming workflow for liquidity removal
     */
    async claimAllLpRewards(params: {
        lpPositions: any[];
        _lpAmount: string;
        marketState: any;
        address: string;
    }): Promise<OperationResult<TransactionObjectArgument[]>> {
        const { lpPositions, _lpAmount, marketState, address } = params;
        const claimedRewards: TransactionObjectArgument[] = [];

        if (!marketState?.rewardMetrics?.length) {
            return {
                result: claimedRewards
            };
        }

        try {
            // Merge LP positions for reward claiming
            const mergedPosition = await this.mergeLpPositionsForRewards(lpPositions, _lpAmount);

            // Claim each available reward type
            for (const rewardMetric of marketState.rewardMetrics) {
                const { result: rewardToken } = await this.claimReward(
                    mergedPosition,
                    this.config.syCoinType, // rewardFromType
                    rewardMetric.tokenType   // rewardToType
                );

                claimedRewards.push(rewardToken);
            }

            // Transfer all claimed rewards to user
            if (claimedRewards.length > 0) {
                this.tx.transferObjects(claimedRewards, address);
            }

            return {
                result: claimedRewards
            };
        } catch (error) {
            throw new Error(`Failed to claim LP rewards: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check if market has available rewards
     */
    hasAvailableRewards(marketState: any): boolean {
        return !!(marketState?.rewardMetrics?.length);
    }

    /**
     * Get reward metrics for a market
     */
    getRewardMetrics(marketState: any): any[] {
        return marketState?.rewardMetrics || [];
    }

    /**
     * Calculate estimated reward amounts (would use dry run)
     */
    async estimateRewardAmounts(params: {
        lpPositions: any[];
        _lpAmount: string;
        marketState: any;
        suiClient: any;
        address: string;
    }): Promise<OperationResult<{ tokenType: string; estimatedAmount: string }[]>> {
        const { marketState } = params;
        const estimatedRewards: { tokenType: string; estimatedAmount: string }[] = [];

        if (!this.hasAvailableRewards(marketState)) {
            return { result: estimatedRewards };
        }

        // This would implement dry run logic to estimate reward amounts
        // For now, return placeholder estimates
        for (const rewardMetric of marketState.rewardMetrics) {
            estimatedRewards.push({
                tokenType: rewardMetric.tokenType,
                estimatedAmount: "0" // Would be calculated via dry run
            });
        }

        return { result: estimatedRewards };
    }

    // Helper methods

    private async mergeLpPositionsForRewards(
        lpPositions: any[],
        _lpAmount: string
    ): Promise<TransactionObjectArgument> {
        // This would implement LP position merging logic
        // For now, return first position or create mock
        if (lpPositions.length > 0) {
            return this.obj(lpPositions[0].id || "0x0");
        }
        return this.obj("0x0");
    }
} 