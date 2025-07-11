export interface RedeemSyCoinConfig {
  nemoContractId: string;
  version: string;
  coinType: string;
  syStateId: string;
  syCoinType: string;
}

export interface RedeemInterestConfig {
  nemoContractId: string;
  version: string;
  pyStateId: string;
  yieldFactoryConfigId: string;
  syCoinType: string;
}
