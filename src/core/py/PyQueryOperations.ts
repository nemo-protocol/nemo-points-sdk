import { PyOperations } from "./base/PyOperations";
import type { PyOperationOptions, PyOperationResult } from "./base/PyOperations";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { ContractError } from "../../api/types";
import type { PyPosition } from "./PyPositionOperations";
import Decimal from "decimal.js";

/**
 * Query Yield Parameters
 */
export interface QueryYieldParams {
    address: string;
    ytBalance: string;
    pyPositions?: PyPosition[];
    receivingType?: 'sy' | 'underlying';
}

/**
 * Query Yield Result
 */
export interface QueryYieldResult {
    outputValue: string;
    outputAmount: string;
}

/**
 * PY Query Operations Class
 * Handles dry run queries for PY operations
 */
export class PyQueryOperations extends PyOperations {
    /**
     * Query YT Yield amount using blockchain simulation
     * Replaces queryYield function from core/py/queryYield.ts and PositionQuery.queryYield
     */
    async queryYield(
        params: QueryYieldParams,
        suiClient: any,
        options?: Omit<PyOperationOptions, 'dryRun'>
    ): Promise<PyOperationResult<QueryYieldResult>> {
        const { address, ytBalance, pyPositions, receivingType: _receivingType = 'sy' } = params;

        if (!address) {
            throw new Error("Address is required");
        }

        if (!ytBalance || ytBalance === "0") {
            throw new Error("No YT balance to claim");
        }

        try {
            // Create a separate transaction for the query
            const queryTx = new Transaction();
            queryTx.setSender(address);

            // Initialize PY position (similar pattern to existing queryYield)
            let pyPosition;
            let created = false;

            if (!pyPositions?.length) {
                created = true;
                pyPosition = queryTx.moveCall({
                    target: `${this.config.nemoContractId}::py::init_py_position`,
                    arguments: [
                        queryTx.object(this.config.version),
                        queryTx.object(this.config.pyStateId),
                        queryTx.object("0x6"),
                    ],
                    typeArguments: [this.config.syCoinType],
                });
            } else {
                pyPosition = queryTx.object(pyPositions[0].id);
            }

            // Get price voucher (assuming we need oracle integration)
            // For now, we'll use a placeholder - in real implementation, this would integrate with Oracle operations
            const priceVoucher = queryTx.moveCall({
                target: `${this.config.oraclePackageId || this.config.nemoContractId}::price_oracle::get_price_voucher`,
                arguments: [
                    queryTx.object(this.config.version),
                    queryTx.object(this.config.priceOracleConfigId || "0x0"),
                    queryTx.object("0x6"),
                ],
                typeArguments: [this.config.syCoinType],
            });

            // Redeem interest
            const syCoin = queryTx.moveCall({
                target: `${this.config.nemoContractId}::yield_factory::redeem_due_interest`,
                arguments: [
                    queryTx.object(this.config.version),
                    pyPosition,
                    queryTx.object(this.config.pyStateId),
                    priceVoucher,
                    queryTx.object(this.config.yieldFactoryConfigId),
                    queryTx.object("0x6"),
                ],
                typeArguments: [this.config.syCoinType],
            });

            // Redeem SY coin to get yield token
            const yieldToken = queryTx.moveCall({
                target: `${this.config.nemoContractId}::sy_vault::redeem_sy_coin`,
                arguments: [
                    queryTx.object(this.config.version),
                    syCoin,
                    queryTx.object(this.config.syStateId || this.config.pyStateId),
                    queryTx.object("0x6"),
                ],
                typeArguments: [this.config.syCoinType, this.config.coinType || this.config.syCoinType],
            });

            // Get coin value for final calculation
            queryTx.moveCall({
                target: `0x2::coin::value`,
                arguments: [yieldToken],
                typeArguments: [this.config.coinType || this.config.syCoinType],
            });

            // Transfer PY position if it was created
            if (created) {
                queryTx.transferObjects([pyPosition], address);
            }

            // Execute dry run
            const dryRunResult = await suiClient.devInspectTransactionBlock({
                sender: address,
                transactionBlock: await queryTx.build({
                    client: suiClient,
                    onlyTransactionKind: true,
                }),
            });

            if (dryRunResult.error) {
                throw new ContractError(
                    "queryYield error: " + dryRunResult.error,
                    { moveCall: [], rawResult: dryRunResult }
                );
            }

            // Parse the result - get the last return value which should be the coin value
            const lastResult = dryRunResult.results?.[dryRunResult.results.length - 1];
            if (!lastResult || lastResult?.returnValues?.[0][1] !== "u64") {
                const message = "Failed to get yield amount from blockchain";
                throw new ContractError(message, {
                    moveCall: [],
                    rawResult: { ...dryRunResult, error: message }
                });
            }

            const decimal = Number(this.config.decimal || "9");
            const outputAmount = bcs.U64.parse(
                new Uint8Array(lastResult.returnValues[0][0])
            );
            const outputValue = new Decimal(outputAmount.toString())
                .div(10 ** decimal)
                .toString();

            const result: QueryYieldResult = {
                outputAmount: outputAmount.toString(),
                outputValue,
            };

            return {
                result,
                dryRunResult: {
                    ...dryRunResult,
                    parsedOutput: result
                },
                ...(options?.returnDebugInfo && {
                    debugInfo: {
                        target: `${this.config.nemoContractId}::yield_factory::redeem_due_interest`,
                        arguments: [
                            { name: "version", value: this.config.version },
                            { name: "py_position", value: "pyPosition" },
                            { name: "py_state", value: this.config.pyStateId },
                            { name: "price_voucher", value: "priceVoucher" },
                            { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                            { name: "clock", value: "0x6" },
                        ],
                        typeArguments: [this.config.syCoinType],
                    }
                })
            };

        } catch (error) {
            if (error instanceof ContractError) {
                throw error;
            }
            throw new Error(`Failed to query yield: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query PT value using blockchain simulation
     */
    async queryPtValue(
        ptAmount: string,
        suiClient: any,
        address: string,
        options?: Omit<PyOperationOptions, 'dryRun'>
    ): Promise<PyOperationResult<string>> {
        try {
            // Create a separate transaction for the query
            const queryTx = new Transaction();
            queryTx.setSender(address);

            // This would simulate PT to SY conversion to get current value
            // Implementation would depend on specific contract calls available

            const ptValue = queryTx.moveCall({
                target: `${this.config.nemoContractId}::market::get_pt_value`,
                arguments: [
                    queryTx.pure.u64(ptAmount),
                    queryTx.object(this.config.marketStateId || this.config.pyStateId),
                ],
                typeArguments: [this.config.syCoinType],
            });

            queryTx.moveCall({
                target: `0x1::debug::print`,
                arguments: [ptValue],
                typeArguments: ["u64"],
            });

            const dryRunResult = await suiClient.devInspectTransactionBlock({
                sender: address,
                transactionBlock: await queryTx.build({
                    client: suiClient,
                    onlyTransactionKind: true,
                }),
            });

            if (dryRunResult.error) {
                throw new ContractError(
                    "queryPtValue error: " + dryRunResult.error,
                    { moveCall: [], rawResult: dryRunResult }
                );
            }

            // Parse result (implementation depends on actual contract return format)
            const resultValue = ptAmount; // Placeholder - actual parsing would depend on contract

            return {
                result: resultValue,
                dryRunResult,
                ...(options?.returnDebugInfo && {
                    debugInfo: {
                        target: `${this.config.nemoContractId}::market::get_pt_value`,
                        arguments: [
                            { name: "pt_amount", value: ptAmount },
                            { name: "market_state", value: this.config.marketStateId || this.config.pyStateId },
                        ],
                        typeArguments: [this.config.syCoinType],
                    }
                })
            };

        } catch (error) {
            if (error instanceof ContractError) {
                throw error;
            }
            throw new Error(`Failed to query PT value: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Query expected PT output for single-sided liquidity addition
     * Replaces addLiquiditySinglePtDryRun function from core/py/addLiquiditySinglePt.ts  
     */
    async queryAddLiquiditySinglePt(params: {
        address: string;
        netSyIn: string;
        coinData?: any[];
        suiClient: any;
    }, _options?: Omit<PyOperationOptions, 'dryRun'>): Promise<PyOperationResult<string>> {
        const { address, netSyIn, coinData, suiClient: _suiClient } = params;

        if (!address) {
            throw new Error("Please connect wallet first");
        }

        if (!coinData?.length) {
            throw new Error("No available coins");
        }

        try {
            // Force dry run for query operations  
            const forceOptions: PyOperationOptions = {
                dryRun: address,
                returnDebugInfo: true
            };

            // Get price voucher
            const priceVoucherResult = await this.executeMove<any>(
                `${this.config.nemoContractId}::oracle::get_price_voucher`,
                [
                    { name: "version", value: this.config.version },
                    { name: "clock", value: "0x6" }
                ],
                [this.config.syCoinType],
                [
                    this.obj(this.config.version),
                    this.clock
                ],
                forceOptions
            );

            if (!priceVoucherResult.result) {
                throw new Error("Failed to get price voucher");
            }

            // Query PT output
            const result = await this.executeMove<string>(
                `${this.config.nemoContractId}::offchain::single_liquidity_add_pt_out`,
                [
                    { name: "net_sy_in", value: netSyIn },
                    { name: "price_voucher", value: "priceVoucher" },
                    { name: "market_factory_config", value: this.config.marketFactoryConfigId },
                    { name: "py_state", value: this.config.pyStateId },
                    { name: "market_state", value: this.config.marketStateId },
                    { name: "clock", value: "0x6" },
                ],
                [this.config.syCoinType],
                [
                    this.pure(netSyIn),
                    priceVoucherResult.result,
                    this.obj(this.config.marketFactoryConfigId || "0x0"),
                    this.obj(this.config.pyStateId),
                    this.obj(this.config.marketStateId || "0x0"),
                    this.clock,
                ],
                forceOptions
            );

            if (!result.dryRunResult?.results?.[1]?.returnValues?.[0]) {
                throw new Error("Failed to get PT value from dry run");
            }

            // Parse the PT amount from dry run result
            const ptAmount = bcs.U64.parse(
                new Uint8Array(result.dryRunResult.results[1].returnValues[0][0])
            ).toString();

            return {
                result: ptAmount,
                ...(result.dryRunResult && { dryRunResult: result.dryRunResult }),
                ...(result.debugInfo && { debugInfo: result.debugInfo })
            };

        } catch (error) {
            const contractError = error as ContractError;
            throw new Error(`Failed to query add liquidity single PT: ${contractError.message}`);
        }
    }

    /**
     * Query expected output for various PY operations
     * Generic query method for dry run simulations
     */
    async queryPyOperation<T = any>(params: {
        target: string;
        arguments: Array<{ name: string; value: any }>;
        typeArguments: string[];
        txArguments: any[];
        address: string;
        suiClient: any;
    }, _options?: Omit<PyOperationOptions, 'dryRun'>): Promise<PyOperationResult<T>> {
        const { target, arguments: args, typeArguments, txArguments, address, suiClient: _suiClient } = params;

        if (!address) {
            throw new Error("Address is required for query operations");
        }

        try {
            // Force dry run for query operations  
            const forceOptions: PyOperationOptions = {
                dryRun: address,
                returnDebugInfo: true
            };

            const result = await this.executeMove<T>(
                target,
                args,
                typeArguments,
                txArguments,
                forceOptions
            );

            return result;

        } catch (error) {
            const contractError = error as ContractError;
            throw new Error(`Failed to query PY operation ${target}: ${contractError.message}`);
        }
    }
} 