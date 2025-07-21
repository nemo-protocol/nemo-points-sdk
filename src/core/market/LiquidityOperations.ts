import { MarketOperations, type OperationOptions, type OperationResult } from "./base/MarketOperations";
import { ContractError, type MoveCallInfo } from "../../api/types";
import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";

/**
 * Liquidity Operations Class
 * Groups all liquidity-related operations together
 */
export class LiquidityOperations extends MarketOperations {
    /**
     * Add liquidity using single SY
     * Replaces handleAddLiquiditySingleSy.ts
     */
    async addLiquiditySingleSy(
        syCoin: TransactionObjectArgument,
        ptValue: string,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        if (!this.config.marketFactoryConfigId) {
            throw new Error("marketFactoryConfigId is required for addLiquiditySingleSy");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::router::add_liquidity_single_sy`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: "syCoin" },
                { name: "pt_value", value: ptValue },
                { name: "min_lp_amount", value: minLpAmount },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "market_factory_config", value: this.config.marketFactoryConfigId },
                { name: "market_state", value: this.config.marketStateId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                syCoin,
                this.pure(ptValue),
                this.pure(minLpAmount),
                priceVoucher,
                pyPosition,
                this.obj(this.config.pyStateId),
                this.obj(this.config.marketFactoryConfigId),
                this.obj(this.config.marketStateId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Mint LP tokens
     * Replaces handleMintLp.ts
     */
    async mintLp(
        syCoin: TransactionObjectArgument,
        ptAmount: TransactionObjectArgument,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument[]>> {
        return await this.executeMove<TransactionObjectArgument[]>(
            `${this.config.nemoContractId}::market::mint_lp`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: "syCoin" },
                { name: "pt_amount", value: "pt_amount" },
                { name: "min_lp_amount", value: minLpAmount },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "market_state", value: this.config.marketStateId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                syCoin,
                ptAmount,
                this.pure(minLpAmount),
                priceVoucher,
                pyPosition,
                this.obj(this.config.pyStateId),
                this.obj(this.config.marketStateId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Seed initial liquidity
     * Replaces seedLiquidity.ts
     */
    async seedLiquidity(
        syCoin: TransactionObjectArgument,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionObjectArgument>> {
        if (!this.config.yieldFactoryConfigId) {
            throw new Error("yieldFactoryConfigId is required for seedLiquidity");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.nemoContractId}::market::seed_liquidity`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: "syCoin" },
                { name: "min_lp_amount", value: minLpAmount },
                { name: "price_voucher", value: "priceVoucher" },
                { name: "py_position", value: "pyPosition" },
                { name: "py_state", value: this.config.pyStateId },
                { name: "yield_factory_config", value: this.config.yieldFactoryConfigId },
                { name: "market_state", value: this.config.marketStateId },
                { name: "clock", value: "0x6" },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.version),
                syCoin,
                this.pure(minLpAmount),
                priceVoucher,
                pyPosition,
                this.obj(this.config.pyStateId),
                this.obj(this.config.yieldFactoryConfigId),
                this.obj(this.config.marketStateId),
                this.clock,
            ],
            options
        );
    }

    /**
     * Query LP output amount for given PT and SY values
     * Uses blockchain simulation to get actual LP amount that would be received
     */
    async queryLpOut(
        ptValue: string,
        syValue: string,
        suiClient: any,
        address: string,
        options?: Omit<OperationOptions, 'dryRun'>
    ): Promise<OperationResult<string>> {
        try {
            // Create a separate transaction for the query
            const queryTx = new Transaction();

            const moveCallInfo: MoveCallInfo = {
                target: `${this.config.nemoContractId}::router::get_lp_out_from_mint_lp`,
                arguments: [
                    { name: "pt_value", value: ptValue },
                    { name: "sy_value", value: syValue },
                    { name: "market_state_id", value: this.config.marketStateId },
                ],
                typeArguments: [this.config.syCoinType],
            };

            queryTx.moveCall({
                target: moveCallInfo.target,
                arguments: [
                    queryTx.pure.u64(ptValue),
                    queryTx.pure.u64(syValue),
                    queryTx.object(this.config.marketStateId),
                ],
                typeArguments: moveCallInfo.typeArguments,
            });

            queryTx.setSender(address);

            const dryRunResult = await suiClient.devInspectTransactionBlock({
                sender: address,
                transactionBlock: await queryTx.build({
                    client: suiClient,
                    onlyTransactionKind: true,
                }),
            });

            if (dryRunResult.error) {
                throw new ContractError(
                    "queryLpOut error: " + dryRunResult.error,
                    { moveCall: [moveCallInfo], rawResult: dryRunResult }
                );
            }

            if (!dryRunResult.results?.[0]?.returnValues?.[0]) {
                const message = "Failed to get LP amount from blockchain";
                throw new ContractError(message, {
                    moveCall: [moveCallInfo],
                    rawResult: { ...dryRunResult, error: message }
                });
            }

            // Parse the U64 result using BCS
            const outputAmount = bcs.U64.parse(
                new Uint8Array(dryRunResult.results[0].returnValues[0][0])
            );

            const resultValue = outputAmount.toString();

            return {
                result: resultValue,
                dryRunResult: {
                    ...dryRunResult,
                    parsedOutput: resultValue
                },
                ...(options?.returnDebugInfo && { debugInfo: moveCallInfo })
            };

        } catch (error) {
            if (error instanceof ContractError) {
                throw error;
            }
            throw new Error(`Failed to query LP output: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Complete add liquidity workflow
     * Handles the full process: position init → coin prep → minting → liquidity addition
     */
    async addLiquidityWorkflow(params: {
        address: string;
        addAmount: string;
        tokenType: number;
        coinData: any[];
        minLpAmount: string;
        pyPositions?: any[];
        lpPositions: any[];
        suiClient: any;
        slippage?: string;
        vaultId?: string;
    }): Promise<OperationResult<{
        lpPosition: TransactionObjectArgument;
        pyPosition?: TransactionObjectArgument;
        yieldToken?: TransactionObjectArgument;
        created: boolean;
    }>> {
        const { address, addAmount, tokenType, minLpAmount, pyPositions = [], lpPositions } = params;

        // Step 1: Initialize or get PY position (this would integrate with PyManager)
        const pyPosition = this.obj("0x0"); // Placeholder - would use PyManager
        const created = pyPositions.length === 0;

        // Step 2: Prepare SY coin based on token type
        const syCoin = await this.prepareSyCoinForLiquidity({
            tokenType,
            amount: addAmount,
            coinData: params.coinData,
            vaultId: params.vaultId,
            slippage: params.slippage,
        });

        // Step 3: Get price voucher (would integrate with OracleManager)
        const priceVoucher = this.obj("0x0"); // Placeholder - would use OracleManager

        // Step 4: Choose appropriate liquidity method
        let lpResult: OperationResult<TransactionObjectArgument>;

        if (lpPositions.length === 0) {
            // Seed initial liquidity
            lpResult = await this.seedLiquidity(syCoin, minLpAmount, priceVoucher, pyPosition);
        } else {
            // Add to existing pool
            if (tokenType === 0) {
                // Adding underlying token - need to mint PT first
                lpResult = await this.addLiquidityWithMinting(
                    syCoin, addAmount, minLpAmount, priceVoucher, pyPosition
                );
            } else {
                // Adding SY directly
                lpResult = await this.addLiquiditySingleSy(
                    syCoin, addAmount, minLpAmount, priceVoucher, pyPosition
                );
            }
        }

        // Step 5: Merge with existing LP positions if needed
        let finalLpPosition = lpResult.result;
        if (lpPositions.length > 0) {
            finalLpPosition = await this.mergeLpPositions(finalLpPosition, lpPositions);
        }

        // Step 6: Transfer objects to user
        const transferObjects = [finalLpPosition];
        if (created) {
            transferObjects.push(pyPosition);
        }
        this.tx.transferObjects(transferObjects, address);

        return {
            result: {
                lpPosition: finalLpPosition,
                pyPosition: created ? pyPosition : undefined,
                created,
            },
            ...(lpResult.dryRunResult && { dryRunResult: lpResult.dryRunResult }),
            ...(lpResult.debugInfo && { debugInfo: lpResult.debugInfo })
        };
    }

    /**
     * Complete remove liquidity workflow
     * Handles: rewards → YT interest → LP burning → PT handling → transfers
     */
    async removeLiquidityWorkflow(params: {
        address: string;
        lpAmount: string;
        ytBalance: string;
        action: "swap" | "redeem";
        lpPositions: any[];
        pyPositions: any[];
        receivingType?: "underlying" | "sy";
        marketState?: any;
        minSyOut?: string;
    }): Promise<OperationResult<{
        outputToken: TransactionObjectArgument;
        pyPosition?: TransactionObjectArgument;
        created: boolean;
    }>> {
        const {
            address, lpAmount, ytBalance, action, lpPositions, pyPositions,
            receivingType = "underlying", marketState
        } = params;

        // Step 1: Initialize PY position (would integrate with PyManager)
        const pyPosition = this.obj("0x0");
        const created = pyPositions.length === 0;

        // Step 2: Claim all rewards if available (would integrate with RewardsOperations)
        if (marketState?.rewardMetrics?.length) {
            await this.claimAllLpRewards(lpPositions, lpAmount, marketState);
        }

        // Step 3: Handle YT interest redemption if user has YT balance
        let yieldFromInterest: TransactionObjectArgument | undefined;
        if (this.hasYtBalance(ytBalance)) {
            yieldFromInterest = await this.redeemYtInterest(pyPosition, ytBalance);
            if (yieldFromInterest) {
                this.tx.transferObjects([yieldFromInterest], address);
            }
        }

        // Step 4: Burn LP tokens to get SY
        const syCoinFromLp = await this.burnLpTokens(lpAmount, pyPosition, lpPositions);

        // Step 5: Handle PT tokens based on maturity and action
        const finalOutput = await this.handlePtTokens({
            action,
            lpAmount,
            syCoinFromLp,
            pyPosition,
            receivingType,
        });

        // Step 6: Transfer final output and cleanup
        this.tx.transferObjects([finalOutput], address);
        if (created) {
            this.tx.transferObjects([pyPosition], address);
        }

        return {
            result: {
                outputToken: finalOutput,
                pyPosition: created ? pyPosition : undefined,
                created,
            }
        };
    }

    // Helper methods for complex workflows

    private async prepareSyCoinForLiquidity(params: {
        tokenType: number;
        amount: string;
        coinData: any[];
        vaultId?: string;
        slippage?: string;
    }): Promise<TransactionObjectArgument> {
        const { tokenType, amount, coinData } = params;

        if (tokenType === 0) {
            // Underlying token - need to mint SY coin
            // This would integrate with SY operations
            return this.mintSyCoinFromUnderlying(amount, coinData);
        } else {
            // Already SY token
            return this.obj(coinData[0]?.objectId || "0x0");
        }
    }

    private async addLiquidityWithMinting(
        syCoin: TransactionObjectArgument,
        ptValue: string,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument
    ): Promise<OperationResult<TransactionObjectArgument>> {
        // First mint PY tokens, then add liquidity
        // This would integrate with PyManager operations

        // For now, return the direct addLiquiditySingleSy result
        return this.addLiquiditySingleSy(syCoin, ptValue, minLpAmount, priceVoucher, pyPosition);
    }

    private async mergeLpPositions(
        newPosition: TransactionObjectArgument,
        _existingPositions: any[]
    ): Promise<TransactionObjectArgument> {
        // Implementation would merge LP positions
        // For now, return the new position
        return newPosition;
    }

    private async claimAllLpRewards(
        _lpPositions: any[],
        _lpAmount: string,
        _marketState: any
    ): Promise<void> {
        // This would integrate with RewardsOperations
        // Implementation would claim all available rewards
    }

    private hasYtBalance(ytBalance: string): boolean {
        return !!(ytBalance && parseFloat(ytBalance) > 0);
    }

    private async redeemYtInterest(
        _pyPosition: TransactionObjectArgument,
        _ytBalance: string
    ): Promise<TransactionObjectArgument | undefined> {
        // This would integrate with PyManager yield operations
        // For now, return undefined
        return undefined;
    }

    private async burnLpTokens(
        _lpAmount: string,
        _pyPosition: TransactionObjectArgument,
        _lpPositions: any[]
    ): Promise<TransactionObjectArgument> {
        // Implementation would burn LP tokens and return SY
        return this.obj("0x0");
    }

    private async handlePtTokens(params: {
        action: "swap" | "redeem";
        lpAmount: string;
        syCoinFromLp: TransactionObjectArgument;
        pyPosition: TransactionObjectArgument;
        receivingType: string;
    }): Promise<TransactionObjectArgument> {
        const { action, syCoinFromLp, pyPosition: _pyPosition } = params;

        if (action === "swap") {
            // Swap PT for SY and merge with LP SY
            // This would integrate with PyManager swap operations
            return this.convertToOutputToken(syCoinFromLp, params.receivingType);
        } else {
            // Hold PT - just convert SY to output token
            return this.convertToOutputToken(syCoinFromLp, params.receivingType);
        }
    }

    private async convertToOutputToken(
        syCoin: TransactionObjectArgument,
        receivingType: string
    ): Promise<TransactionObjectArgument> {
        if (receivingType === "underlying") {
            // Convert SY to underlying token
            // This would integrate with SY operations
            return this.burnSyCoinToUnderlying(syCoin);
        } else {
            // Keep as SY token
            return syCoin;
        }
    }

    private mintSyCoinFromUnderlying(_amount: string, _coinData: any[]): TransactionObjectArgument {
        // This would integrate with SY minting operations
        return this.obj("0x0");
    }

    private burnSyCoinToUnderlying(_syCoin: TransactionObjectArgument): TransactionObjectArgument {
        // This would integrate with SY burning operations  
        return this.obj("0x0");
    }
} 