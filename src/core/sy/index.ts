/**
 * SY (Synthetic Yield) Operations Module
 * Provides unified interface for synthetic yield token operations across multiple providers
 */

// Import classes for internal use
import { SyManager } from "./SyManager";
import { SyProviderFactory } from "./SyProviderFactory";

// Core Classes
export { SyManager } from "./SyManager";
export { SyProviderFactory } from "./SyProviderFactory";

// Base Classes
export { SyOperations } from "./base/SyOperations";

// All Provider Implementations
export { ScallopSyOperations } from "./providers/ScallopSyOperations";
export { VoloSyOperations } from "./providers/VoloSyOperations";
export { WinterSyOperations } from "./providers/WinterSyOperations";
export { SpringSuiSyOperations } from "./providers/SpringSuiSyOperations";
export { StraterSyOperations } from "./providers/StraterSyOperations";
export { HaedalSyOperations } from "./providers/HaedalSyOperations";
export { AlphaFiSyOperations } from "./providers/AlphaFiSyOperations";
export { MstableSyOperations } from "./providers/MstableSyOperations";
export { AftermathSyOperations } from "./providers/AftermathSyOperations";
export { CetusSyOperations } from "./providers/CetusSyOperations";

// Types and Interfaces
export type {
    SyProvider,
    SyConfig,
    SyOperationOptions,
    SyOperationResult,
    SyMintParams,
    SyBurnParams,
    ProviderConstants,
    SyProviderInterface,
    SyDepositWorkflowParams,
    SyAnalytics,
    SyProviderCapabilities,
    SyTokenMetadata
} from "./types";

export {
    SY_PROVIDERS,
    createSyProviderError,
    createSyConfigurationError
} from "./types";

// Utility Functions
export const SyUtils = {
    /**
     * Create SY manager with single provider
     */
    createSingleProvider: (tx: any, config: any) => {
        const manager = new SyManager(tx);
        manager.addProvider(config);
        return manager;
    },

    /**
     * Get provider recommendations
     */
    recommendProvider: SyProviderFactory.recommendProvider,

    /**
     * Get provider information
     */
    getProviderInfo: SyProviderFactory.getProviderInfo,

    /**
     * Check if provider is supported
     */
    isProviderSupported: SyProviderFactory.isProviderSupported,

    /**
     * Get all supported providers
     */
    getSupportedProviders: SyProviderFactory.getSupportedProviders,

    /**
     * Get implementation status for all providers
     */
    getImplementationStatus: SyProviderFactory.getImplementationStatus
};

// Re-export factory methods for convenience
export const {
    recommendProvider,
    getProviderInfo,
    isProviderSupported,
    getSupportedProviders
} = SyProviderFactory;

/**
 * Main SY module interface - simplified API for common use cases
 */
export class Sy {
    /**
     * Create SY manager
     */
    static createManager(tx: any, configs?: any[]): SyManager {
        if (configs && configs.length > 0) {
            return SyManager.create(tx, configs);
        }
        return new SyManager(tx);
    }

    /**
     * Quick mint operation
     */
    static async mint(params: {
        tx: any;
        provider: any;
        config: any;
        coin: any;
        amount: string;
        options?: any;
    }) {
        const manager = new SyManager(params.tx);
        manager.addProvider(params.config);
        return manager.mintSCoin({
            provider: params.provider,
            coin: params.coin,
            amount: params.amount,
            options: params.options
        });
    }

    /**
     * Quick burn operation
     */
    static async burn(params: {
        tx: any;
        provider: any;
        config: any;
        sCoin: any;
        address: string;
        options?: any;
    }) {
        const manager = new SyManager(params.tx);
        manager.addProvider(params.config);
        return manager.burnSCoin({
            provider: params.provider,
            sCoin: params.sCoin,
            address: params.address,
            options: params.options
        });
    }

    /**
     * Compare providers for specific token and operation
     */
    static compareProviders(tx: any, configs: any[], operation: 'mint' | 'burn', coinType: string) {
        const manager = SyManager.create(tx, configs);
        return manager.compareProviders(operation, coinType);
    }

    /**
     * Find optimal provider
     */
    static findOptimalProvider(tx: any, configs: any[], requirements: {
        coinType: string;
        operation: 'mint' | 'burn';
        preferLowGas?: boolean;
        needsStaking?: boolean;
    }) {
        const manager = SyManager.create(tx, configs);
        return manager.findOptimalProvider(requirements);
    }

    /**
     * Get all provider implementation status
     */
    static getProviderStatus() {
        return SyProviderFactory.getImplementationStatus();
    }

    /**
     * Create provider-specific manager
     */
    static createProviderManager(tx: any, provider: any, config: any) {
        const manager = new SyManager(tx);
        manager.addProvider({ ...config, provider });
        return manager;
    }
}

// Legacy compatibility exports (maintain backward compatibility)
export const createSyManager = Sy.createManager;
export const mintSCoin = Sy.mint;
export const burnSCoin = Sy.burn;

// Provider-specific shortcuts for convenience
export const SyProviders = {
    Scallop: "Scallop" as const,
    Volo: "Volo" as const,
    Winter: "Winter" as const,
    SpringSui: "SpringSui" as const,
    Strater: "Strater" as const,
    Haedal: "Haedal" as const,
    AlphaFi: "AlphaFi" as const,
    Mstable: "Mstable" as const,
    Aftermath: "Aftermath" as const,
    Cetus: "Cetus" as const,
};

/**
 * Quick provider creation helpers
 */
export const createScallopProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Scallop" });

export const createVoloProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Volo" });

export const createWinterProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Winter" });

export const createSpringSuiProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "SpringSui" });

export const createStraterProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Strater" });

export const createHaedalProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Haedal" });

export const createAlphaFiProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "AlphaFi" });

export const createMstableProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Mstable" });

export const createAftermathProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Aftermath" });

export const createCetusProvider = (tx: any, config: any) =>
    SyProviderFactory.create(tx, { ...config, provider: "Cetus" }); 