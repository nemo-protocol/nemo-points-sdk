import type { MoveCallInfo } from "../../../api/types";
import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Unified configuration interface for all PY operations
 * Consolidates PY-related config interfaces
 */
export interface PyConfig {
    nemoContractId: string;
    version: string;
    pyStateId: string;
    syCoinType: string;
    yieldFactoryConfigId: string;
    marketStateId?: string;
    marketFactoryConfigId?: string;
    coinType?: string;
    decimal?: string;
    underlyingCoinType?: string;
    provider?: string;
    priceOracleConfigId?: string;
    oraclePackageId?: string;
    oracleTicket?: string;
    syStateId?: string;
}

/**
 * Options for PY operations
 */
export interface PyOperationOptions {
    returnDebugInfo?: boolean;
    dryRun?: string; // Address for dry run simulation
}

/**
 * Result structure for PY operations
 */
export interface PyOperationResult<T> {
    result: T;
    dryRunResult?: any;
    debugInfo?: MoveCallInfo;
}

/**
 * Base class for all PY (Principal Yield) operations
 * Provides common functionality, transaction building, and dry run support
 */
export abstract class PyOperations {
    protected tx: Transaction;
    protected config: PyConfig;

    constructor(tx: Transaction, config: PyConfig) {
        this.tx = tx;
        this.config = config;
    }

    /**
     * Execute a Move call with consistent error handling and optional dry run
     */
    protected async executeMove<T>(
        target: string,
        debugArguments: Array<{ name: string; value: any }>,
        typeArguments: string[],
        actualArguments: any[],
        options?: PyOperationOptions
    ): Promise<PyOperationResult<T>> {
        const moveCallInfo: MoveCallInfo = {
            target,
            arguments: debugArguments,
            typeArguments,
        };

        // Execute the move call on the current transaction
        const result = this.tx.moveCall({
            target,
            arguments: actualArguments,
            typeArguments,
        }) as T;

        // Handle dry run if requested
        let dryRunResult;
        if (options?.dryRun) {
            try {
                // Create a separate transaction for dry run
                const dryRunTx = new Transaction();
                dryRunTx.setSender(options.dryRun);

                dryRunTx.moveCall({
                    target,
                    arguments: actualArguments.map(arg => {
                        // Handle different argument types for dry run
                        if (typeof arg === 'string') {
                            return dryRunTx.object(arg);
                        } else if (typeof arg === 'object' && arg.kind) {
                            // This is likely a transaction argument, map it appropriately
                            return arg;
                        }
                        return arg;
                    }),
                    typeArguments,
                });

                // Execute dry run
                dryRunResult = await this.executeDryRun(dryRunTx, options.dryRun);
            } catch (error) {
                console.warn('Dry run failed:', error);
            }
        }

        return {
            result,
            ...(dryRunResult && { dryRunResult }),
            ...(options?.returnDebugInfo && { debugInfo: moveCallInfo })
        };
    }

    /**
     * Execute dry run simulation
     */
    private async executeDryRun(_tx: Transaction, address: string): Promise<any> {
        // This would be injected by the specific implementation
        // For now, return a placeholder
        return { simulated: true, address };
    }

    /**
     * Helper method to create object references
     */
    protected obj(id: string): TransactionObjectArgument {
        return this.tx.object(id);
    }

    /**
     * Helper method to create pure value arguments
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