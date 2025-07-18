import type { MoveCallInfo } from "@/api/types";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

export interface AddLiquiditySingleSyConfig {
  nemoContractId: string;
  version: string;
  pyStateId: string;
  marketFactoryConfigId: string;
  marketStateId: string;
  syCoinType: string;
}

export const handleAddLiquiditySingleSy = <T extends boolean = false>(
  tx: Transaction,
  config: AddLiquiditySingleSyConfig,
  syCoin: TransactionObjectArgument,
  ptValue: string,
  minLpAmount: string,
  priceVoucher: TransactionObjectArgument,
  pyPosition: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionObjectArgument, MoveCallInfo] : TransactionObjectArgument => {
  const moveCallInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::router::add_liquidity_single_sy`,
    arguments: [
      { name: "version", value: config.version },
      { name: "sy_coin", value: "syCoin" },
      { name: "pt_value", value: ptValue },
      { name: "min_lp_amount", value: minLpAmount },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: config.pyStateId },
      {
        name: "market_factory_config",
        value: config.marketFactoryConfigId,
      },
      { name: "market_state", value: config.marketStateId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [config.syCoinType],
  };

  const result = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [
      tx.object(config.version),
      syCoin,
      tx.pure.u64(ptValue),
      tx.pure.u64(minLpAmount),
      priceVoucher,
      pyPosition,
      tx.object(config.pyStateId),
      tx.object(config.marketFactoryConfigId),
      tx.object(config.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: moveCallInfo.typeArguments,
  });

  return (returnDebugInfo ? [result, moveCallInfo] : result) as unknown as T extends true
    ? [TransactionObjectArgument, MoveCallInfo]
    : TransactionObjectArgument;
}; 