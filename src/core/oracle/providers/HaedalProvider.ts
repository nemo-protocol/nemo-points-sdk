import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import {
    Winter_Blizzard_Staking_List,
    WWAL,
    HAEDAL,
    CETUS_VAULT_CONFIG
} from "../../../lib/constants";

/**
 * Haedal Oracle Provider
 * Handles price voucher operations for various Haedal tokens including haSUI, haWAL, and Cetus vault tokens
 */
export class HaedalProvider extends OracleOperations {
    /**
     * Get price voucher based on coin type
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        switch (this.config.coinType) {
            case "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::hawal::HAWAL":
                return await this.getHaWalPriceVoucher(options);

            case "0x828b452d2aa239d48e4120c24f4a59f451b8cd8ac76706129f4ac3bd78ac8809::lp_token::LP_TOKEN":
                return await this.getCetusVaultPriceVoucher(options);

            case "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI":
                return await this.getHaSuiPriceVoucher(options);

            default:
                return await this.getWinterBlizzardPriceVoucher(options);
        }
    }

    /**
     * Get price voucher for haWAL tokens
     */
    private async getHaWalPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::haedal::get_haWAL_price_voucher`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "staking", value: HAEDAL.HAWAL_STAKING_ID },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(HAEDAL.HAWAL_STAKING_ID),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for Cetus vault tokens
     */
    private async getCetusVaultPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const cetusConfig = CETUS_VAULT_CONFIG.find(
            (item) => item.coinType === this.config.coinType
        );

        if (!cetusConfig) {
            throw new Error(`Cetus vault config not found for ${this.config.coinType}`);
        }

        if (!this.config.yieldTokenType) {
            throw new Error("Yield token type is required for Cetus vault");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::haedal::get_price_voucher_from_cetus_vault`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "staking", value: HAEDAL.HAEDAL_STAKING_ID },
                { name: "vault", value: cetusConfig.vaultId },
                { name: "pool", value: cetusConfig.poolId },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.yieldTokenType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(HAEDAL.HAEDAL_STAKING_ID),
                this.obj(cetusConfig.vaultId),
                this.obj(cetusConfig.poolId),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for haSUI tokens
     */
    private async getHaSuiPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::haedal::get_price_voucher_from_haSui`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "haedal_staking", value: HAEDAL.HAEDAL_STAKING_ID },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(HAEDAL.HAEDAL_STAKING_ID),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }

    /**
     * Get price voucher for Winter Blizzard staking tokens
     */
    private async getWinterBlizzardPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const blizzardStaking = Winter_Blizzard_Staking_List.find(
            (item) => item.coinType === this.config.coinType
        )?.value;

        if (!blizzardStaking) {
            throw new Error("Winter blizzard staking not found");
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::haedal::get_price_voucher_from_blizzard`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "blizzard_staking", value: blizzardStaking },
                { name: "walrus_staking", value: WWAL.WALRUS_STAKING },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(blizzardStaking),
                this.obj(WWAL.WALRUS_STAKING),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }
} 