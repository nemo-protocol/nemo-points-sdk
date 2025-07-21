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
 * Mstable-specific SY Operations
 * Integrates existing Mstable logic from dep folder into new architecture
 */
export class MstableSyOperations extends SyOperations {
    readonly provider: SyProvider = "Mstable";

    readonly constants: ProviderConstants = {
        // Mstable-specific constants from dep/Mstable/constants.ts
        createDepositCapTarget: "0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_deposit_cap",
        createWithdrawCapTarget: "0x8e9aa615cd18d263cfea43d68e2519a2de2d39075756a05f67ae6cee2794ff06::exchange_rate::create_withdraw_cap",
        depositTarget: "0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::deposit",
        withdrawTarget: "0x74ecdeabc36974da37a3e2052592b2bc2c83e878bbd74690e00816e91f93a505::vault::withdraw",

        // Mstable-specific objects
        metaVaultSuiIntegration: "0x408618719d06c44a12e9c6f7fdf614a9c2fb79f262932c6f2da7621c68c7bcfa",
        vault: "0x3062285974a5e517c88cf3395923aac788dce74f3640029a01e25d76c4e76f5d",
        registry: "0x5ff2396592a20f7bf6ff291963948d6fc2abec279e11f50ee74d193c4cf0bba8",
        version: "0x4696559327b35ff2ab26904e7426a1646312e9c836d5c6cff6709a5ccc30915c",

        // Amount limit
        amountLimit: "0"
    };

    /**
     * Mstable-specific configuration validation
     */
    protected validateProviderSpecificConfig(config: SyConfig): void {
        // Mstable works with meta-stable assets, requires proper configuration
        if (!config.underlyingCoinType) {
            throw createSyProviderError({
                message: "Mstable requires underlyingCoinType to be specified",
                provider: this.provider,
                operation: "validateConfig"
            });
        }
    }

    /**
     * Mstable supports meta-stable assets
     */
    supportsToken(coinType: string): boolean {
        // Mstable supports various meta-stable assets
        return coinType === this.config.coinType ||
            coinType.includes("meta") ||
            coinType.includes("stable") ||
            coinType.includes("vault");
    }

    /**
     * Mint SCoin using Mstable meta-asset vault
     * Integrates logic from dep/Mstable/mintSCoin.ts
     */
    async mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { coin, amount: _amount, options } = params;

        try {
            // Step 1: Create deposit capability
            const depositCapResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.createDepositCapTarget!,
                [
                    { name: "registry", value: this.constants.registry! },
                    { name: "version", value: this.constants.version! },
                ],
                [this.config.coinType, this.config.underlyingCoinType!],
                [
                    this.obj(this.constants.registry!),
                    this.obj(this.constants.version!),
                ],
                options
            );

            // Step 2: Deposit using capability
            const depositResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.depositTarget!,
                [
                    { name: "vault", value: this.constants.vault! },
                    { name: "integration", value: this.constants.metaVaultSuiIntegration! },
                    { name: "deposit_cap", value: "depositCap" },
                    { name: "coin", value: "coin" },
                    { name: "amount_limit", value: this.constants.amountLimit! },
                ],
                [this.config.coinType, this.config.underlyingCoinType!],
                [
                    this.obj(this.constants.vault!),
                    this.obj(this.constants.metaVaultSuiIntegration!),
                    depositCapResult.result,
                    coin,
                    this.pure.u64(this.constants.amountLimit!),
                ],
                options
            );

            // Combine debug info from both steps
            const combinedDebugInfo = [
                ...(depositCapResult.debugInfo || []),
                ...(depositResult.debugInfo || [])
            ];

            return {
                result: depositResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(depositResult.dryRunResult && { dryRunResult: depositResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to mint SCoin via Mstable meta-vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "mintSCoin"
            });
        }
    }

    /**
     * Burn SCoin using Mstable meta-asset vault
     * Integrates logic from dep/Mstable/burnSCoin.ts
     */
    async burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>> {
        const { sCoin, options } = params;

        try {
            // Step 1: Create withdraw capability
            const withdrawCapResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.createWithdrawCapTarget!,
                [
                    { name: "registry", value: this.constants.registry! },
                    { name: "version", value: this.constants.version! },
                ],
                [this.config.coinType, this.config.underlyingCoinType!],
                [
                    this.obj(this.constants.registry!),
                    this.obj(this.constants.version!),
                ],
                options
            );

            // Step 2: Withdraw using capability
            const withdrawResult = await this.executeMove<TransactionObjectArgument>(
                this.constants.withdrawTarget!,
                [
                    { name: "vault", value: this.constants.vault! },
                    { name: "integration", value: this.constants.metaVaultSuiIntegration! },
                    { name: "withdraw_cap", value: "withdrawCap" },
                    { name: "s_coin", value: "sCoin" },
                    { name: "amount_limit", value: this.constants.amountLimit! },
                ],
                [this.config.coinType, this.config.underlyingCoinType!],
                [
                    this.obj(this.constants.vault!),
                    this.obj(this.constants.metaVaultSuiIntegration!),
                    withdrawCapResult.result,
                    sCoin,
                    this.pure.u64(this.constants.amountLimit!),
                ],
                options
            );

            // Combine debug info from both steps
            const combinedDebugInfo = [
                ...(withdrawCapResult.debugInfo || []),
                ...(withdrawResult.debugInfo || [])
            ];

            return {
                result: withdrawResult.result,
                ...(options?.returnDebugInfo && { debugInfo: combinedDebugInfo }),
                ...(withdrawResult.dryRunResult && { dryRunResult: withdrawResult.dryRunResult })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Failed to burn SCoin via Mstable meta-vault: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: "burnSCoin"
            });
        }
    }

    /**
     * Mstable-specific capabilities
     */
    getCapabilities() {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: false, // Mstable is meta-asset vault, not staking
            supportedFeatures: ['mint', 'burn', 'meta-assets', 'vault-based', 'capability-system', 'multi-step']
        };
    }

    /**
     * Get Mstable-specific gas estimates
     */
    estimateGas(operation: 'mint' | 'burn') {
        // Mstable uses 2-step process with capability creation
        const baseGas = operation === 'mint' ? 800000 : 850000;
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
            supportedOperations: ['mint', 'burn', 'vault-deposit', 'vault-withdraw', 'capability-creation'],
            description: 'Mstable meta-asset protocol with vault-based operations'
        };
    }
} 