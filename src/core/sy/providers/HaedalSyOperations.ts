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
 * Haedal-specific SY Operations
 * Integrates existing Haedal logic from dep folder into new architecture
 */
export class HaedalSyOperations extends SyOperations {
    readonly provider: SyProvider = "Haedal";

    readonly constants: ProviderConstants = {
        // Haedal-specific constants from dep/Haedal/constants.ts
        hawalStakeTarget: "0x83094bb1de70e10c5329cf2b0e0b6b900cc59f0dd3b31e4c74a1b8b4fc20df8e::hawal_staking::stake",
        hasuiStakeTarget: "0x83094bb1de70e10c5329cf2b0e0b6b900cc59f0dd3b31e4c74a1b8b4fc20df8e::hasui_staking::stake",

        // HAWAL-specific objects
        hawalStakingOne: "0xf5ff7d6ba11c2301325c888d12149de8e5fee5e7c1ec4e8e292a14b4e46a04c6",
        hawalStakingTwo: "0x8973f4114b40c3f59d43b26a88b98493b7a7ed6b8c6e0103c8c2c8c0f37cf8c1",
        hawalId: "0xc65c406c4a23c088888a97ec80bd8b11a5b6cc9b1e7ca2dc7a9d88f0f8c7f7b7",

        // HASUI/general staking objects
        haedalStakingId: "0xa6baab1e668c7868991c1c3c11e144100f5734c407d020f72a01b9d1a8bcaaa2",
        suiSystemState: "0x5",
        zeroAddress: "0x0000000000000000000000000000000000000000000000000000000000000000",

        // Special coin type for HAWAL
        hawalCoinType: "0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8e52ae1bc::hawal::HAWAL"
    };

    /**
     * Haedal-specific configuration validation
     */
    protected validateProviderSpecificConfig(_config: SyConfig): void {
        // Haedal-specific validation can be added here
        // For now, use the base validation
    }

    /**
     * Haedal supports HAWAL and other staking tokens
     */
    supportsToken(coinType: string): boolean {
        // HAWAL has special support, SUI and other tokens use general staking
        return coinType === this.constants.hawalCoinType ||
            coinType === "0x2::sui::SUI" ||
            coinType === "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI" ||
            coinType === this.config.coinType; // Allow configured token
    }

    /**
     * Mint Haedal SY tokens
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            // Check if this is HAWAL token (special case)
            if (this.config.coinType === this.constants.hawalCoinType) {
                // HAWAL staking - uses special targets and arguments
                const result = await this.executeMove<TransactionObjectArgument>(
                    this.constants.hawalStakeTarget!,
                    [
                        { name: "staking", value: this.constants.hawalStakingOne! },
                        { name: "staking", value: this.constants.hawalStakingTwo! },
                        { name: "coin", value: "coin" },
                        { name: "id", value: this.constants.hawalId! },
                    ],
                    [],
                    [
                        this.obj(this.constants.hawalStakingOne!),
                        this.obj(this.constants.hawalStakingTwo!),
                        coin,
                        this.obj(this.constants.hawalId!),
                    ],
                    options
                );

                return {
                    result: result.result,
                    ...(options?.returnDebugInfo && { debugInfo: result.debugInfo }),
                    ...(result.dryRunResult && { dryRunResult: result.dryRunResult })
                };
            } else {
                // HASUI/General staking - standard liquid staking pattern
                const result = await this.executeMove<TransactionObjectArgument>(
                    this.constants.hasuiStakeTarget!,
                    [
                        { name: "sui_system_state", value: this.constants.suiSystemState! },
                        { name: "staking", value: this.constants.haedalStakingId! },
                        { name: "coin", value: "coin" },
                        { name: "address", value: this.constants.zeroAddress! },
                    ],
                    [],
                    [
                        this.obj(this.constants.suiSystemState!),
                        this.obj(this.constants.haedalStakingId!),
                        coin,
                        this.obj(this.constants.zeroAddress!),
                    ],
                    options
                );

                return {
                    result: result.result,
                    ...(options?.returnDebugInfo && { debugInfo: result.debugInfo }),
                    ...(result.dryRunResult && { dryRunResult: result.dryRunResult })
                };
            }

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to mint SCoin via Haedal staking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Haedal unstaking
     * Integrates logic from dep/Haedal/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // Haedal unstaking logic - would follow similar conditional pattern
            // For now, implement general unstaking pattern
            const unstakeTarget = this.config.coinType === this.constants.hawalCoinType
                ? this.constants.hawalStakeTarget!.replace("::stake", "::unstake")
                : this.constants.hasuiStakeTarget!.replace("::stake", "::unstake");

            const result = await this.executeMove<TransactionObjectArgument>(
                unstakeTarget,
                [
                    { name: "staking", value: this.constants.haedalStakingId! },
                    { name: "s_coin", value: "sCoin" },
                ],
                [this.config.coinType],
                [
                    this.obj(this.constants.haedalStakingId!),
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
                message: `Failed to burn SCoin via Haedal unstaking: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Haedal-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: true, // Haedal is liquid staking protocol
            supportedFeatures: ['mint', 'burn', 'staking', 'multi-token', 'conditional-logic', 'hawal-support']
        };
    }

    /**
     * Get Haedal-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Haedal has conditional logic but single operations
        const baseGas = operation === 'mint' ? 500000 : 550000;
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
            supportedOperations: ['mint', 'burn', 'hawal-stake', 'hasui-stake'],
            description: 'Haedal liquid staking with special HAWAL support'
        };
    }
} 