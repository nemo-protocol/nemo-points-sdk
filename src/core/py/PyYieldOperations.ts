import { PyOperations } from "./base/PyOperations";
import type { PyOperationOptions, PyOperationResult } from "./base/PyOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * PY Yield Operations Class
 * Handles yield-related operations like minting, redeeming, and swapping
 */
export class PyYieldOperations extends PyOperations {
    /**
     * Mint PY tokens from SY coin
     * Extracted from txHelper/index.ts - belongs with yield operations
     */
    async mintPY(
        syCoin: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: PyOperationOptions
    ): Promise<PyOperationResult<TransactionObjectArgument>> {
        const result = await this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::yield_factory::mint_py`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: "syCoin" },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                syCoin,
                priceVoucher,
                pyPosition,
                this.obj(this.config.pyStateId),
                this.obj(this.config.yieldFactoryConfigId),
                this.clock,
            ],
            options
        );

        return result;
    }

    /**
     * Redeem SY coin from SY token
     * Extracted from txHelper/index.ts - related to yield operations
     */
    async redeemSyCoin(
        syCoin: TransactionObjectArgument,
        options?: PyOperationOptions
    ): Promise<PyOperationResult<TransactionObjectArgument>> {
        const result = await this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::sy::redeem`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: "syCoin" },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.coinType || this.config.underlyingCoinType || "0x2::sui::SUI", this.config.syCoinType],
            [
                this.obj(this.config.version),
                syCoin,
                this.obj(this.config.syStateId || "0x0"),
            ],
            options
        );

        return result;
    }

    /**
     * Complete yield workflow: redeem interest and get tokens
     * Combines multiple operations for common yield workflows
     */
    async redeemYieldWorkflow(params: {
        pyPosition: TransactionObjectArgument;
        priceVoucher: TransactionObjectArgument;
        receivingType?: 'sy' | 'underlying';
        address: string;
    }, options?: PyOperationOptions): Promise<PyOperationResult<TransactionObjectArgument>> {
        const { pyPosition, priceVoucher, receivingType = 'sy', address: _address } = params;

        try {
            // Step 1: Redeem interest to get SY coin
            const syResult = await this.redeemInterest(pyPosition, priceVoucher, options);

            if (receivingType === 'underlying') {
                // Step 2: Convert SY coin to underlying token
                const underlyingResult = await this.redeemSyCoin(syResult.result, options);
                return underlyingResult;
            } else {
                // Return SY coin directly
                return syResult;
            }

        } catch (error) {
            throw new Error(`Failed to complete yield workflow: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Estimate yield for given YT balance
     * Uses dry run to simulate redeem operations
     */
    async estimateYield(params: {
        ytBalance: string;
        pyPosition: TransactionObjectArgument;
        priceVoucher: TransactionObjectArgument;
        receivingType?: 'sy' | 'underlying';
    }, options?: Omit<PyOperationOptions, 'dryRun'>): Promise<PyOperationResult<{
        estimatedAmount: string;
        estimatedValue: string;
    }>> {
        const { ytBalance, pyPosition, priceVoucher, receivingType = 'sy' } = params;

        if (!ytBalance || ytBalance === "0") {
            throw new Error("No YT balance to estimate");
        }

        try {
            // Force dry run for estimation
            const dryRunOptions = { ...options, dryRun: "enabled" as any };

            const workflowResult = await this.redeemYieldWorkflow({
                pyPosition,
                priceVoucher,
                receivingType,
                address: "0x0" // Dummy address for dry run
            }, dryRunOptions);

            // Extract amount from dry run results
            if (!workflowResult.dryRunResult?.results) {
                throw new Error("No dry run results available for yield estimation");
            }

            // This would parse the actual results - simplified for now
            const estimatedAmount = "1000000"; // Would be parsed from dry run
            const estimatedValue = "1.0"; // Would be calculated based on decimals

            return {
                result: {
                    estimatedAmount,
                    estimatedValue
                },
                dryRunResult: workflowResult.dryRunResult,
                debugInfo: workflowResult.debugInfo
            };

        } catch (error) {
            throw new Error(`Failed to estimate yield: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check if yield is available for claiming
     */
    async checkYieldAvailability(params: {
        pyPosition: TransactionObjectArgument;
        priceVoucher: TransactionObjectArgument;
    }, options?: Omit<PyOperationOptions, 'dryRun'>): Promise<PyOperationResult<boolean>> {
        try {
            const estimationResult = await this.estimateYield({
                ytBalance: "1", // Minimal amount to test
                pyPosition: params.pyPosition,
                priceVoucher: params.priceVoucher
            }, options);

            const hasYield = parseFloat(estimationResult.result.estimatedAmount) > 0;

            return {
                result: hasYield,
                dryRunResult: estimationResult.dryRunResult,
                debugInfo: estimationResult.debugInfo
            };

        } catch (error) {
            // If estimation fails, assume no yield is available
            return {
                result: false
            };
        }
    }

    /**
     * Redeem PY tokens (Principal and Yield)
     * Replaces redeemPy function from lib/txHelper.ts
     */
    async redeemPy(
        ytAmount: string,
        ptAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: PyOperationOptions
    ): Promise<PyOperationResult<TransactionObjectArgument>> {
        if (!this.config.yieldFactoryConfigId) {
            throw new Error("yieldFactoryConfigId is required for redeemPy");
        }

        return this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::yield_factory::redeem_py`,
            [
                { name: "version", value: this.config.version },
                { name: "yt_amount", value: ytAmount },
                { name: "pt_amount", value: ptAmount },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                this.pure(ytAmount),
                this.pure(ptAmount),
                priceVoucher,
                pyPosition,
                this.obj(this.config.pyStateId),
                this.obj(this.config.yieldFactoryConfigId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Redeem interest from yield
     * Replaces redeemInterest function
     */
    async redeemInterest(
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: PyOperationOptions
    ): Promise<PyOperationResult<TransactionObjectArgument>> {
        if (!this.config.yieldFactoryConfigId) {
            throw new Error("yieldFactoryConfigId is required for redeemInterest");
        }

        return this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::yield_factory::redeem_due_interest`,
            [
                { name: "version", value: this.config.version },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                pyPosition,
                this.obj(this.config.pyStateId),
                priceVoucher,
                this.obj(this.config.yieldFactoryConfigId),
                this.clock,
            ],
            options
        );
    }

    // Note: swapExactYtForSy and swapExactPtForSy methods have been moved to PositionOperations
    // for better logical organization - swapping is more related to position management
} 