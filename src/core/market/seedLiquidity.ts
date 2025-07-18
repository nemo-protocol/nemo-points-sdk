import type { MoveCallInfo } from "@/api/types";

import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

export interface SeedLiquidityConfig {
  nemoContractId: string;
  version: string;
  pyStateId: string;
  yieldFactoryConfigId: string;
  marketStateId: string;
  syCoinType: string;
}

export const seedLiquidity = <T extends boolean = false>(
  tx: Transaction,
  config: SeedLiquidityConfig,
  syCoin: TransactionObjectArgument,
  minLpAmount: string,
  priceVoucher: TransactionObjectArgument,
  pyPosition: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionObjectArgument, MoveCallInfo] : TransactionObjectArgument => {
  const moveCallInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::market::seed_liquidity`,
    arguments: [
      { name: "version", value: config.version },
      { name: "sy_coin", value: "syCoin" },
      { name: "min_lp_amount", value: minLpAmount },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: config.pyStateId },
      { name: "yield_factory_config", value: config.yieldFactoryConfigId },
      { name: "market_state", value: config.marketStateId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [config.syCoinType],
  };

  const [lp] = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [
      tx.object(config.version),
      syCoin,
      tx.pure.u64(minLpAmount),
      priceVoucher,
      pyPosition,
      tx.object(config.pyStateId),
      tx.object(config.yieldFactoryConfigId),
      tx.object(config.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: moveCallInfo.typeArguments,
  });

  return (returnDebugInfo ? [lp, moveCallInfo] : lp) as unknown as T extends true
    ? [TransactionObjectArgument, MoveCallInfo]
    : TransactionObjectArgument;
}; 