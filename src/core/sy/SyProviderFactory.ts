import { Transaction } from "@mysten/sui/transactions";
import type { SyProvider, SyConfig, SyProviderInterface } from "./types";
import { createSyConfigurationError } from "./types";

/**
 * SY Provider Factory with lazy loading and improved type safety
 * Creates and manages instances of different SY provider implementations
 */
export class SyProviderFactory {
    private static providerRegistry: Map<SyProvider, () => Promise<new (tx: Transaction, config: SyConfig) => SyProviderInterface>> = new Map();
    private static loadedProviders: Map<SyProvider, new (tx: Transaction, config: SyConfig) => SyProviderInterface> = new Map();

    static {
        // Register providers with lazy loading
        this.providerRegistry.set("Scallop", () => import("./providers/ScallopSyOperations").then(m => m.ScallopSyOperations));
        this.providerRegistry.set("Volo", () => import("./providers/VoloSyOperations").then(m => m.VoloSyOperations));
        this.providerRegistry.set("Winter", () => import("./providers/WinterSyOperations").then(m => m.WinterSyOperations));
        this.providerRegistry.set("SpringSui", () => import("./providers/SpringSuiSyOperations").then(m => m.SpringSuiSyOperations));
        this.providerRegistry.set("Strater", () => import("./providers/StraterSyOperations").then(m => m.StraterSyOperations));
        this.providerRegistry.set("Haedal", () => import("./providers/HaedalSyOperations").then(m => m.HaedalSyOperations));
        this.providerRegistry.set("AlphaFi", () => import("./providers/AlphaFiSyOperations").then(m => m.AlphaFiSyOperations));
        this.providerRegistry.set("Mstable", () => import("./providers/MstableSyOperations").then(m => m.MstableSyOperations));
        this.providerRegistry.set("Aftermath", () => import("./providers/AftermathSyOperations").then(m => m.AftermathSyOperations));
        this.providerRegistry.set("Cetus", () => import("./providers/CetusSyOperations").then(m => m.CetusSyOperations));
    }

    /**
     * Create a provider instance with lazy loading
     */
    static async create(tx: Transaction, config: SyConfig): Promise<SyProviderInterface> {
        const loader = this.providerRegistry.get(config.provider);

        if (!loader) {
            const availableProviders = Array.from(this.providerRegistry.keys()).join(', ');
            throw createSyConfigurationError({
                message: `Unsupported SY provider: ${config.provider}. Available providers: ${availableProviders}`,
                provider: config.provider
            });
        }

        try {
            // Check if provider is already loaded
            let ProviderClass = this.loadedProviders.get(config.provider);

            if (!ProviderClass) {
                // Load the provider dynamically
                ProviderClass = await loader();
                this.loadedProviders.set(config.provider, ProviderClass);
            }

            return new ProviderClass(tx, config);
        } catch (error) {
            throw createSyConfigurationError({
                message: `Failed to create ${config.provider} provider: ${error instanceof Error ? error.message : String(error)}`,
                provider: config.provider
            });
        }
    }

    /**
     * Synchronous create method for backward compatibility (loads all providers upfront)
     */
    static createSync(tx: Transaction, config: SyConfig): SyProviderInterface {
        // Import all providers synchronously for backward compatibility
        const ScallopSyOperations = require("./providers/ScallopSyOperations").ScallopSyOperations;
        const VoloSyOperations = require("./providers/VoloSyOperations").VoloSyOperations;
        const WinterSyOperations = require("./providers/WinterSyOperations").WinterSyOperations;
        const SpringSuiSyOperations = require("./providers/SpringSuiSyOperations").SpringSuiSyOperations;
        const StraterSyOperations = require("./providers/StraterSyOperations").StraterSyOperations;
        const HaedalSyOperations = require("./providers/HaedalSyOperations").HaedalSyOperations;
        const AlphaFiSyOperations = require("./providers/AlphaFiSyOperations").AlphaFiSyOperations;
        const MstableSyOperations = require("./providers/MstableSyOperations").MstableSyOperations;
        const AftermathSyOperations = require("./providers/AftermathSyOperations").AftermathSyOperations;
        const CetusSyOperations = require("./providers/CetusSyOperations").CetusSyOperations;

        const providerMap: Record<SyProvider, new (tx: Transaction, config: SyConfig) => SyProviderInterface> = {
            "Scallop": ScallopSyOperations,
            "Volo": VoloSyOperations,
            "Winter": WinterSyOperations,
            "SpringSui": SpringSuiSyOperations,
            "Strater": StraterSyOperations,
            "Haedal": HaedalSyOperations,
            "AlphaFi": AlphaFiSyOperations,
            "Mstable": MstableSyOperations,
            "Aftermath": AftermathSyOperations,
            "Cetus": CetusSyOperations
        };

        const ProviderClass = providerMap[config.provider];

        if (!ProviderClass) {
            const availableProviders = Object.keys(providerMap).join(', ');
            throw createSyConfigurationError({
                message: `Unsupported SY provider: ${config.provider}. Available providers: ${availableProviders}`,
                provider: config.provider
            });
        }

        try {
            return new ProviderClass(tx, config);
        } catch (error) {
            throw createSyConfigurationError({
                message: `Failed to create ${config.provider} provider: ${error instanceof Error ? error.message : String(error)}`,
                provider: config.provider
            });
        }
    }

    /**
     * Check if a provider is supported
     */
    static isProviderSupported(provider: SyProvider): boolean {
        return this.providerRegistry.has(provider);
    }

    /**
     * Get list of supported providers
     */
    static getSupportedProviders(): SyProvider[] {
        return Array.from(this.providerRegistry.keys());
    }

    /**
     * Register a new provider implementation
     */
    static registerProvider(provider: SyProvider, implementationClass: any): void {
        this.providerRegistry.set(provider, implementationClass);
    }

    /**
     * Get provider information without creating an instance
     */
    static getProviderInfo(provider: SyProvider): {
        provider: SyProvider;
        available: boolean;
        description: string;
        features: string[];
    } {
        const isSupported = this.isProviderSupported(provider);

        // Provider-specific information
        const providerInfoMap: Record<SyProvider, any> = {
            "Scallop": {
                description: "Scallop lending protocol with multi-token SCoin support",
                features: ["mint", "burn", "multi-token", "treasury-based"]
            },
            "Volo": {
                description: "Volo liquid staking protocol for SUI",
                features: ["mint", "burn", "staking", "sui-native", "low-gas"]
            },
            "Winter": {
                description: "Winter protocol with Walrus staking integration",
                features: ["mint", "burn", "staking", "walrus-integration", "multi-token"]
            },
            "SpringSui": {
                description: "SpringSui liquid staking protocol with spring mechanics",
                features: ["mint", "burn", "staking", "spring-mechanics", "multi-token"]
            },
            "Strater": {
                description: "Strater liquid staking solution",
                features: ["mint", "burn", "staking"]
            },
            "Haedal": {
                description: "Haedal liquid staking platform",
                features: ["mint", "burn", "staking"]
            },
            "AlphaFi": {
                description: "AlphaFi yield optimization protocol",
                features: ["mint", "burn", "yield-optimization"]
            },
            "Mstable": {
                description: "Mstable meta-asset protocol",
                features: ["mint", "burn", "meta-assets"]
            },
            "Aftermath": {
                description: "Aftermath DEX and yield farming",
                features: ["mint", "burn", "dex-integration"]
            },
            "Cetus": {
                description: "Cetus concentrated liquidity protocol",
                features: ["mint", "burn", "concentrated-liquidity"]
            }
        };

        return {
            provider,
            available: isSupported,
            description: providerInfoMap[provider]?.description || `${provider} SY provider`,
            features: providerInfoMap[provider]?.features || ["mint", "burn"]
        };
    }

    /**
     * Get provider recommendations based on requirements
     */
    static recommendProvider(requirements: {
        needsStaking?: boolean;
        needsMultiToken?: boolean;
        preferLowGas?: boolean;
        coinType?: string;
    }): {
        recommended: SyProvider[];
        reasons: Record<SyProvider, string[]>;
    } {
        const supportedProviders = this.getSupportedProviders();
        const recommended: SyProvider[] = [];
        const reasons: Record<SyProvider, string[]> = {} as any;

        for (const provider of supportedProviders) {
            const info = this.getProviderInfo(provider);
            const providerReasons: string[] = [];

            // Check staking requirement
            if (requirements.needsStaking && info.features.includes("staking")) {
                providerReasons.push("Supports staking");
            } else if (requirements.needsStaking && !info.features.includes("staking")) {
                continue; // Skip providers that don't support required features
            }

            // Check multi-token requirement
            if (requirements.needsMultiToken && info.features.includes("multi-token")) {
                providerReasons.push("Supports multiple tokens");
            }

            // Gas efficiency preferences
            if (requirements.preferLowGas) {
                if (info.features.includes("low-gas")) {
                    providerReasons.push("Optimized for low gas usage");
                } else if (["Volo", "SpringSui"].includes(provider)) {
                    providerReasons.push("Generally lower gas costs");
                }
            }

            // Token-specific recommendations
            if (requirements.coinType) {
                // Basic heuristics - would implement actual token checking
                if (requirements.coinType.includes("::sui::") && ["Volo", "SpringSui"].includes(provider)) {
                    providerReasons.push("Optimized for SUI-based tokens");
                } else if (requirements.coinType.includes("wormhole") && provider === "Scallop") {
                    providerReasons.push("Good support for cross-chain tokens");
                } else if (requirements.coinType.includes("::w") && provider === "Winter") {
                    providerReasons.push("Specialized for Walrus ecosystem tokens");
                }
            }

            if (providerReasons.length > 0 || Object.keys(requirements).length === 0) {
                recommended.push(provider);
                reasons[provider] = providerReasons.length > 0 ? providerReasons : ["General purpose provider"];
            }
        }

        // Sort by relevance (more reasons = higher priority)
        recommended.sort((a, b) => (reasons[b]?.length || 0) - (reasons[a]?.length || 0));

        return { recommended, reasons };
    }

    /**
     * Batch create multiple providers
     */
    static async createMultiple(
        tx: Transaction,
        configs: SyConfig[]
    ): Promise<Map<SyProvider, SyProviderInterface>> {
        const providers = new Map<SyProvider, SyProviderInterface>();

        for (const config of configs) {
            try {
                const provider = await this.create(tx, config);
                providers.set(config.provider, provider);
            } catch (error) {
                console.warn(`Failed to create provider ${config.provider}:`, error);
                // Continue with other providers
            }
        }

        return providers;
    }

    /**
     * Get implementation status for all providers
     */
    static getImplementationStatus(): Record<SyProvider, {
        implemented: boolean;
        description: string;
        priority: 'high' | 'medium' | 'low';
        complexity: 'low' | 'medium' | 'high';
    }> {
        const allProviders: SyProvider[] = [
            "Scallop", "Volo", "Winter", "SpringSui",
            "Strater", "Haedal", "AlphaFi", "Mstable", "Aftermath", "Cetus"
        ];

        const status: any = {};

        for (const provider of allProviders) {
            const implemented = this.isProviderSupported(provider);
            const info = this.getProviderInfo(provider);

            status[provider] = {
                implemented,
                description: info.description,
                priority: implemented ? 'high' : this.getProviderPriority(provider),
                complexity: this.getProviderComplexity(provider)
            };
        }

        return status;
    }

    private static getProviderPriority(provider: SyProvider): 'high' | 'medium' | 'low' {
        const highPriority = ["Strater", "Haedal"]; // Popular liquid staking
        const mediumPriority = ["AlphaFi", "Mstable"]; // DeFi protocols
        const lowPriority = ["Aftermath", "Cetus"]; // DEX-related

        if (highPriority.includes(provider)) return 'high';
        if (mediumPriority.includes(provider)) return 'medium';
        if (lowPriority.includes(provider)) return 'low';
        return 'low'; // Default to low priority
    }

    private static getProviderComplexity(provider: SyProvider): 'low' | 'medium' | 'high' {
        const lowComplexity = ["Strater", "Haedal"]; // Simple staking patterns
        const highComplexity = ["Aftermath", "Cetus"]; // Complex DEX mechanics

        if (lowComplexity.includes(provider)) return 'low';
        if (highComplexity.includes(provider)) return 'high';
        return 'medium';
    }
} 