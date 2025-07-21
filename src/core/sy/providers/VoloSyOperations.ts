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
 * Volo-specific SY Operations
 * Integrates existing Volo logic from dep folder into new architecture
 */
export class VoloSyOperations extends SyOperations {
    readonly provider: SyProvider = "Volo";

    readonly constants: ProviderConstants = {
        stakeTarget: "0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20::stake_pool::stake",
        unstakeTarget: "0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20::stake_pool::unstake",
        suiSystemState: "0x5",

        // Volo-specific constants from dep/Volo/constants.ts
        versionObject: "0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5", // NATIVE_POOL/STAKE_POOL
        marketObject: "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60", // METADATA
    };

    /**
     * Volo supports SUI staking only
     */
    supportsToken(coinType: string): boolean {
        return coinType === "0x2::sui::SUI" ||
            coinType === "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
    }

    /**
     * Volo-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        if (!this.supportsToken(config.coinType)) {
            throw createSyProviderError({
                message: `Volo only supports SUI tokens, got: ${config.coinType}`,
                provider: this.provider,
                operation: "validateConfig"
            });
        }
    }

    /**
     * Mint SCoin using Volo staking
     * Integrates logic from dep/Volo/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            // Volo uses simple staking - single move call
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.stakeTarget!,
                [
                    { name: "native_pool", value: this.constants.versionObject! },
                    { name: "metadata", value: this.constants.marketObject! },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "coin", value: "coin" },
                ],
                [], // No type arguments for Volo
                [
                    this.obj(this.constants.versionObject!), // STAKE_POOL
                    this.obj(this.constants.marketObject!),  // METADATA
                    this.obj(this.constants.suiSystemState!), // SUI_SYSTEM_STATE
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
                message: `Failed to mint SCoin via Volo staking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Volo unstaking
     * Integrates logic from dep/Volo/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // Volo uses simple unstaking - single move call
            const result = await this.executeMove<TransactionObjectArgument>(
                this.constants.unstakeTarget!,
                [
                    { name: "stake_pool", value: this.constants.versionObject! },
                    { name: "metadata", value: this.constants.marketObject! },
                    { name: "sui_system_state", value: this.constants.suiSystemState! },
                    { name: "s_coin", value: "sCoin" },
                ],
                [], // No type arguments for Volo
                [
                    this.obj(this.constants.versionObject!), // NATIVE_POOL
                    this.obj(this.constants.marketObject!),  // METADATA
                    this.obj(this.constants.suiSystemState!), // SUI_SYSTEM_STATE
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
                message: `Failed to burn SCoin via Volo unstaking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Volo-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // Volo is a liquid staking protocol
            supportedFeatures: ['mint', 'burn', 'staking', 'sui-native']
        };
    }

    /**
     * Get Volo-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Volo uses single move calls - simpler than Scallop
        const baseGas = operation === 'mint' ? 400000 : 450000;
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
            supportedOperations: ['mint', 'burn', 'stake', 'unstake'],
            description: 'Volo liquid staking protocol for SUI tokens'
        };
    }
} 