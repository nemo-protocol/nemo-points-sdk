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
 * Options for operations that support debug information and dry run
 */
export interface OperationOptions {
    returnDebugInfo?: boolean;
    dryRun?: {
        suiClient: any;
        address: string;
    };
}

/**
 * Result wrapper for operations that may return debug info and dry run results
 */
export type OperationResult<T> = {
    result: T;
    debugInfo?: MoveCallInfo;
    dryRunResult?: any;
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
     * Unified move call executor with options and dry run support
     */
    protected async executeMove<T = any>(
        target: string,
        args: Array<{ name: string; value: any }>,
        typeArgs: string[],
        txArgs: any[],
        options?: OperationOptions
    ): Promise<OperationResult<T>> {
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

        // Handle dry run if requested
        if (options?.dryRun) {
            try {
                this.tx.setSender(options.dryRun.address);

                const dryRunResult = await options.dryRun.suiClient.devInspectTransactionBlock({
                    sender: options.dryRun.address,
                    transactionBlock: await this.tx.build({
                        client: options.dryRun.suiClient,
                        onlyTransactionKind: true,
                    }),
                });

                return {
                    result: result as T,
                    dryRunResult,
                    ...(options?.returnDebugInfo && { debugInfo: moveCallInfo })
                };
            } catch (error) {
                throw new Error(`Dry run failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

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