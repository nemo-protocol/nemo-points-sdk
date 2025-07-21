// ================================
// MODERN OOP API - MAIN EXPORTS
// ================================

// Market Operations - Export main classes
export {
    Market,
    LiquidityOperations,
    PositionOperations,
    RedemptionOperations,
    RewardsOperations
} from "./core/market";
export type { MarketConfig, OperationOptions, OperationResult } from "./core/market/base/MarketOperations";

// Core Manager Classes
export { OracleManager } from "./core/oracle/OracleManager"; // Single export - fixed duplicate
export { PyManager } from "./core/py/PyManager";
export { SyManager } from "./core/sy/SyManager";

// ================================
// OPERATION CLASSES
// ================================

// PY Operations  
export {
    PyPositionOperations,
    PyYieldOperations,
    PyQueryOperations
} from "./core/py";

// SY Operations
export {
    SyProviderFactory,
    ScallopSyOperations,
    VoloSyOperations,
    WinterSyOperations,
    SpringSuiSyOperations,
    StraterSyOperations,
    HaedalSyOperations,
    AlphaFiSyOperations,
    MstableSyOperations,
    AftermathSyOperations,
    CetusSyOperations
} from "./core/sy";

// Oracle Providers
export {
    SpringSuiProvider as OracleSpringSuiProvider,
    HaedalProvider as OracleHaedalProvider,
    ScallopProvider as OracleScallopProvider,
    BuckProvider as OracleBuckProvider,
    VoloProvider as OracleVoloProvider,
    AftermathProvider as OracleAftermathProvider,
    AlphaFiProvider as OracleAlphaFiProvider,
    StraterProvider as OracleStraterProvider,
    MstableProvider as OracleMstableProvider
} from "./core/oracle";

// ================================
// QUERY OPERATIONS
// ================================

// API Queries
export { PoolQuery } from "./api/PoolQuery";

// Position Queries (Distributed)
export { PyPositionQuery } from "./core/py";

// ================================
// TYPES & INTERFACES
// ================================

// Configuration Types
export type { OracleConfig, OracleOperationOptions, OracleOperationResult } from "./core/oracle/base/OracleOperations";
export type { PyConfig, PyOperationOptions, PyOperationResult } from "./core/py/base/PyOperations";
export type { SyConfig, SyOperationOptions, SyOperationResult, SyProvider, SyMintParams, SyBurnParams } from "./core/sy";

// Position and Data Types
export type { PyPosition, InitPyPositionResult } from "./core/py/PyPositionOperations";
export type { QueryYieldParams, QueryYieldResult } from "./core/py/PyQueryOperations";
export type { LpPosition } from "./types/position";

// API and Core Types
export type { CoinConfig, CoinData, MarketState, MoveCallInfo, DebugInfo, ContractError } from "./api/types";
export type * from "./types/coin";
export type * from "./types/lp";
export type * from "./types/position";
export type * from "./types/price";
export type * from "./types/redeem";
export type * from "./types/rewards";

// ================================
// UTILITY FUNCTIONS
// ================================

// Workflow Utilities
export {
    isMarketExpired,
    getTimeToMaturity,
    getOptimalPtAction,
    validateLiquidityParams,
    calculateEstimatedSlippage,
    formatLiquidityAmount,
    getOptimalReceivingType,
    calculateMinAmounts
} from "./utils/liquidityWorkflows";

// GraphQL Utilities
export {
    queryGraphQLWithPagination,
    getGraphQLEndpoint,
    GraphQLQueries,
    filterPositionNodes
} from "./utils/graphqlQueries";
export type {
    GraphQLQueryConfig,
    GraphQLPaginationResult
} from "./utils/graphqlQueries";

// Coin Operation Utilities
export {
    splitCoinHelper,
    depositSyCoin,
    getCoinValue,
    mintMultiSCoin,
    burnSCoin,
    calculateTotalAmount,
    validateCoinOperation,
    SUPPORTED_PROVIDERS
} from "./utils/coinOperations";
export type {
    CoinSplitOptions,
    ProviderMintOptions,
    MintSCoinResult,
    SupportedProvider
} from "./utils/coinOperations";

// SY Utilities and Constants
export {
    SY_PROVIDERS,
    createSyProviderError,
    createSyConfigurationError,
    createSyManager,
    recommendProvider,
    getProviderInfo,
    isProviderSupported,
    getSupportedProviders
} from "./core/sy";

// SY Provider Creation Shortcuts
export {
    createScallopProvider,
    createVoloProvider,
    createWinterProvider,
    createSpringSuiProvider,
    createStraterProvider,
    createHaedalProvider,
    createAlphaFiProvider,
    createMstableProvider,
    createAftermathProvider,
    createCetusProvider
} from "./core/sy";