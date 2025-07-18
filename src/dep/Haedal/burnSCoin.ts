import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { HAWAL_COIN_TYPE, UNSTAKE_TARGET, SUI_SYSTEM_STATE, HAEDAL_STAKING_ID } from "./constants";

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
  config,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  // Check if it's HAWAL coin type
  if (config.coinType === HAWAL_COIN_TYPE) {
    throw new Error("Underlying protocol error, try to withdraw to HAWAL.");
  } else {
    // Original HASUI handling logic
    const unstakeMoveCall = {
      target: UNSTAKE_TARGET,
      arguments: [
        { name: "sui_system_state", value: SUI_SYSTEM_STATE },
        { name: "staking", value: HAEDAL_STAKING_ID },
        { name: "s_coin", value: "sCoin" },
      ],
      typeArguments: [],
    };
    moveCallInfos.push(unstakeMoveCall);

    const [coin] = tx.moveCall({
      target: unstakeMoveCall.target,
      arguments: [
        tx.object(SUI_SYSTEM_STATE),
        tx.object(HAEDAL_STAKING_ID),
        sCoin,
      ],
      typeArguments: unstakeMoveCall.typeArguments,
    });

    return (debug
      ? [coin, moveCallInfos]
      : coin) as unknown as BurnSCoinResult<T>;
  }
}; 