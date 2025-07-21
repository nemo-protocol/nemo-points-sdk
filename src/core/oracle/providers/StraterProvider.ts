import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { AFTERMATH } from "../../../lib/constants";

/**
 * Strater Oracle Provider
 * Handles price voucher operations for Strater bucket/savings vault tokens
 * Covers bucket tokens beyond just ST_SBUCK (which is handled by BuckProvider)
 */
export class StraterProvider extends OracleOperations {
    /**
     * Get price voucher for Strater bucket/savings vault tokens
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        if (!this.config.underlyingCoinType) {
            throw new Error("Underlying coin type is required for Strater oracle");
        }

        if (!this.config.providerVersion) {
            throw new Error("Provider version is required for Strater oracle");
        }

        if (!this.config.providerMarket) {
            throw new Error("Provider market (bucket vault) is required for Strater oracle");
        }

        // Strater uses bucket vault operations for price calculation
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::strater::get_price_voucher_from_bucket_vault`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "bucket_vault", value: this.config.providerMarket }, // Strater's bucket vault
                { name: "provider_version", value: this.config.providerVersion },
                { name: "sy_state", value: this.config.syStateId },
                { name: "clock", value: AFTERMATH.CLOCK },
            ],
            [this.config.syCoinType, this.config.underlyingCoinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(this.config.providerMarket), // bucket vault
                this.obj(this.config.providerVersion),
                this.obj(this.config.syStateId),
                this.obj(AFTERMATH.CLOCK),
            ],
            options
        );
    }
} 