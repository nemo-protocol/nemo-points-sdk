import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { UNSTAKE_TARGET, STAKE_POOL, METADATA, SUI_SYSTEM_STATE, NATIVE_POOL } from "./constants";

type BurnSCoinParams<T extends boolean = false> = {
  debug?: T;
  tx: Transaction;
  address: string;
  config: CoinConfig;
  sCoin: TransactionObjectArgument;
};

type BurnSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

export const burnSCoin = async <T extends boolean = false>({
  tx,
  sCoin,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  const mintTicketMoveCall = {
    target: UNSTAKE_TARGET,
    arguments: [
      { name: "stake_pool", value: STAKE_POOL },
      { name: "metadata", value: METADATA },
      { name: "sui_system_state", value: SUI_SYSTEM_STATE },
      { name: "s_coin", value: sCoin },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(mintTicketMoveCall);

  const [coin] = tx.moveCall({
    target: mintTicketMoveCall.target,
    arguments: [
      tx.object(NATIVE_POOL),
      tx.object(METADATA),
      tx.object(SUI_SYSTEM_STATE),
      sCoin,
    ],
    typeArguments: mintTicketMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 