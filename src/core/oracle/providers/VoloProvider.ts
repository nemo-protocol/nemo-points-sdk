import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { VOLO, CETUS_VAULT_CONFIG } from "../../../lib/constants";

/**
 * Volo Oracle Provider
 * Handles price voucher operations for Volo tokens (CERT) and Volo Cetus vault LP tokens
 */
export class VoloProvider extends OracleOperations {
    /**
 * Get price voucher based on coin type
 */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        switch (this.config.coinType) {
            case "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
                return await this.getVoloPriceVoucher(options);

            case "0xb490d6fa9ead588a9d72da07a02914da42f6b5b1339b8118a90011a42b67a44f::lp_token::LP_TOKEN":
                return await this.getVoloCetusVaultPriceVoucher(options);

            default:
                throw new Error(`Unsupported coin type for Volo provider: ${this.config.coinType}`);
        }
    }

    /**
     * Get price voucher for Volo CERT tokens
     */
    private async getVoloPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::volo::get_price_voucher_from_volo`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "native_pool", value: VOLO.NATIVE_POOL },
                { name: "metadata", value: VOLO.METADATA },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(VOLO.NATIVE_POOL),
                this.obj(VOLO.METADATA),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for Volo Cetus vault LP tokens
     */
    private async getVoloCetusVaultPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const cetusConfig = CETUS_VAULT_CONFIG.find(
            (item) => item.coinType === this.config.coinType
        );

        if (!cetusConfig) {
            throw new Error(`Cetus vault config not found for ${this.config.coinType}`);
        }

        if (!this.config.yieldTokenType) {
            throw new Error("Yield token type is required for Volo Cetus vault");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::volo::get_price_voucher_from_cetus_vault`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "native_pool", value: VOLO.NATIVE_POOL },
                { name: "metadata", value: VOLO.METADATA },
                { name: "vault", value: cetusConfig.vaultId },
                { name: "pool", value: cetusConfig.poolId },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.yieldTokenType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(VOLO.NATIVE_POOL),
                this.obj(VOLO.METADATA),
                this.obj(cetusConfig.vaultId),
                this.obj(cetusConfig.poolId),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }
} 