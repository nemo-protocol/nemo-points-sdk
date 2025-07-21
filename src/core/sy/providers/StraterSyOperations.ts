import { SyOperations } from "../base/SyOperations";
import type {
    SyProvider,
    ProviderConstants,
    SyMintParams,
    SyBurnParams,
    SyOperationResult,
    SyConfig
} from "../types";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import { createSyProviderError } from "../types";

/**
 * Strater-specific SY Operations
 * Integrates existing Strater logic from dep folder into new architecture
 */
export class StraterSyOperations extends SyOperations {
    readonly provider: SyProvider = "Strater";

    readonly constants: ProviderConstants = {
        // Strater-specific targets from dep/Strater/constants.ts
        intoBalanceTarget: "0x2::coin::into_balance",
        depositTarget: "0x75fe358d87679b30befc498a8dae1d28ca9eed159ab6f2129a654a8255e5610e::sbuck_saving_vault::deposit",
        fromBalanceTarget: "0x2::coin::from_balance",
        withdrawTarget: "0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::withdraw",
        redeemWithdrawTicketTarget: "0x2a721777dc1fcf7cda19492ad7c2272ee284214652bde3e9740e2f49c3bff457::vault::redeem_withdraw_ticket",

        // Strater-specific objects
        bucketVault: "0xe83e455a9e99884c086c8c79c13367e7a865de1f953e75bcf3e529cdf03c6224",
        clockObject: "0x6", // Clock object
    };

    /**
     * Strater-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        if (!config.underlyingCoinType) {
            throw createSyProviderError({
                message: "Strater requires underlyingCoinType to be specified",
                provider: this.provider,
                operation: "validateConfig"
            });
        }
    }

    /**
     * Strater supports bucket vault tokens (BUCK and related)
     */
    supportsToken(coinType: string): boolean {
        // Strater typically works with bucket/buck related tokens
        return coinType.includes("buck") || coinType.includes("sbuck") ||
            coinType === this.config.coinType; // Allow configured token
    }

    /**
     * Mint SCoin using Strater bucket vault
     * Integrates logic from dep/Strater/mintSCoin.ts
     * Three-step process: coin → balance → deposit → balance → coin
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            // Step 1: Convert coin to balance
            const balanceResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.intoBalanceTarget!,
                [
                    { name: "balance", value: "coin" },
                ],
                [this.config.underlyingCoinType!],
                [
                    coin,
                ],
                options
            );

            // Step 2: Deposit balance into bucket vault
            const depositResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.depositTarget!,
                [
                    { name: "bucket_vault", value: this.constants.bucketVault! },
                    { name: "balance", value: "balance" },
                    { name: "clock", value: this.constants.clockObject! },
                ],
                [],
                [
                    this.obj(this.constants.bucketVault!),
                    balanceResult.result,
                    this.obj(this.constants.clockObject!),
                ],
                options
            );

            // Step 3: Convert balance to coin
            const finalResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.fromBalanceTarget!,
                [
                    { name: "balance", value: "sbsBalance" },
                ],
                [this.config.coinType],
                [
                    depositResult.result,
                ],
                options
            );

            // Combine debug info from all steps
            const combinedDebugInfo = [
                ...(balanceResult.debugInfo || []),
                ...(depositResult.debugInfo || []),
                ...(finalResult.debugInfo || [])
            ];

            return {
                result: finalResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(finalResult.dryRunResult && { dryRunResult: finalResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to mint SCoin via Strater bucket vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Strater bucket vault
     * Integrates logic from dep/Strater/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // Strater burn process would typically involve withdraw from vault
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.withdrawTarget!,
                [
                    { name: "vault", value: this.constants.bucketVault! },
                    { name: "s_coin", value: "sCoin" },
                    { name: "clock", value: this.constants.clockObject! },
                ],
                [this.config.coinType],
                [
                    this.obj(this.constants.bucketVault!),
                    sCoin,
                    this.obj(this.constants.clockObject!),
                ],
                options
            );

            return {
                result: result.result,
                ...(options?.returnDebugInfo && { debugInfo: result.debugInfo }),
                ...(result.dryRunResult && { dryRunResult: result.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to burn SCoin via Strater vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Strater-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: false, // Strater is a savings vault, not staking
            supportedFeatures: ['mint', 'burn', 'savings-vault', 'bucket-protocol', 'multi-step']
        };
    }

    /**
     * Get Strater-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Strater uses 3-step minting process - higher gas
        const baseGas = operation === 'mint' ? 900000 : 600000;
        return {
            estimated: baseGas,
            complexity: 'high' as const
        };
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            version: this.config.version,
            supportedOperations: ['mint', 'burn', 'vault-deposit', 'vault-withdraw'],
            description: 'Strater savings vault with bucket protocol integration'
        };
    }
} 