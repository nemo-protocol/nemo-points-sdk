import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUPER_SUI, AFTERMATH, CETUS_VAULT_CONFIG } from "../../../lib/constants";

/**
 * Aftermath Oracle Provider
 * Handles price voucher operations for Aftermath tokens (SUPER_SUI, AFSUI) and Aftermath Cetus vault LP tokens
 */
export class AftermathProvider extends OracleOperations {
    /**
 * Get price voucher based on coin type
 */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        switch (this.config.coinType) {
            case "0x790f258062909e3a0ffc78b3c53ac2f62d7084c3bab95644bdeb05add7250001::super_sui::SUPER_SUI":
                return await this.getSuperSuiPriceVoucher(options);

            case "0xf325ce1300e8dac124071d3152c5c5ee6174914f8bc2161e88329cf579246efc::afsui::AFSUI":
                return await this.getAfSuiPriceVoucher(options);

            case "0x0c8a5fcbe32b9fc88fe1d758d33dd32586143998f68656f43f3a6ced95ea4dc3::lp_token::LP_TOKEN":
                return await this.getAftermathCetusVaultPriceVoucher(options);

            default:
                throw new Error(`Unsupported coin type for Aftermath provider: ${this.config.coinType}`);
        }
    }

    /**
     * Get price voucher for SUPER_SUI tokens
     */
    private async getSuperSuiPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${SUPER_SUI.PACKAGE_ID}::aftermath::get_meta_coin_price_voucher`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "registry", value: SUPER_SUI.REGISTRY },
                { name: "vault", value: SUPER_SUI.VAULT },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(SUPER_SUI.REGISTRY),
                this.obj(SUPER_SUI.VAULT),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for AFSUI tokens
     */
    private async getAfSuiPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::aftermath::get_price_voucher_from_aftermath`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "aftermath_staked_sui_vault", value: AFTERMATH.STAKED_SUI_VAULT },
                { name: "aftermath_safe", value: AFTERMATH.SAFE },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(AFTERMATH.STAKED_SUI_VAULT),
                this.obj(AFTERMATH.SAFE),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for Aftermath Cetus vault LP tokens
     */
    private async getAftermathCetusVaultPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const cetusConfig = CETUS_VAULT_CONFIG.find(
            (item) => item.coinType === this.config.coinType
        );

        if (!cetusConfig) {
            throw new Error(`Cetus vault config not found for ${this.config.coinType}`);
        }

        if (!this.config.yieldTokenType) {
            throw new Error("Yield token type is required for Aftermath Cetus vault");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::aftermath::get_price_voucher_from_cetus_vault`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "stake_vault", value: AFTERMATH.STAKED_SUI_VAULT },
                { name: "safe", value: AFTERMATH.SAFE },
                { name: "vault", value: cetusConfig.vaultId },
                { name: "pool", value: cetusConfig.poolId },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.yieldTokenType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(AFTERMATH.STAKED_SUI_VAULT),
                this.obj(AFTERMATH.SAFE),
                this.obj(cetusConfig.vaultId),
                this.obj(cetusConfig.poolId),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }
} 