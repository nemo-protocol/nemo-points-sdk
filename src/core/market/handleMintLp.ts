import type { MoveCallInfo } from "@/api/types";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionObjectArgument } from "@mysten/sui/transactions";

export interface MintLpConfig {
  nemoContractId: string;
  version: string;
  pyStateId: string;
  marketStateId: string;
  syCoinType: string;
}

export const handleMintLp = <T extends boolean = false>(
  tx: Transaction,
  config: MintLpConfig,
  syCoin: TransactionObjectArgument,
  ptAmount: TransactionObjectArgument,
  minLpAmount: string,
  priceVoucher: TransactionObjectArgument,
  pyPosition: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionObjectArgument[], MoveCallInfo] : TransactionObjectArgument[] => {
  const moveCallInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::market::mint_lp`,
    arguments: [
      { name: "version", value: config.version },
      { name: "sy_coin", value: "syCoin" },
      { name: "pt_amount", value: "pt_amount" },
      { name: "min_lp_amount", value: minLpAmount },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: config.pyStateId },
      { name: "market_state", value: config.marketStateId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [config.syCoinType],
  };

  const [remainingSyCoin, marketPosition] = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [
      tx.object(config.version),
      syCoin,
      ptAmount,
      tx.pure.u64(minLpAmount),
      priceVoucher,
      pyPosition,
      tx.object(config.pyStateId),
      tx.object(config.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: moveCallInfo.typeArguments,
  });

  const result = [remainingSyCoin, marketPosition];
  return (returnDebugInfo ? [result, moveCallInfo] : result) as unknown as T extends true
    ? [TransactionObjectArgument[], MoveCallInfo]
    : TransactionObjectArgument[];
}; 