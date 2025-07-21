import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { ALPAHFI } from "../../../lib/constants";

/**
 * AlphaFi Oracle Provider
 * Handles price voucher operations for AlphaFi tokens (STSUI)
 */
export class AlphaFiProvider extends OracleOperations {
    /**
     * Get price voucher for AlphaFi STSUI tokens
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::alphafi::get_price_voucher_from_spring`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "lst_info", value: ALPAHFI.LIQUID_STAKING_INFO },
                { name: "sy_state", value: this.config.syStateId },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(ALPAHFI.LIQUID_STAKING_INFO),
                this.obj(this.config.syStateId),
            ],
            options
        );
    }
} 