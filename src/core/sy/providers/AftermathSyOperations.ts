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
 * Aftermath-specific SY Operations
 * Integrates existing Aftermath logic from dep folder into new architecture
 */
export class AftermathSyOperations extends SyOperations {
    readonly provider: SyProvider = "Aftermath";

    readonly constants: ProviderConstants = {
        // Aftermath-specific constants from dep/Aftermath/constants.ts
        requestStakeTarget: "0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_stake",
        requestUnstakeAtomicTarget: "0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::staked_sui_vault::request_unstake_atomic",

        // Aftermath-specific objects
        stakedSuiVault: "0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d",
        safe: "0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610",
        referralVault: "0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef",
        treasury: "0xd2b95022244757b0ab9f74e2ee2fb2c3bf29dce5590fa6993a85d64bd219d7e8",
        systemState: "0x5",
        validator: "0xcb7efe4253a0fe58df608d8a2d3c0eea94b4b40a8738c8daae4eb77830c16cd7"
    };

    /**
     * Aftermath-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        // Aftermath works primarily with SUI staking
        if (config.coinType !== "0x2::sui::SUI" &&
            config.coinType !== "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI") {
            console.warn(`Aftermath is optimized for SUI tokens, got: ${config.coinType}`);
        }
    }

    /**
     * Aftermath supports SUI staking primarily
     */
    supportsToken(coinType: string): boolean {
        // Aftermath is primarily a SUI staking vault
        return coinType === "0x2::sui::SUI" ||
            coinType === "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI" ||
            coinType === this.config.coinType; // Allow configured token
    }

    /**
     * Mint SCoin using Aftermath staked SUI vault
     * Integrates logic from dep/Aftermath/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, options } = params;

        try {
            // Aftermath request stake operation
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.requestStakeTarget!,
                [
                    { name: "staked_sui_vault", value: this.constants.stakedSuiVault! },
                    { name: "safe", value: this.constants.safe! },
                    { name: "system_state", value: this.constants.systemState! },
                    { name: "referral_vault", value: this.constants.referralVault! },
                    { name: "coin", value: "coin" },
                    { name: "validator", value: this.constants.validator! },
                ],
                [],
                [
                    this.obj(this.constants.stakedSuiVault!),
                    this.obj(this.constants.safe!),
                    this.obj(this.constants.systemState!),
                    this.obj(this.constants.referralVault!),
                    coin,
                    this.pure.address(this.constants.validator!),
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
                message: `Failed to mint SCoin via Aftermath staked SUI vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Aftermath staked SUI vault
     * Integrates logic from dep/Aftermath/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // Aftermath request unstake atomic operation
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.requestUnstakeAtomicTarget!,
                [
                    { name: "staked_sui_vault", value: this.constants.stakedSuiVault! },
                    { name: "safe", value: this.constants.safe! },
                    { name: "system_state", value: this.constants.systemState! },
                    { name: "s_coin", value: "sCoin" },
                ],
                [],
                [
                    this.obj(this.constants.stakedSuiVault!),
                    this.obj(this.constants.safe!),
                    this.obj(this.constants.systemState!),
                    sCoin,
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
                message: `Failed to burn SCoin via Aftermath staked SUI vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Aftermath-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // Aftermath is SUI staking vault
            supportedFeatures: ['mint', 'burn', 'staking', 'sui-vault', 'referral-system', 'atomic-unstake']
        };
    }

    /**
     * Get Aftermath-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Aftermath has complex vault operations with referral system
        const baseGas = operation === 'mint' ? 650000 : 600000;
        return {
            estimated: baseGas,
            complexity: 'medium' as const
        };
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            version: this.config.version,
            supportedOperations: ['mint', 'burn', 'request-stake', 'request-unstake-atomic'],
            description: 'Aftermath staked SUI vault with referral system'
        };
    }
} 