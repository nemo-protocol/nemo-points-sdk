

export interface QueryOptions {
  address: string;
  positionTypes: string[];
  maturity?: string;
  marketStateId?: string;
  pyStateId?: string;
}

export type Network = "mainnet" | "testnet" | "devnet" | "localnet";

export interface PositionQueryConfig {
  /**
   * Network type, options: 'mainnet' | 'testnet' | 'devnet' | 'localnet'
   * Default is 'mainnet'
   */
  network?: Network;
  /**
   * Custom RPC URL, if specified, the network parameter will be ignored
   */
  rpcUrl?: string;
}

// Pool Query Types
export interface MarketState {
  marketCap: string;
  totalSy: string;
  lpSupply: string;
  totalPt: string;
  rewardMetrics: {
    tokenType: string;
    tokenLogo: string;
    dailyEmission: string;
    tokenPrice: string;
    tokenName?: string;
    decimal?: string;
  }[];
}

export interface Incentive {
  apy: string;
  tokenType: string;
  tokenLogo: string;
}

export interface PortfolioItem {
  id: string;
  tvl: string;
  tvlRateChange: string;
  coinLogo: string;
  maturity: string;
  startTime: string;
  coinName: string;
  coinType: string;
  ptTokenType: string;
  nemoContractId: string;
  boost: string;
  provider: string;
  providerLogo: string;
  cap: string;
  marketStateId: string;
  syCoinType: string;
  underlyingCoinType: string;
  providerMarket: string;
  providerVersion: string;
  priceOracleConfigId: string;
  decimal: string;
  underlyingApy: string;
  coinPrice: string;
  underlyingPrice: string;
  pyStateId: string;
  syStateId: string;
  conversionRate: string;
  marketFactoryConfigId: string;
  swapFeeForLpHolder: string;
  underlyingCoinName: string;
  underlyingCoinLogo: string;
  version: string;
  perPoints: string;
  oraclePackageId: string;
  oracleTicket: string;
  oracleVoucherPackageId: string;
  yieldTokenType: string;
  tokenRegistryState: string;
  ptPrice: string;
  ptTvl: string;
  syTvl: string;
  marketState: MarketState;
  scaledPtApy: string;
  scaledUnderlyingApy: string;
  feeApy: string;
  sevenAvgUnderlyingApy: string;
  sevenAvgUnderlyingApyRateChange: string;
  ytPrice: string;
  lpPrice: string;
  ytTokenLogo: string;
  ptTokenLogo: string;
  lpTokenLogo: string;
  ytReward: string;
  underlyingProtocol: string;
  yieldFactoryConfigId: string;
  pyPositionTypeList: string[];
  marketPositionTypeList: string[];
  lpPriceRateChange: string;
  ptPriceRateChange: string;
  ytPriceRateChange: string;
  incentiveApy: string;
  incentives: Incentive[];
  poolApy: string;
  tradeStatus: string;
}

export interface PoolQueryConfig {
  /**
   * API base URL, 例如: "https://api.nemo.com"
   * 如果不提供，需要在使用方手动设置
   */
  baseUrl?: string;
}

export interface CoinData {
  coinType: string;
  coinObjectId: string;
  version: string;
  previousTransaction: string;
  balance: string;
}

export interface RewardMetric {
  tokenType: string;
  syCoinType: string;
  tokenLogo: string;
  dailyEmission: string;
  tokenPrice: string;
  tokenName?: string;
  decimal?: string;
}

export interface DebugInfo {
  moveCall: any[];
  rawResult: any;
  parsedOutput?: any;
}

export class ContractError extends Error {
  debugInfo: DebugInfo;

  constructor(message: string, debugInfo: DebugInfo) {
    super(message);
    this.name = "ContractError";
    this.debugInfo = debugInfo;
  }
}

// MarketState 映射类型
export type MarketStateMap = Record<string, MarketState>;

export interface MoveCallInfo {
  target: string;
  arguments: {
    name: string;
    value: string | any;
  }[];
  typeArguments: string[];
}

// FIXME: optimize this
export interface BaseCoinInfo {
  id: string
  tvl: string
  tvlRateChange: string
  coinLogo: string
  maturity: string
  startTime: string
  coinName: string
  coinType: string
  ptTokenType: string
  nemoContractId: string
  boost: string
  provider: string
  providerLogo: string
  cap: string
  marketStateId: string
  syCoinType: string
  underlyingCoinType: string
  providerMarket: string
  providerVersion: string
  priceOracleConfigId: string
  decimal: string
  underlyingApy: string
  coinPrice: string
  underlyingPrice: string
  pyStateId: string
  syStateId: string
  conversionRate: string
  marketFactoryConfigId: string
  swapFeeForLpHolder: string
  underlyingCoinName: string
  underlyingCoinLogo: string
  version: string
  perPoints: string
  oraclePackageId: string
  oracleTicket: string
  oracleVoucherPackageId: string
  yieldTokenType: string
  tokenRegistryState: string
  ptPrice: string
  ptTvl: string
  syTvl: string
  marketState: MarketState
  scaledPtApy: string
  scaledUnderlyingApy: string
  feeApy: string
  sevenAvgUnderlyingApy: string
  sevenAvgUnderlyingApyRateChange: string
  ytPrice: string
}

interface BuiltOn {
  name: string
  logo: string
  url: string
}

export interface CoinConfig extends BaseCoinInfo {
  vaultId: string | undefined
  marketAddress: string | null | undefined
  ptAddress: string | null | undefined
  ytAddress: string | null | undefined
  assetAddress: string | null | undefined
  marketIntro: string
  PtAddress: string | null | undefined
  poolApyRateChange: string
  poolApy: string
  yieldApyRateChange: string
  yieldApy: string
  fixedApyRateChange: string
  fixedApy: string
  volume: string
  volumeRateChange: string
  liquidity: string
  liquidityRateChange: string
  pyStoreId: string
  pyPosition: string
  pyPositionType: string
  pyPositionTypeList: string[]
  marketPosition: string
  marketPositionType: string
  marketPositionTypeList: string[]
  nemoContractIdList: string[]
  lpPrice: string
  coinPrice: string
  sevenAvgUnderlyingPtApy: string
  sevenAvgUnderlyingYtApy: string
  sevenAvgUnderlyingApy: string
  underlyingProtocol: string
  underlyingProtocolLogo: string
  swapFeeApy: string
  marketFactoryConfigId: string
  tradeFee: string
  feeRate: string
  yieldFactoryConfigId: string
  builtOn?: BuiltOn[]
  tradeStatus: string
  ptTokenLogo: string
  ytTokenLogo: string
  lpTokenLogo: string
  lpPriceRateChange: string
  ptPriceRateChange: string
  ytPriceRateChange: string
  incentiveApy: string
  incentives: Incentive[]
}

export interface CoinData {
  balance: string
  coinObjectId: string
}

export interface LpPosition {
  name: string;
  expiry: string;
  lp_amount: string;
  id: { id: string };
  description: string;
  marketStateId: string;
}
