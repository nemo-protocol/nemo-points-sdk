import type { MoveCallInfo } from "@/types";
import type { ClaimRewardConfig } from "@/types/rewards";
import { Transaction } from "@mysten/sui/transactions";
import type { TransactionResult, TransactionObjectArgument } from "@mysten/sui/transactions";

export const claimReward = <T extends boolean = false>(
  tx: Transaction,
  config: ClaimRewardConfig,
  lpPosition: TransactionObjectArgument,
  syCoinType: string,
  coinType: string,
  returnDebugInfo?: T
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${config.nemoContractId}::market::claim_reward`,
    arguments: [
      { name: "version", value: config.version },
      { name: "market_state", value: config.marketStateId },
      { name: "lp_position", value: lpPosition },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [syCoinType, coinType],
  };

  const result = tx.moveCall({
    target: debugInfo.target,
    arguments: [
      tx.object(config.version),
      tx.object(config.marketStateId),
      lpPosition,
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  });

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult;
};
