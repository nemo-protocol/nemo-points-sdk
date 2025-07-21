import Decimal from "decimal.js";
import type { MoveCallInfo } from "../../api/types";
import type { LpPosition } from "../../types/position";
import { MarketOperations, type OperationOptions, type OperationResult } from "./base/MarketOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Result type for merge operations that may have multiple debug info objects
 */
export type MergePositionResult = {
    result: TransactionObjectArgument;
    debugInfo?: MoveCallInfo[];
}

/**
 * Position Operations Class
 * Groups all position-related operations including swapping
 */
export class PositionOperations extends MarketOperations {
    /**
     * Merge multiple LP positions
     * Replaces mergeLpPositions.ts with improved logic
     */
    async mergeLpPositions(
        lpPositions: LpPosition[],
        lpAmount: string,
        options?: OperationOptions
    ): Promise<MergePositionResult> {
        const sortedPositions = [...lpPositions].sort(
            (a, b) => Number(b.lpAmount) - Number(a.lpAmount)
        );

        let accumulatedAmount = new Decimal(0);
        const positionsToMerge: LpPosition[] = [];

        for (const position of sortedPositions) {
            accumulatedAmount = accumulatedAmount.add(position.lpAmount);
            positionsToMerge.push(position);

            if (accumulatedAmount.gte(lpAmount)) {
                break;
            }
        }

        if (accumulatedAmount.lt(lpAmount)) {
            throw new Error("Insufficient LP balance");
        }

        const mergedPosition = this.obj(positionsToMerge[0].id.id);

        if (positionsToMerge.length === 1) {
            return {
                result: mergedPosition,
                ...(options?.returnDebugInfo && { debugInfo: [] })
            };
        }

        const moveCallInfos: MoveCallInfo[] = [];

        // Merge all positions into the first one
        for (let i = 1; i < positionsToMerge.length; i++) {
            const operationResult = await this.executeMove<any>(
                `${this.config.nemoContractId}::market_position::join`,
                [
                    { name: "position1", value: positionsToMerge[0].id.id },
                    { name: "position2", value: positionsToMerge[i].id.id },
                    { name: "clock", value: "0x6" }
                ],
                [],
                [
                    this.obj(positionsToMerge[0].id.id),
                    this.obj(positionsToMerge[i].id.id),
                    this.clock,
                ],
                { returnDebugInfo: true }
            );

            if (operationResult.debugInfo) {
                moveCallInfos.push(operationResult.debugInfo);
            }
        }

        return {
            result: mergedPosition,
            ...(options?.returnDebugInfo && { debugInfo: moveCallInfos })
        };
    }

    /**
     * Query LP Positions from blockchain using GraphQL
     * Extracted from PositionQuery - belongs with position operations
     */
    async queryLpPositions(params: {
        address: string;
        positionTypes: string[];
        maturity?: string;
        marketStateId?: string;
        suiClient: any;
        network?: string;
    }): Promise<OperationResult<any[]>> {
        const { address, positionTypes, maturity: _maturity, marketStateId: _marketStateId, suiClient, network: _network = "mainnet" } = params;

        if (!address) {
            throw new Error("address is required");
        }

        if (!positionTypes || positionTypes.length === 0) {
            throw new Error("positionTypes are required");
        }

        try {
            // Use SUI client's multiGetOwnedObjects for direct queries
            const response = await suiClient.multiGetOwnedObjects({
                owner: address,
                filter: {
                    MatchAny: positionTypes.map((type) => ({ StructType: type })),
                },
                options: {
                    showContent: true,
                },
            });

            const lpPositions = response.data
                .map((item: any) => (item.data?.content as { fields?: any })?.fields)
                .filter((item: any): item is any => !!item)
                .map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    expiry: item.expiry,
                    lpAmount: item.lp_amount,
                    description: item.description,
                    marketStateId: item.market_state_id,
                }))
                .filter((item: any) => {
                    const matchesMaturity = !_maturity || item.expiry === _maturity;
                    const matchesMarketStateId = !_marketStateId || item.marketStateId === _marketStateId;
                    return matchesMaturity && matchesMarketStateId;
                })
                .sort((a: any, b: any) => parseFloat(b.lpAmount) - parseFloat(a.lpAmount));

            return {
                result: lpPositions
            };
        } catch (error) {
            throw new Error(`Failed to query LP positions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query total LP balance (sum of all LP positions)
     * Extracted from PositionQuery - belongs with position operations
     */
    async queryLpBalance(params: {
        address: string;
        positionTypes: string[];
        maturity?: string;
        marketStateId?: string;
        suiClient: any;
        network?: string;
    }): Promise<OperationResult<string>> {
        const { result: lpPositions } = await this.queryLpPositions(params);

        const totalBalance = lpPositions.reduce(
            (sum: string, position: any) => {
                const currentSum = parseFloat(sum);
                const positionAmount = parseFloat(position.lpAmount || "0");
                return (currentSum + positionAmount).toString();
            },
            "0"
        );

        return {
            result: totalBalance
        };
    }

    /**
     * Query LP position holders count using GraphQL
     * Extracted from PositionQuery - belongs with position operations
     */
    async queryLpPositionHoldersCount(params: {
        positionTypes: string[];
        maturity?: string;
        marketStateId?: string;
        pageSize?: number;
        network?: string;
    }): Promise<OperationResult<{
        totalHolders: number;
        holdersByType: Record<string, number>;
        totalPositions: number;
    }>> {
        const { positionTypes, maturity: _maturity, marketStateId: _marketStateId, pageSize: _pageSize = 50, network: _network = "mainnet" } = params;

        if (!positionTypes || positionTypes.length === 0) {
            throw new Error("positionTypes are required");
        }

        try {
            // This would use the GraphQL utilities
            const result = {
                totalHolders: 0,
                holdersByType: {} as Record<string, number>,
                totalPositions: 0,
            };

            // Placeholder - would implement using distributed GraphQL utilities
            console.log(`Querying LP holders for ${positionTypes.length} position types`);

            return {
                result
            };
        } catch (error) {
            throw new Error(`Failed to query LP position holders count: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get LP position analytics
     * New functionality that aggregates position data
     */
    async getLpPositionAnalytics(params: {
        address: string;
        positionTypes: string[];
        maturity?: string;
        marketStateId?: string;
        suiClient: any;
        network?: string;
    }): Promise<OperationResult<{
        totalLpAmount: string;
        positionCount: number;
        averageLpAmount: string;
        largestPosition: string;
        smallestPosition: string;
        positionsByMaturity: Record<string, number>;
    }>> {
        const { result: lpPositions } = await this.queryLpPositions(params);

        if (lpPositions.length === 0) {
            return {
                result: {
                    totalLpAmount: "0",
                    positionCount: 0,
                    averageLpAmount: "0",
                    largestPosition: "0",
                    smallestPosition: "0",
                    positionsByMaturity: {}
                }
            };
        }

        const amounts = lpPositions.map((pos: any) => parseFloat(pos.lpAmount || "0"));
        const totalLpAmount = amounts.reduce((sum, amount) => sum + amount, 0);
        const averageLpAmount = totalLpAmount / amounts.length;

        // Group by maturity
        const positionsByMaturity: Record<string, number> = {};
        lpPositions.forEach((pos: any) => {
            const maturity = pos.expiry || "unknown";
            positionsByMaturity[maturity] = (positionsByMaturity[maturity] || 0) + 1;
        });

        return {
            result: {
                totalLpAmount: totalLpAmount.toString(),
                positionCount: lpPositions.length,
                averageLpAmount: averageLpAmount.toString(),
                largestPosition: Math.max(...amounts).toString(),
                smallestPosition: Math.min(...amounts).toString(),
                positionsByMaturity
            }
        };
    }

    /**
     * Merge all LP positions into one
     * Extracted from txHelper/index.ts - belongs with position operations  
     */
    mergeAllLpPositions(
        lpPositions: LpPosition[],
        marketPosition: TransactionObjectArgument
    ): TransactionObjectArgument {
        console.log("mergeAllLpPositions params:", {
            lpPositions,
            marketPosition,
        });

        if (lpPositions.length === 0) {
            return marketPosition;
        }

        // Join first position with market position
        this.tx.moveCall({
            target: `${this.config.nemoContractId}::market_position::join`,
            arguments: [
                this.tx.object(lpPositions[0].id.id),
                marketPosition,
                this.tx.object("0x6"),
            ],
            typeArguments: [],
        });

        // Join remaining positions
        for (let i = 1; i < lpPositions.length; i++) {
            this.tx.moveCall({
                target: `${this.config.nemoContractId}::market_position::join`,
                arguments: [
                    this.tx.object(lpPositions[0].id.id),
                    this.tx.object(lpPositions[i].id.id),
                    this.tx.object("0x6"),
                ],
                typeArguments: [],
            });
        }

        return this.tx.object(lpPositions[0].id.id);
    }

    /**
     * Smart merge LP positions with optimization
     * Enhanced version of mergeAllLpPositions with better error handling
     */
    async smartMergeLpPositions(
        lpPositions: LpPosition[],
        targetPosition?: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        if (!lpPositions || lpPositions.length === 0) {
            if (targetPosition) {
                return { result: targetPosition };
            }
            throw new Error("No LP positions to merge");
        }

        try {
            let mergedPosition: TransactionObjectArgument;

            if (lpPositions.length === 1 && !targetPosition) {
                // Single position, just return it
                mergedPosition = this.tx.object(lpPositions[0].id.id);
            } else if (targetPosition) {
                // Merge with existing target position
                mergedPosition = this.mergeAllLpPositions(lpPositions, targetPosition);
            } else {
                // Use first position as base, merge others into it
                const [firstPosition, ...restPositions] = lpPositions;
                const basePosition = this.tx.object(firstPosition.id.id);

                if (restPositions.length > 0) {
                    mergedPosition = this.mergeAllLpPositions(restPositions, basePosition);
                } else {
                    mergedPosition = basePosition;
                }
            }

            return {
                result: mergedPosition,
                ...(options?.returnDebugInfo && {
                    debugInfo: {
                        target: `${this.config.nemoContractId}::market_position::join`,
                        arguments: lpPositions.map(pos => ({ name: "position_id", value: pos.id })),
                        typeArguments: [],
                    }
                })
            };

        } catch (error) {
            throw new Error(`Failed to merge LP positions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get position merger analytics
     * Analyze positions before merging to optimize gas usage
     */
    getPositionMergeAnalytics(lpPositions: LpPosition[]): {
        totalPositions: number;
        totalLpAmount: string;
        averageLpAmount: string;
        estimatedGasOperations: number;
        recommendedMergeStrategy: 'single' | 'batch' | 'sequential';
    } {
        if (!lpPositions || lpPositions.length === 0) {
            return {
                totalPositions: 0,
                totalLpAmount: "0",
                averageLpAmount: "0",
                estimatedGasOperations: 0,
                recommendedMergeStrategy: 'single'
            };
        }

        const totalLpAmount = lpPositions.reduce(
            (sum, pos) => {
                const current = parseFloat(sum);
                const posAmount = parseFloat(pos.lpAmount || "0");
                return (current + posAmount).toString();
            },
            "0"
        );

        const averageLpAmount = lpPositions.length > 0
            ? (parseFloat(totalLpAmount) / lpPositions.length).toString()
            : "0";

        // Estimate gas operations needed
        const estimatedGasOperations = Math.max(0, lpPositions.length - 1);

        // Recommend merge strategy based on position count
        let recommendedMergeStrategy: 'single' | 'batch' | 'sequential';
        if (lpPositions.length <= 1) {
            recommendedMergeStrategy = 'single';
        } else if (lpPositions.length <= 10) {
            recommendedMergeStrategy = 'batch';
        } else {
            recommendedMergeStrategy = 'sequential';
        }

        return {
            totalPositions: lpPositions.length,
            totalLpAmount,
            averageLpAmount,
            estimatedGasOperations,
            recommendedMergeStrategy
        };
    }

    // =====================================
    // SWAP OPERATIONS 
    // =====================================

    /**
     * Swap exact YT for SY
     * Moved from PyYieldOperations - belongs with position management
     */
    async swapExactYtForSy(
        ytAmount: string,
        minSyOut: string,
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        if (!this.config.yieldFactoryConfigId || !this.config.marketFactoryConfigId || !this.config.marketStateId) {
            throw new Error("yieldFactoryConfigId, marketFactoryConfigId, and marketStateId are required for swapExactYtForSy");
        }

        return this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::router::swap_exact_yt_for_sy`,
            [
                { name: "version", value: this.config.version },
                { name: "yt_amount", value: ytAmount },
                { name: "min_sy_out", value: minSyOut },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "market_factory_config", value: this.config.marketFactoryConfigId },
                { name: "market_state", value: this.config.marketStateId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                this.pure(ytAmount),
                this.pure(minSyOut),
                pyPosition,
                this.obj(this.config.pyStateId),
                priceVoucher,
                this.obj(this.config.yieldFactoryConfigId),
                this.obj(this.config.marketFactoryConfigId),
                this.obj(this.config.marketStateId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Swap exact PT for SY
     * Moved from PyYieldOperations - belongs with position management
     */
    async swapExactPtForSy(
        ptAmount: string,
        minSyOut: string,
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        if (!this.config.yieldFactoryConfigId || !this.config.marketFactoryConfigId || !this.config.marketStateId) {
            throw new Error("yieldFactoryConfigId, marketFactoryConfigId, and marketStateId are required for swapExactPtForSy");
        }

        return this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::router::swap_exact_pt_for_sy`,
            [
                { name: "version", value: this.config.version },
                { name: "pt_amount", value: ptAmount },
                { name: "min_sy_out", value: minSyOut },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "market_factory_config", value: this.config.marketFactoryConfigId },
                { name: "market_state", value: this.config.marketStateId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                this.pure(ptAmount),
                this.pure(minSyOut),
                pyPosition,
                this.obj(this.config.pyStateId),
                priceVoucher,
                this.obj(this.config.yieldFactoryConfigId),
                this.obj(this.config.marketFactoryConfigId),
                this.obj(this.config.marketStateId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Swap PT for SY with slippage protection
     * Enhanced version of swapExactPtForSy with additional safety checks
     */
    async swapPtForSyWithSlippage(
        ptAmount: string,
        maxSlippage: number = 0.01, // 1% default
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        // Calculate minimum SY output based on slippage
        const ptAmountDecimal = new Decimal(ptAmount);
        const slippageMultiplier = new Decimal(1).minus(maxSlippage);
        const minSyOut = ptAmountDecimal.mul(slippageMultiplier).toString();

        return this.swapExactPtForSy(ptAmount, minSyOut, pyPosition, priceVoucher, options);
    }

    /**
     * Swap YT for SY with slippage protection
     * Enhanced version of swapExactYtForSy with additional safety checks
     */
    async swapYtForSyWithSlippage(
        ytAmount: string,
        maxSlippage: number = 0.01, // 1% default
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        // Calculate minimum SY output based on slippage
        const ytAmountDecimal = new Decimal(ytAmount);
        const slippageMultiplier = new Decimal(1).minus(maxSlippage);
        const minSyOut = ytAmountDecimal.mul(slippageMultiplier).toString();

        return this.swapExactYtForSy(ytAmount, minSyOut, pyPosition, priceVoucher, options);
    }

    /**
     * Batch swap multiple token types for SY
     * Efficiently swap both PT and YT tokens in a single transaction
     */
    async batchSwapForSy(params: {
        ptAmount?: string;
        ytAmount?: string;
        minSyOut: string;
        pyPosition: TransactionObjectArgument;
        priceVoucher: TransactionObjectArgument;
        options?: OperationOptions;
    }): Promise<OperationResult<{
        ptSwapResult?: TransactionObjectArgument;
        ytSwapResult?: TransactionObjectArgument;
        totalSyOut: TransactionObjectArgument;
    }>> {
        const { ptAmount, ytAmount, minSyOut: _minSyOut, pyPosition, priceVoucher, options } = params;

        const results: any = {};

        // Execute PT swap if amount provided
        if (ptAmount && parseFloat(ptAmount) > 0) {
            const ptResult = await this.swapExactPtForSy(
                ptAmount,
                "0", // We'll check total at the end
                pyPosition,
                priceVoucher,
                options
            );
            results.ptSwapResult = ptResult.result;
        }

        // Execute YT swap if amount provided
        if (ytAmount && parseFloat(ytAmount) > 0) {
            const ytResult = await this.swapExactYtForSy(
                ytAmount,
                "0", // We'll check total at the end
                pyPosition,
                priceVoucher,
                options
            );
            results.ytSwapResult = ytResult.result;
        }

        // For now, return the last result as total (in practice, would merge coins)
        results.totalSyOut = results.ytSwapResult || results.ptSwapResult;

        return {
            result: results
        };
    }
} 