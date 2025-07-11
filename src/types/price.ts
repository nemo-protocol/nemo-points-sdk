/**
 * Price configuration interface for price-related operations
 */
export interface GetPriceConfig {
  /**
   * Nemo contract ID
   */
  nemoContractId: string;

  /**
   * Oracle package ID
   */
  oraclePackageId: string;
  
  /**
   * Version identifier
   */
  version: string;
  
  /**
   * PY state ID
   */
  pyStateId: string;
  
  /**
   * Yield factory config ID
   */
  yieldFactoryConfigId: string;
  
  /**
   * SY coin type
   */
  syCoinType: string;
  
  /**
   * Coin type
   */
  coinType: string;
  
  /**
   * Decimal places for the coin
   */
  decimal: string;
  
  /**
   * Market state ID
   */
  marketStateId: string;

  /**
   * Provider type (SpringSui, Winter, etc.)
   */
  provider: string;

  /**
   * Price oracle config ID
   */
  priceOracleConfigId: string;

  /**
   * Oracle ticket
   */
  oracleTicket: string;

  /**
   * SY state ID
   */
  syStateId: string;

  /**
   * Yield token type
   */
  yieldTokenType?: string;

  /**
   * Provider version
   */
  providerVersion?: string;

  /**
   * Provider market
   */
  providerMarket?: string;

  /**
   * Underlying coin type
   */
  underlyingCoinType: string;
}
