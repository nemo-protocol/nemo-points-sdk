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
 * AlphaFi-specific SY Operations
 * Integrates existing AlphaFi logic from dep folder into new architecture
 */
export class AlphaFiSyOperations extends SyOperations {
    readonly provider: SyProvider = "AlphaFi";

    readonly constants: ProviderConstants = {
        // AlphaFi-specific constants from dep/AlphaFi/constants.ts
        packageId: "0x9ee8c7efefc96b09b5b6e852e8d91c6b4c9b9e8b9e8b9e8b9e8b9e8b9e8b9e8",
        liquidStakingInfo: "0xa6baab1e668c7868991c1c3c11e144100f5734c407d020f72a01b9d1a8bcaaa2",
        suiSystemState: "0x5",

        // AlphaFi mint target (constructed from package ID)
        mintTarget: "", // Will be set dynamically
    };

    constructor(tx: any, config: SyConfig) {
        super(tx, config);
        // Set the dynamic mint target
        this.constants.mintTarget = `${this.constants.packageId}::liquid_staking::mint`;
    }

    /**
     * AlphaFi-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        // AlphaFi requires coinType for type arguments
        if (!config.coinType) {
            throw createSyProviderError({
                message: "AlphaFi requires coinType to be specified",
                provider: this.provider,
                operation: "validateConfig"
            });
        }
    }

    /**
     * AlphaFi supports liquid staking tokens
     */
    supportsToken(coinType: string): boolean {
        // AlphaFi is flexible with token types as it uses type arguments
        return coinType === this.config.coinType ||
            coinType === "0x2::sui::SUI" ||
            coinType === "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
    }

    /**
     * Mint SCoin using AlphaFi liquid staking
     * Integrates logic from dep/AlphaFi/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            // AlphaFi liquid staking mint
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.mintTarget!,
                [
                    { name: "liquid_staking_info", value: this.constants.liquidStakingInfo! },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "coin", value: "coin" },
                ],
                [this.config.coinType],
                [
                    this.obj(this.constants.liquidStakingInfo!),
                    this.obj(this.constants.suiSystemState!),
                    coin,
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
                message: `Failed to mint SCoin via AlphaFi liquid staking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using AlphaFi liquid staking
     * Integrates logic from dep/AlphaFi/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // AlphaFi unstaking/burn target (constructed from package ID)
            const burnTarget = `${this.constants.packageId}::liquid_staking::burn`;

            const result = await this.executeMove<TransactionObjectArgument>(
                burnTarget,
                [
                    { name: "liquid_staking_info", value: this.constants.liquidStakingInfo! },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "s_coin", value: "sCoin" },
                ],
                [this.config.coinType],
                [
                    this.obj(this.constants.liquidStakingInfo!),
                    this.obj(this.constants.suiSystemState!),
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
                message: `Failed to burn SCoin via AlphaFi liquid staking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * AlphaFi-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // AlphaFi is liquid staking
            supportedFeatures: ['mint', 'burn', 'staking', 'yield-optimization', 'dynamic-targets']
        };
    }

    /**
     * Get AlphaFi-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // AlphaFi uses simple liquid staking operations
        const baseGas = operation === 'mint' ? 480000 : 520000;
        return {
            estimated: baseGas,
            complexity: 'low' as const
        };
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            version: this.config.version,
            supportedOperations: ['mint', 'burn', 'liquid-stake', 'yield-optimization'],
            description: 'AlphaFi yield optimization with liquid staking'
        };
    }
} 