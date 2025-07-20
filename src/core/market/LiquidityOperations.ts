import { MarketOperations, type OperationOptions, type OperationResult } from "./base/MarketOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Liquidity Operations Class
 * Groups all liquidity-related operations together
 */
export class LiquidityOperations extends MarketOperations {
    /**
     * Add liquidity using single SY
     * Replaces handleAddLiquiditySingleSy.ts
     */
    addLiquiditySingleSy(
        syCoin: TransactionObjectArgument,
        ptValue: string,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): OperationResult<TransactionObjectArgument> {
        if (!this.config.marketFactoryConfigId) {
            throw new Error("marketFactoryConfigId is required for addLiquiditySingleSy");
        }

        return this.executeMove<TransactionObjectArgument>(
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
    mintLp(
        syCoin: TransactionObjectArgument,
        ptAmount: TransactionObjectArgument,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): OperationResult<TransactionObjectArgument[]> {
        return this.executeMove<TransactionObjectArgument[]>(
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
    seedLiquidity(
        syCoin: TransactionObjectArgument,
        minLpAmount: string,
        priceVoucher: TransactionObjectArgument,
        pyPosition: TransactionObjectArgument,
        options?: OperationOptions
    ): OperationResult<TransactionObjectArgument> {
        if (!this.config.yieldFactoryConfigId) {
            throw new Error("yieldFactoryConfigId is required for seedLiquidity");
        }

        return this.executeMove<TransactionObjectArgument>(
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
} 