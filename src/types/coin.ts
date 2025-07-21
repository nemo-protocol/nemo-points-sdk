/**
 * Coin configuration interface for mint/burn operations
 */
export interface CoinConfig {
  /**
   * Nemo contract ID
   */
  nemoContractId: string;

  /**
   * Version identifier
   */
  version: string;

  /**
   * PY state ID
   */
  pyStateId: string;

  /**
   * SY coin type
   */
  syCoinType: string;

  /**
   * Yield factory config ID
   */
  yieldFactoryConfigId: string;

  /**
   * Coin type
   */
  coinType: string;

  /**
   * Market state ID
   */
  marketStateId: string;

  /**
   * Underlying coin type
   */
  underlyingCoinType: string;

  /**
   * Underlying protocol (Scallop, Strater, Aftermath, SpringSui, Volo, Haedal, AlphaFi, Mstable, Winter, Cetus)
   */
  underlyingProtocol: string;

  /**
   * Provider type (Winter, etc.)
   */
  provider?: string;

  /**
   * Market maturity timestamp (optional)
   */
  maturity?: string;
}
