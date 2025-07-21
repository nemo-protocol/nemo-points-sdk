import { OracleOperations, type OracleOperationOptions, type OracleOperationResult } from "../base/OracleOperations";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SSBUCK, AFTERMATH } from "../../../lib/constants";

/**
 * Buck Oracle Provider
 * Handles price voucher operations for Buck protocol tokens (ST_SBUCK)
 */
export class BuckProvider extends OracleOperations {
    /**
     * Get price voucher for Buck ST_SBUCK tokens
     */
    async getPriceVoucher(options?: OracleOperationOptions): Promise<OracleOperationResult<TransactionObjectArgument>> {
        return await this.executeMove<TransactionObjectArgument>(
            `${this.config.oraclePackageId}::buck::get_price_voucher_from_ssbuck`,
            [
                { name: "price_oracle_config", value: this.config.priceOracleConfigId },
                { name: "price_ticket_cap", value: this.config.oracleTicket },
                { name: "vault", value: SSBUCK.VAULT },
                { name: "clock", value: AFTERMATH.CLOCK },
            ],
            [this.config.syCoinType, this.config.coinType],
            [
                this.obj(this.config.priceOracleConfigId),
                this.obj(this.config.oracleTicket),
                this.obj(SSBUCK.VAULT),
                this.obj(AFTERMATH.CLOCK),
            ],
            options
        );
    }
} 