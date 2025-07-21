import type { TransactionObjectArgument } from "@mysten/sui/transactions";
import type { MoveCallInfo } from "../../api/types";

/**
 * SY (Synthetic Yield) Types and Interfaces
 * Defines types for provider-specific synthetic coin operations
 */

/**
 * Supported SY providers
 */
export const SY_PROVIDERS = [
    "Scallop",
    "Volo",
    "Winter",
    "Strater",
    "SpringSui",
    "Haedal",
    "AlphaFi",
    "Mstable",
    "Aftermath",
    "Cetus"
] as const;

export type SyProvider = typeof SY_PROVIDERS[number];

/**
 * SY operation configuration
 */
export interface SyConfig {
    provider: SyProvider;
    coinType: string;
    underlyingCoinType: string;
    nemoContractId: string;
    version: string;
    syStateId?: string;
    decimal?: string;

    // Provider-specific fields
    treasuryId?: string;
    stakePoolId?: string;
    marketObjectId?: string;
    metadataId?: string;
    allowedVersionsId?: string;

    // Additional provider-specific configurations
    [key: string]: any;
}

/**
 * SY operation options
 */
export interface SyOperationOptions {
    returnDebugInfo?: boolean;
    dryRun?: boolean;
}

/**
 * SY operation result
 */
export interface SyOperationResult<T> {
    result: T;
    debugInfo?: MoveCallInfo[];
    dryRunResult?: any;
}

/**
 * SY mint operation parameters
 */
export interface SyMintParams {
    coin: TransactionObjectArgument;
    amount: string;
    options?: SyOperationOptions;
}

/**
 * SY burn operation parameters
 */
export interface SyBurnParams {
    sCoin: TransactionObjectArgument;
    address: string;
    options?: SyOperationOptions;
}

/**
 * Provider-specific constants and configuration
 */
export interface ProviderConstants {
    // Common targets
    mintTarget?: string;
    burnTarget?: string;
    redeemTarget?: string;
    stakeTarget?: string;
    unstakeTarget?: string;

    // Common objects
    versionObject?: string;
    marketObject?: string;
    suiSystemState?: string;

    // Scallop-specific
    treasuryObject?: string;
    scallopMarketObject?: string;

    // Strater-specific
    intoBalanceTarget?: string;
    depositTarget?: string;
    fromBalanceTarget?: string;
    withdrawTarget?: string;
    redeemWithdrawTicketTarget?: string;
    bucketVault?: string;
    clockObject?: string;

    // Haedal-specific
    hawalStakingOne?: string;
    hawalStakingTwo?: string;
    hawalId?: string;
    haedalStakingId?: string;
    zeroAddress?: string;
    hasuiStakeTarget?: string;
    hawalStakeTarget?: string;
    hawalCoinType?: string;

    // AlphaFi-specific
    packageId?: string;
    liquidStakingInfo?: string;

    // Mstable-specific
    createDepositCapTarget?: string;
    createWithdrawCapTarget?: string;
    metaVaultSuiIntegration?: string;
    vault?: string;
    registry?: string;
    version?: string;
    amountLimit?: string;

    // Aftermath-specific
    requestStakeTarget?: string;
    requestUnstakeAtomicTarget?: string;
    stakedSuiVault?: string;
    safe?: string;
    referralVault?: string;
    treasury?: string;
    systemState?: string;
    validator?: string;

    // Cetus-specific
    vaultIdList?: Array<{ coinType: string, vaultId: string, poolId?: string }>;
    vaultConfig?: Array<{ coinType: string, vaultId: string, poolId: string }>;

    // Token mappings (for providers that support multiple tokens)
    sCoinMappings?: Array<{
        coinType: string;
        value?: string;  // General mapping value
        treasury?: string;  // Scallop-specific treasury
        poolId?: string;
        vaultId?: string;
    }>;

    // Utility functions
    getStakePool?: (coinType: string) => string;
    getVaultId?: (coinType: string) => string;
    getPoolId?: (coinType: string) => string;
}

/**
 * Provider capabilities and feature support
 */
export interface SyProviderCapabilities {
    supportsMint: boolean;
    supportsBurn: boolean;
    supportsStaking: boolean;
    supportedFeatures: string[];
}

/**
 * Gas estimation result
 */
export interface SyGasEstimate {
    estimated: number;
    complexity: 'low' | 'medium' | 'high' | 'unknown';
}

/**
 * Provider information and metadata
 */
export interface SyProviderInfo {
    provider: SyProvider;
    version: string;
    supportedOperations: string[];
    description: string;
}

/**
 * SY provider interface that all providers must implement
 */
export interface SyProviderInterface {
    readonly provider: SyProvider;
    readonly constants: ProviderConstants;

    mintSCoin(params: SyMintParams): Promise<SyOperationResult<TransactionObjectArgument>>;
    burnSCoin(params: SyBurnParams): Promise<SyOperationResult<TransactionObjectArgument>>;

    // Provider-specific validation
    validateConfig(config: SyConfig): void;
    supportsToken(coinType: string): boolean;

    // Provider capabilities and metadata
    getSupportedTokens(): string[];
    getCapabilities(): SyProviderCapabilities;
    getProviderInfo(): SyProviderInfo;
    estimateGas(operation: 'mint' | 'burn'): SyGasEstimate;
}

/**
 * SY deposit/redeem workflow parameters
 */
export interface SyDepositWorkflowParams {
    underlyingCoin: TransactionObjectArgument;
    amount: string;
    address: string;
    receivingType?: 'sy' | 'underlying';
    options?: SyOperationOptions;
}

/**
 * SY analytics data
 */
export interface SyAnalytics {
    provider: SyProvider;
    totalMinted: string;
    totalBurned: string;
    currentSupply: string;
    supportedTokens: string[];
    utilizationRate: string;
    apy?: string;
}

/**
 * Error types for SY operations
 */
export interface SyProviderErrorInfo {
    message: string;
    provider: SyProvider;
    operation: string;
    debugInfo?: any;
}

export interface SyConfigurationErrorInfo {
    message: string;
    provider: SyProvider;
}

/**
 * Error creation functions
 */
export function createSyProviderError(info: SyProviderErrorInfo): Error {
    const error = new Error(`[${info.provider}] ${info.operation}: ${info.message}`);
    error.name = 'SyProviderError';
    return error;
}

export function createSyConfigurationError(info: SyConfigurationErrorInfo): Error {
    const error = new Error(`[${info.provider}] Configuration Error: ${info.message}`);
    error.name = 'SyConfigurationError';
    return error;
}

/**
 * SY token metadata
 */
export interface SyTokenMetadata {
    coinType: string;
    underlyingCoinType: string;
    symbol: string;
    decimals: number;
    description?: string;
    iconUrl?: string;
    provider: SyProvider;
    isActive: boolean;

    // Provider-specific metadata
    treasuryId?: string;
    poolId?: string;
    apy?: string;
    tvl?: string;
} 