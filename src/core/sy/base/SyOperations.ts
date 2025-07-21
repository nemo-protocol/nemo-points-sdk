import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import type { MoveCallInfo } from "../../../api/types";
import type {
    SyConfig,
    SyOperationOptions,
    SyOperationResult,
    SyProvider,
    SyProviderInterface,
    SyMintParams,
    SyBurnParams,
    ProviderConstants,
    SyProviderCapabilities,
    SyProviderInfo,
    SyGasEstimate
} from "../types";
import { createSyProviderError, createSyConfigurationError } from "../types";

/**
 * Base SY (Synthetic Yield) Operations Class
 * Provides common functionality for all provider-specific SY operations
 */
export abstract class SyOperations implements SyProviderInterface {
    protected tx: Transaction;
    protected config: SyConfig;

    abstract readonly provider: SyProvider;
    abstract readonly constants: ProviderConstants;

    constructor(tx: Transaction, config: SyConfig) {
        this.tx = tx;
        this.config = config;
        this.validateConfig(config);
    }

    // ===== ABSTRACT METHODS (must be implemented by each provider) =====
    abstract mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>>;
    abstract burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>>;

    // ===== PROVIDER CAPABILITIES & METADATA (implemented with defaults) =====

    /**
     * Get provider capabilities and supported features
     */
    getCapabilities(): SyProviderCapabilities {
        return {
            supportsMint: true,
            supportsBurn: true,
            supportsStaking: false,
            supportedFeatures: ['mint', 'burn']
        };
    }

    /**
     * Get provider information
     */
    getProviderInfo(): SyProviderInfo {
        return {
            provider: this.config.provider,
            version: '1.0.0',
            supportedOperations: ['mint', 'burn'],
            description: `Default ${this.config.provider} SY operations`
        };
    }

    /**
     * Get supported tokens (default implementation)
     */
    getSupportedTokens(): string[] {
        return [this.config.coinType];
    }

    /**
     * Estimate gas costs for operations
     */
    estimateGas(_operation: 'mint' | 'burn'): SyGasEstimate {
        return {
            estimated: 500000,
            complexity: 'medium'
        };
    }

    // ===== HELPER METHODS =====

    protected getSupportedFeatures(): string[] {
        const features: string[] = ["mint", "burn"];

        if (this.getCapabilities().supportsStaking) {
            features.push("staking");
        }

        // Provider-specific features
        switch (this.provider) {
            case "Scallop":
                features.push("lending", "variable-yield");
                break;
            case "Strater":
                features.push("savings", "bucket-protocol");
                break;
            case "Cetus":
                features.push("dex", "concentrated-liquidity");
                break;
            case "Aftermath":
                features.push("high-yield", "validator-rewards");
                break;
            case "AlphaFi":
                features.push("institutional", "enterprise");
                break;
        }

        return features;
    }

    protected getGasComplexity(): 'low' | 'medium' | 'high' {
        // Provider-specific gas complexity
        switch (this.provider) {
            case "Volo":
            case "SpringSui":
                return 'low'; // Simple staking operations
            case "Scallop":
            case "Strater":
                return 'medium'; // Lending/savings protocols
            case "Haedal":
            case "Winter":
            case "Aftermath":
            case "AlphaFi":
            case "Mstable":
                return 'medium'; // Complex staking with multiple steps
            case "Cetus":
                return 'high'; // DEX operations with concentrated liquidity
            default:
                return 'medium';
        }
    }

    protected getProviderWebsite(): string | undefined {
        const websites: Partial<Record<SyProvider, string>> = {
            "Scallop": "https://scallop.io",
            "Volo": "https://volo.fi",
            "SpringSui": "https://springsui.io",
            "Aftermath": "https://aftermath.finance",
            "Cetus": "https://cetus.zone",
            "AlphaFi": "https://alphafi.xyz"
        };
        return websites[this.provider];
    }

    protected getProviderDocs(): string | undefined {
        // Most providers don't have specific docs for SY operations
        return undefined;
    }

    // ===== EXISTING METHODS (unchanged) =====

    /**
     * Validate the configuration for this provider
     */
    validateConfig(config: SyConfig): void {
        // Common validation
        if (!config.provider) {
            throw createSyConfigurationError({
                message: "Provider must be specified",
                provider: this.provider
            });
        }

        if (!config.coinType) {
            throw createSyConfigurationError({
                message: "coinType must be specified",
                provider: this.provider
            });
        }

        // Provider-specific validation (can be overridden)
        this.validateProviderSpecificConfig(config);
    }

    /**
     * Provider-specific configuration validation (override in subclasses)
     */
    protected validateProviderSpecificConfig(_config: SyConfig): void {
        // Default: no additional validation
        // Override in provider-specific implementations
    }

    /**
     * Check if provider supports a specific token type
     */
    supportsToken(coinType: string): boolean {
        const supportedTokens = this.getSupportedTokens();
        return supportedTokens.includes(coinType);
    }

    /**
     * Common utility methods for transaction building
     */
    protected obj(objectId: string): TransactionObjectArgument {
        return this.tx.object(objectId);
    }

    protected get pure(): any {
        return this.tx.pure;
    }

    protected get clock(): TransactionObjectArgument {
        return this.obj("0x6");
    }

    /**
     * Execute a move call with optional debug info and dry run
     */
    protected async executeMove<T>(
        target: string,
        argumentsInfo: Array<{ name: string; value: any }>,
        typeArguments: string[],
        txArguments: any[],
        options?: SyOperationOptions
    ): Promise<SyOperationResult<T>> {
        const debugInfo: MoveCallInfo = {
            target,
            arguments: argumentsInfo,
            typeArguments,
        };

        try {
            const result = this.tx.moveCall({
                target,
                arguments: txArguments,
                typeArguments,
            });

            // For dry run operations
            if (options?.dryRun) {
                // This would integrate with dry run functionality
                // For now, return the result with placeholder dry run data
                return {
                    result: result as T,
                    ...(options.returnDebugInfo && { debugInfo: [debugInfo] }),
                    dryRunResult: {
                        status: "success",
                        target,
                        provider: this.provider
                    }
                };
            }

            return {
                result: result as T,
                ...(options?.returnDebugInfo && { debugInfo: [debugInfo] })
            };

        } catch (error) {
            throw createSyProviderError({
                message: `Move call failed: ${error instanceof Error ? error.message : String(error)}`,
                provider: this.provider,
                operation: target,
                debugInfo
            });
        }
    }

    /**
     * Create SY coin deposit operation (common workflow)
     */
    async depositToSy(params: {
        underlyingCoin: TransactionObjectArgument;
        amount: string;
        options?: SyOperationOptions;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        return this.mintSCoin({
            coin: params.underlyingCoin,
            amount: params.amount,
            options: params.options
        });
    }

    /**
     * Create SY coin redeem operation (common workflow) 
     */
    async redeemFromSy(params: {
        sCoin: TransactionObjectArgument;
        address: string;
        options?: SyOperationOptions;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        return this.burnSCoin({
            sCoin: params.sCoin,
            address: params.address,
            options: params.options
        });
    }
} 