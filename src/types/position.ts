import type { CoinConfig } from "@/types/coin";
import type { GetPriceConfig } from "./price";
import { Transaction } from "@mysten/sui/transactions";

export interface LpPositionRaw {
  name: string;
  expiry: string;
  lp_amount: string;
  id: { id: string };
  description: string;
  market_state_id: string;
}

// 转换后的小驼峰命名类型
export interface LpPosition {
  name: string;
  expiry: string;
  lpAmount: string;
  id: { id: string };
  description: string;
  marketStateId: string;
}

// 原始返回的蛇形命名类型
export interface PyPositionRaw {
  expiry: string;
  id: { id: string };
  pt_balance: string;
  yt_balance: string;
  py_state_id: string;
}

export interface PyPosition {
  id: string;
  maturity: string;
  ptBalance: string;
  ytBalance: string;
  pyStateId: string;
}

interface InitPyPositionConfig {
  version: string;
  coinType: string;
  pyStateId: string;
  syCoinType: string;
  nemoContractId: string;
}

export interface InitPyPositionParams<T extends boolean = false> {
  tx: Transaction;
  returnDebugInfo?: T;
  config: InitPyPositionConfig;
  pyPositions?: { id: string }[];
}

export interface QueryYieldParams {
  address: string;
  ytBalance: string;
  pyPositions?: PyPosition[];
  receivingType?: "sy" | "underlying";
  config: InitPyPositionConfig & GetPriceConfig & CoinConfig;
}
