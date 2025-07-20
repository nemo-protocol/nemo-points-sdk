import type { MoveCallInfo } from "../../../api/types";
import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Unified configuration interface for all market operations
 * Consolidates all the duplicate config interfaces
 */
export interface MarketConfig {
    nemoContractId: string;
    version: string;
    pyStateId: string;
    syCoinType: string;
    marketStateId: string;
    yieldFactoryConfigId?: string;
    marketFactoryConfigId?: string;
    syStateId?: string;
}

/**
 * Options for operations that support debug information
 */
export interface OperationOptions {
    returnDebugInfo?: boolean;
}

/**
 * Result wrapper for operations that may return debug info
 */
export type OperationResult<T> = {
    result: T;
    debugInfo?: MoveCallInfo;
}

/**
 * Base class for all market operations
 * Provides common functionality and eliminates code duplication
 */
export abstract class MarketOperations {
    protected config: MarketConfig;
    protected tx: Transaction;

    constructor(tx: Transaction, config: MarketConfig) {
        this.tx = tx;
        this.config = config;
    }

    /**
     * Unified move call executor with options
     */
    protected executeMove<T = any>(
        target: string,
        args: Array<{ name: string; value: any }>,
        typeArgs: string[],
        txArgs: any[],
        options?: OperationOptions
    ): OperationResult<T> {
        const moveCallInfo: MoveCallInfo = {
            target,
            arguments: args,
            typeArguments: typeArgs,
        };

        const result = this.tx.moveCall({
            target,
            arguments: txArgs,
            typeArguments: typeArgs,
        });

        return {
            result: result as T,
            ...(options?.returnDebugInfo && { debugInfo: moveCallInfo })
        };
    }

    /**
     * Helper to create transaction objects
     */
    protected obj(id: string): TransactionObjectArgument {
        return this.tx.object(id);
    }

    /**
     * Helper to create pure values
     */
    protected pure(value: string | number): any {
        return typeof value === 'string' ? this.tx.pure.u64(value) : this.tx.pure.u64(value);
    }

    /**
     * Common clock object (used in all operations)
     */
    protected get clock(): TransactionObjectArgument {
        return this.obj("0x6");
    }
} 