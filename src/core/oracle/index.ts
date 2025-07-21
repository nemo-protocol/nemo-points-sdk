// Export Oracle Classes
export { OracleManager } from "./OracleManager";
export { OracleOperations, type OracleConfig, type OracleOperationOptions, type OracleOperationResult } from "./base/OracleOperations";

// Export all Oracle Providers
export { SpringSuiProvider } from "./providers/SpringSuiProvider";
export { HaedalProvider } from "./providers/HaedalProvider";
export { ScallopProvider } from "./providers/ScallopProvider";
export { BuckProvider } from "./providers/BuckProvider";
export { VoloProvider } from "./providers/VoloProvider";
export { AftermathProvider } from "./providers/AftermathProvider";
export { AlphaFiProvider } from "./providers/AlphaFiProvider";
export { StraterProvider } from "./providers/StraterProvider";
export { MstableProvider } from "./providers/MstableProvider";

import type { OracleConfig } from "./base/OracleOperations";

/**
 * Convert old GetPriceConfig to new OracleConfig format
 */
function convertToOracleConfig(config: GetPriceConfig): OracleConfig {
    return {
        oraclePackageId: config.oraclePackageId,
        priceOracleConfigId: config.priceOracleConfigId,
        oracleTicket: config.oracleTicket,
        syStateId: config.syStateId,
        syCoinType: config.syCoinType,
        coinType: config.coinType,
        provider: config.provider,
        yieldTokenType: config.yieldTokenType,
        underlyingCoinType: config.underlyingCoinType,
        providerVersion: config.providerVersion,
        providerMarket: config.providerMarket,
    };
}

/**
 * Convert CoinConfig to OracleConfig format
 */
function convertCoinConfigToOracleConfig(coinConfig: any): OracleConfig {
    return {
        oraclePackageId: coinConfig.nemoContractId,
        priceOracleConfigId: coinConfig.marketStateId,
        oracleTicket: coinConfig.pyStateId,
        syStateId: coinConfig.pyStateId,
        syCoinType: coinConfig.syCoinType,
        coinType: coinConfig.coinType,
        provider: coinConfig.provider,
        yieldTokenType: coinConfig.yieldTokenType,
        underlyingCoinType: coinConfig.underlyingCoinType,
        providerVersion: coinConfig.providerVersion,
        providerMarket: coinConfig.providerMarket,
    };