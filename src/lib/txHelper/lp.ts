import Decimal from "decimal.js";
import type { MoveCallInfo } from "@/types";
import type { MergeLpPositionsConfig } from "@/types/lp";
import type { LpPosition } from "@/types/position";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

export const mergeLpPositions = <T extends boolean = false>(
    tx: Transaction,
    config: MergeLpPositionsConfig,
    lpPositions: LpPosition[],
    lpAmount: string,
    returnDebugInfo?: T
): T extends true ? [TransactionObjectArgument, MoveCallInfo[]] : TransactionObjectArgument => {
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

    const mergedPosition = tx.object(positionsToMerge[0].id.id);

    if (positionsToMerge.length === 1) {
        const debugInfo: MoveCallInfo[] = [];
        return (returnDebugInfo ? [mergedPosition, debugInfo] : mergedPosition) as unknown as T extends true
            ? [TransactionObjectArgument, MoveCallInfo[]]
            : TransactionObjectArgument;
    }

    const moveCallInfos: MoveCallInfo[] = [];

    for (let i = 1; i < positionsToMerge.length; i++) {
        const joinMoveCall: MoveCallInfo = {
            target: `${config.nemoContractId}::market_position::join`,
            arguments: [
                { name: "position1", value: positionsToMerge[0].id.id },
                { name: "position2", value: positionsToMerge[i].id.id },
                { name: "clock", value: "0x6" }
            ],
            typeArguments: [],
        };

        tx.moveCall({
            target: joinMoveCall.target,
            arguments: [
                tx.object(positionsToMerge[0].id.id),
                tx.object(positionsToMerge[i].id.id),
                tx.object("0x6"),
            ],
            typeArguments: joinMoveCall.typeArguments,
        });

        moveCallInfos.push(joinMoveCall);
    }

    return (returnDebugInfo ? [mergedPosition, moveCallInfos] : mergedPosition) as unknown as T extends true
        ? [TransactionObjectArgument, MoveCallInfo[]]
        : TransactionObjectArgument;
};