import { MarketOperations, type OperationOptions, type OperationResult } from "./base/MarketOperations";
import type { TransactionResult, TransactionObjectArgument } from "@mysten/sui/transactions";

/**
 * Redemption Operations Class
 * Groups all redemption-related operations together
 */
export class RedemptionOperations extends MarketOperations {
    /**
     * Redeem SY coin
     * Replaces redeemSyCoin function in redeem.ts
     */
    async redeemSyCoin(
        syCoin: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionResult>> {
        if (!this.config.syStateId) {
            throw new Error("syStateId is required for redeemSyCoin");
        }

        return await this.executeMove<TransactionResult>(
            `${this.config.nemoContractId}::sy::redeem`,
            [
                { name: "version", value: this.config.version },
                { name: "sy_coin", value: syCoin },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType],
            [this.obj(this.config.version), syCoin, this.obj(this.config.syStateId)],
            options
        );
    }

    /**
     * Redeem interest
     * Replaces redeemInterest function
     */
    async redeemInterest(
        pyPosition: TransactionObjectArgument,
        priceVoucher: TransactionObjectArgument,
        options?: OperationOptions
    ): Promise<OperationResult<TransactionResult>> {
        if (!this.config.pyStateId) {
            throw new Error("pyStateId is required for redeemInterest");
        }

        if (!this.config.yieldFactoryConfigId) {
            throw new Error("yieldFactoryConfigId is required for redeemInterest");
        }

        return await this.executeMove<TransactionResult>(
            `${this.config.nemoContractId}::yield_factory::redeem_due_interest`,
            [
                { name: "version", value: this.config.version },
                { name: "py_position", value: pyPosition },
                { name: "py_state", value: this.config.pyStateId },
                { name: "price_voucher", value: priceVoucher },
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
} 