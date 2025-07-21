import { Transaction, type TransactionObjectArgument } from "@mysten/sui/transactions";
import type {
    SyConfig,
    SyProvider,
    SyProviderInterface,
    SyOperationOptions,
    SyOperationResult,
    SyDepositWorkflowParams,
    SyAnalytics
} from "./types";
import { SyProviderFactory } from "./SyProviderFactory";
import { createSyProviderError } from "./types";

/**
 * SY Manager - Main orchestrator for all SY operations
 * Provides unified interface for synthetic yield operations across providers
 */
export class SyManager {
    private tx: Transaction;
    private providers: Map<SyProvider, SyProviderInterface> = new Map();

    constructor(tx: Transaction) {
        this.tx = tx;
    }

    /**
     * Add a provider to the manager
     */
    async addProvider(config: SyConfig): Promise<SyProviderInterface> {
        const provider = await SyProviderFactory.create(this.tx, config);
        this.providers.set(config.provider, provider);
        return provider;
    }

    /**
     * Add a provider using synchronous factory method (for backward compatibility)
     */
    addProviderSync(config: SyConfig): SyProviderInterface {
        const provider = SyProviderFactory.createSync(this.tx, config);
        this.providers.set(config.provider, provider);
        return provider;
    }

    /**
     * Get a specific provider
     */
    getProvider(provider: SyProvider): SyProviderInterface | undefined {
        return this.providers.get(provider);
    }

    /**
     * Get all loaded providers
     */
    getAllProviders(): Map<SyProvider, SyProviderInterface> {
        return new Map(this.providers);
    }

    /**
     * Remove a provider
     */
    removeProvider(provider: SyProvider): boolean {
        return this.providers.delete(provider);
    }

    /**
     * Unified mint operation across providers
     */
    async mintSCoin(params: {
        provider: SyProvider;
        coin: TransactionObjectArgument;
        amount: string;
        options?: SyOperationOptions;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        const providerInstance = this.providers.get(params.provider);

        if (!providerInstance) {
            throw createSyProviderError({
                message: `Provider ${params.provider} not loaded. Call addProvider() first.`,
                provider: params.provider,
                operation: "mintSCoin"
            });
        }

        return providerInstance.mintSCoin({
            coin: params.coin,
            amount: params.amount,
            options: params.options
        });
    }

    /**
     * Unified burn operation across providers
     */
    async burnSCoin(params: {
        provider: SyProvider;
        sCoin: TransactionObjectArgument;
        address: string;
        options?: SyOperationOptions;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        const providerInstance = this.providers.get(params.provider);

        if (!providerInstance) {
            throw createSyProviderError({
                message: `Provider ${params.provider} not loaded. Call addProvider() first.`,
                provider: params.provider,
                operation: "burnSCoin"
            });
        }

        return providerInstance.burnSCoin({
            sCoin: params.sCoin,
            address: params.address,
            options: params.options
        });
    }

    /**
     * Complete deposit workflow (mint SCoin and optionally convert to SY)
     */
    async depositWorkflow(params: SyDepositWorkflowParams & {
        provider: SyProvider;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        const providerInstance = this.providers.get(params.provider);

        if (!providerInstance) {
            throw createSyProviderError({
                message: `Provider ${params.provider} not loaded. Call addProvider() first.`,
                provider: params.provider,
                operation: "depositWorkflow"
            });
        }

        // Use the provider's mintSCoin method for deposits
        return providerInstance.mintSCoin({
            coin: params.underlyingCoin,
            amount: params.amount,
            options: params.options
        });
    }

    /**
     * Complete redeem workflow (burn SCoin and get underlying)
     */
    async redeemWorkflow(params: {
        provider: SyProvider;
        sCoin: TransactionObjectArgument;
        address: string;
        options?: SyOperationOptions;
    }): Promise<SyOperationResult<TransactionObjectArgument>> {
        const providerInstance = this.providers.get(params.provider);

        if (!providerInstance) {
            throw createSyProviderError({
                message: `Provider ${params.provider} not loaded. Call addProvider() first.`,
                provider: params.provider,
                operation: "redeemWorkflow"
            });
        }

        return providerInstance.burnSCoin({
            sCoin: params.sCoin,
            address: params.address,
            options: params.options
        });
    }

    /**
     * Get analytics across all loaded providers
     */
    getAnalytics(): SyAnalytics[] {
        const analytics: SyAnalytics[] = [];

        for (const [provider, providerInstance] of this.providers) {
            try {
                const supportedTokens = providerInstance.getSupportedTokens();

                analytics.push({
                    provider,
                    totalMinted: "0", // Would implement actual tracking
                    totalBurned: "0", // Would implement actual tracking
                    currentSupply: "0", // Would implement actual tracking
                    supportedTokens,
                    utilizationRate: "0%", // Would calculate from actual data
                    apy: undefined // Would fetch from provider if available
                });
            } catch (error) {
                console.warn(`Failed to get analytics for ${provider}:`, error);
            }
        }

        return analytics;
    }

    /**
     * Find optimal provider for specific requirements
     */
    findOptimalProvider(requirements: {
        coinType: string;
        operation: 'mint' | 'burn';
        preferLowGas?: boolean;
        needsStaking?: boolean;
    }): {
        provider: SyProvider | null;
        reasons: string[];
        alternatives: SyProvider[];
    } {
        const suitable: Array<{ provider: SyProvider; score: number; reasons: string[] }> = [];

        for (const [provider, providerInstance] of this.providers) {
            const reasons: string[] = [];

            // Check if provider supports the coin type
            if (!providerInstance.supportsToken(requirements.coinType)) {
                continue; // Skip providers that don't support the token
            }
            reasons.push("Supports required token");

            // Check capabilities
            const capabilities = providerInstance.getCapabilities();
            if (requirements.operation === 'mint' && capabilities.supportsMint) {
                reasons.push("Supports minting");
            }
            if (requirements.operation === 'burn' && capabilities.supportsBurn) {
                reasons.push("Supports burning");
            }

            // Gas preferences
            if (requirements.preferLowGas) {
                const gasEstimate = providerInstance.estimateGas(requirements.operation);
                if (gasEstimate.complexity === 'low') {
                    reasons.push("Low gas complexity");
                }
            }

            // Staking requirements
            if (requirements.needsStaking && capabilities.supportsStaking) {
                reasons.push("Supports staking");
            } else if (requirements.needsStaking && !capabilities.supportsStaking) {
                continue; // Skip if staking is required but not supported
            }

            suitable.push({
                provider,
                score: reasons.length,
                reasons
            });
        }

        // Sort by score (higher is better)
        suitable.sort((a, b) => b.score - a.score);

        return {
            provider: suitable.length > 0 ? suitable[0].provider : null,
            reasons: suitable.length > 0 ? suitable[0].reasons : ["No suitable provider found"],
            alternatives: suitable.slice(1).map(item => item.provider)
        };
    }

    /**
     * Batch operations across multiple providers
     */
    async batchMint(operations: Array<{
        provider: SyProvider;
        coin: TransactionObjectArgument;
        amount: string;
        options?: SyOperationOptions;
    }>): Promise<Array<{
        provider: SyProvider;
        result?: SyOperationResult<TransactionObjectArgument>;
        error?: Error;
    }>> {
        const results = [];

        for (const operation of operations) {
            try {
                const result = await this.mintSCoin(operation);
                results.push({ provider: operation.provider, result });
            } catch (error) {
                results.push({
                    provider: operation.provider,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
        }

        return results;
    }

    /**
     * Get provider comparison
     */
    compareProviders(operation: 'mint' | 'burn', coinType: string): Array<{
        provider: SyProvider;
        supported: boolean;
        gasEstimate: { estimated: number; complexity: string };
        features: string[];
        description: string;
    }> {
        const comparison = [];

        for (const [provider, providerInstance] of this.providers) {
            const supported = providerInstance.supportsToken(coinType);
            const gasEstimate = supported ? providerInstance.estimateGas(operation) : { estimated: 0, complexity: 'unknown' };
            const capabilities = providerInstance.getCapabilities();
            const info = providerInstance.getProviderInfo();

            comparison.push({
                provider,
                supported,
                gasEstimate,
                features: capabilities.supportedFeatures,
                description: info.description
            });
        }

        return comparison;
    }

    /**
     * Static factory method to create SY manager with providers
     */
    static create(tx: Transaction, configs: SyConfig[]): SyManager {
        const manager = new SyManager(tx);

        for (const config of configs) {
            try {
                manager.addProvider(config);
            } catch (error) {
                console.warn(`Failed to add provider ${config.provider}:`, error);
            }
        }

        return manager;
    }

    /**
     * Get summary of loaded providers
     */
    getSummary(): {
        totalProviders: number;
        loadedProviders: SyProvider[];
        supportedTokens: string[];
        totalCapabilities: string[];
    } {
        const loadedProviders = Array.from(this.providers.keys());
        const supportedTokens = new Set<string>();
        const capabilities = new Set<string>();

        for (const provider of this.providers.values()) {
            provider.getSupportedTokens().forEach((token: string) => supportedTokens.add(token));
            provider.getCapabilities().supportedFeatures.forEach((feature: string) => capabilities.add(feature));
        }

        return {
            totalProviders: this.providers.size,
            loadedProviders,
            supportedTokens: Array.from(supportedTokens),
            totalCapabilities: Array.from(capabilities)
        };
    }
} 