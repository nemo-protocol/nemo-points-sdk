import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { AFTERMATH } from "../../../lib/constants";

/**
 * Mstable Oracle Provider
 * Handles price voucher operations for Mstable meta-stable asset tokens
 * Supports meta-assets, stable assets, and vault-based tokens
 */
export class MstableProvider extends OracleOperations {
    /**
     * Get price voucher for Mstable meta-stable asset tokens
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        if (!this.config.underlyingCoinType) {
            throw new Error("Underlying coin type is required for Mstable oracle");
        }

        if (!this.config.providerVersion) {
            throw new Error("Provider version is required for Mstable oracle");
        }

        if (!this.config.providerMarket) {
            throw new Error("Provider market (meta vault) is required for Mstable oracle");
        }

        // Mstable uses meta-asset vault operations for price calculation
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::mstable::get_price_voucher_from_meta_vault`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "meta_vault", value: this.config.providerMarket }, // Mstable's meta vault
                { name: "registry", value: this.config.providerVersion }, // Registry object
                { name: "sy_state", value: this.config.syStateId },
                { name: "clock", value: AFTERMATH.CLOCK },
            ],
            [this.config.syCoinType, this.config.coinType, this.config.underlyingCoinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(this.config.providerMarket), // meta vault
                this.obj(this.config.providerVersion), // registry
                this.obj(this.config.syStateId),
                this.obj(AFTERMATH.CLOCK),
            ],
            options
        );
    }
} 