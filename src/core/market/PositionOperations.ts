import Decimal from "decimal.js";
import type { MoveCallInfo } from "../../api/types";
import type { LpPosition } from "../../types/position";
import { MarketOperations, type OperationOptions } from "./base/MarketOperations";
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
 * Groups all position-related operations together
 */
export class PositionOperations extends MarketOperations {
    /**
     * Merge multiple LP positions
     * Replaces mergeLpPositions.ts with improved logic
     */
    mergeLpPositions(
        lpPositions: LpPosition[],
        lpAmount: string,
        options?: OperationOptions
    ): MergePositionResult {
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
            const operationResult = this.executeMove<any>(
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
} 