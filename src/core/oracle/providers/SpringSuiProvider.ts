import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SPRING_SUI_STAKING_INFO_LIST } from "../../../lib/constants";

/**
 * SpringSui Oracle Provider
 * Handles price voucher operations for SpringSui liquid staking tokens
 */
export class SpringSuiProvider extends OracleOperations {
    /**
     * Get price voucher for SpringSui tokens
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
            (item) => item.coinType === this.config.coinType
        )?.value;

        if (!lstInfo) {
            throw new Error(`SpringSui: lstInfo not found for ${this.config.coinType}`);
        }

        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::spring::get_price_voucher_from_spring`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "lst_info", value: lstInfo },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(lstInfo),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }
} 