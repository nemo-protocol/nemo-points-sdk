import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { AFTERMATH } from "../../../lib/constants";

/**
 * Scallop Oracle Provider
 * Handles price voucher operations for generic tokens using Scallop's x-oracle
 * This is typically used as a fallback for tokens not covered by specific providers
 */
export class ScallopProvider extends OracleOperations {
    /**
     * Get price voucher using Scallop's x-oracle
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        if (!this.config.underlyingCoinType) {
            throw new Error("Underlying coin type is required for Scallop oracle");
        }

        if (!this.config.providerVersion) {
            throw new Error("Provider version is required for Scallop oracle");
        }

        if (!this.config.providerMarket) {
            throw new Error("Provider market is required for Scallop oracle");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::scallop::get_price_voucher_from_x_oracle`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "provider_version", value: this.config.providerVersion },
                { name: "provider_market", value: this.config.providerMarket },
                { name: "sy_state", value: this.config.syStateId },
                { name: "clock", value: AFTERMATH.CLOCK },
            ],
            [this.config.syCoinType, this.config.underlyingCoinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(this.config.providerVersion),
                this.obj(this.config.providerMarket),
                this.obj(this.config.syStateId),
                this.obj(AFTERMATH.CLOCK),
            ],
            options
        );
    }
} 