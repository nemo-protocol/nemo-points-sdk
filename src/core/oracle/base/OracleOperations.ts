import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import type { MoveCallInfo } from "../../../api/types";
import { ContractError } from "../../../api/types";
import { bcs } from "@mysten/sui/bcs";

/**
 * Oracle configuration interface
 */
export interface OracleConfig {
    oraclePackageId: string;
    priceOracleConfigId: string;
    oracleTicket: string;
    syStateId: string;
    syCoinType: string;
    coinType: string;
    provider?: string;
    yieldTokenType?: string;
    underlyingCoinType?: string;
    providerVersion?: string;
    providerMarket?: string;
}

/**
 * Options for oracle operations
 */
export interface OracleOperationOptions {
    returnDebugInfo?: boolean;
    dryRun?: {
        suiClient: any;
        address: string;
    };
}

/**
 * Standard result type for oracle operations
 */
export type OracleOperationResult<T> = {
    result: T;
    debugInfo?: MoveCallInfo;
    dryRunResult?: any;
}

/**
 * Base class for Oracle operations
 * Provides common functionality for all oracle providers
 */
export abstract class OracleOperations {
    protected tx: Transaction;
    protected config: OracleConfig;

    constructor(tx: Transaction, config: OracleConfig) {
        this.tx = tx;
        this.config = config;
    }

    /**
     * Utility method to create transaction objects
     */
    protected obj(objectId: string): TransactionObjectArgument {
        return this.tx.object(objectId);
    }

    /**
     * Utility method to get clock object
     */
    protected get clock(): TransactionObjectArgument {
        return this.tx.object("0x6");
    }

    /**
     * Execute a move call with optional debug info and dry run support
     */
    protected async executeMove<T>(
        target: string,
        argumentDefs: Array<{ name: string; value: string }>,
        typeArguments: string[],
        resolvedArgs: TransactionObjectArgument[],
        options?: OracleOperationOptions
    ): Promise<OracleOperationResult<T>> {
        const moveCallInfo: MoveCallInfo = {
            target,
            arguments: argumentDefs,
            typeArguments,
        };

        const [result] = this.tx.moveCall({
            target,
            arguments: resolvedArgs,
            typeArguments,
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
     * Abstract method that each provider must implement
     */
    abstract getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>>;

    /**
     * Query price voucher with actual blockchain simulation
     * Returns the parsed U128 price voucher value from the blockchain
     */
    async queryPriceVoucher(
        suiClient: any,
        address: string,
        options?: Omit<OracleOperationOptions, 'dryRun'>
    ): Promise<OracleOperationResult<string>> {
        try {
            // Force dry run to get actual blockchain results
            const { result: _result, debugInfo, dryRunResult } = await this.getPriceVoucher({
                ...options,
                dryRun: {
                    suiClient,
                    address
                }
            });

            if (!dryRunResult) {
                throw new Error("Dry run result is missing");
            }

            if (dryRunResult.error) {
                throw new ContractError(
                    "queryPriceVoucher error: " + dryRunResult.error,
                    { moveCall: debugInfo ? [debugInfo] : [], rawResult: dryRunResult }
                );
            }

            if (!dryRunResult.results?.[0]?.returnValues?.[0]) {
                const message = "Failed to get price voucher from blockchain";
                throw new ContractError(message, {
                    moveCall: debugInfo ? [debugInfo] : [],
                    rawResult: { ...dryRunResult, error: message }
                });
            }

            // Parse the U128 result using BCS
            const outputVoucher = bcs.U128.parse(
                new Uint8Array(dryRunResult.results[0].returnValues[0][0])
            ).toString();

            return {
                result: outputVoucher,
                dryRunResult: {
                    ...dryRunResult,
                    parsedOutput: outputVoucher
                },
                ...(options?.returnDebugInfo && { debugInfo })
            };

        } catch (error) {
            if (error instanceof ContractError) {
                throw error;
            }
            throw new Error(`Failed to query price voucher: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 