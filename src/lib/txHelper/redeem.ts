import type { MoveCallInfo } from "@/types";
import type { RedeemSyCoinConfig, RedeemInterestConfig } from "@/types/redeem";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionResult, TransactionObjectArgument } from "@mysten/sui/transactions";

export const redeemSyCoin = <T extends boolean = false>(
  tx: Transaction,
  config: RedeemSyCoinConfig,
  syCoin: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::sy::redeem`,
    arguments: [
      { name: "version", value: config.version },
      { name: "sy_coin", value: syCoin },
      { name: "sy_state", value: config.syStateId },
    ],
    typeArguments: [config.coinType, config.syCoinType],
  };

  const result = tx.moveCall({
    target: debugInfo.target,
    arguments: [tx.object(config.version), syCoin, tx.object(config.syStateId)],
    typeArguments: debugInfo.typeArguments,
  });

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult;
};

export const redeemInterest = <T extends boolean = false>(
  tx: Transaction,
  config: RedeemInterestConfig,
  pyPosition: TransactionObjectArgument,
  priceVoucher: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::yield_factory::redeem_due_interest`,
    arguments: [
      { name: "version", value: config.version },
      { name: "py_position", value: pyPosition },
      { name: "py_state", value: config.pyStateId },
      { name: "price_voucher", value: priceVoucher },
      { name: "yield_factory_config", value: config.yieldFactoryConfigId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [config.syCoinType],
  };

  const result = tx.moveCall({
    target: debugInfo.target,
    arguments: [
      tx.object(config.version),
      pyPosition,
      tx.object(config.pyStateId),
      priceVoucher,
      tx.object(config.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  });

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult;
};
