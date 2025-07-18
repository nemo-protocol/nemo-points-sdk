import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { HAWAL_COIN_TYPE, HAWAL_STAKE_TARGET, HAWAL_STAKING_1, HAWAL_STAKING_2, HAWAL_ID, HASUI_STAKE_TARGET, SUI_SYSTEM_STATE, HAEDAL_STAKING_ID, ZERO_ADDRESS } from "./constants";

type MintSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string;
  tx: Transaction;
  config: CoinConfig;
  coin: TransactionObjectArgument;
};

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

export const mintSCoin = async <T extends boolean = false>({
  tx,
  coin,
  amount,
  config,
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  // Handle different logic based on coinType
  if (
    config.coinType === HAWAL_COIN_TYPE
  ) {
    // Handle HAWAL special case
    const moveCall = {
      target: HAWAL_STAKE_TARGET,
      arguments: [
        {
          name: "staking",
          value: HAWAL_STAKING_1,
        },
        {
          name: "staking",
          value: HAWAL_STAKING_2,
        },
        { name: "coin", value: amount },
        {
          name: "id",
          value: HAWAL_ID,
        },
      ],
      typeArguments: [],
    };
    moveCallInfos.push(moveCall);

    const [sCoin] = tx.moveCall({
      target: moveCall.target,
      arguments: [
        tx.object(HAWAL_STAKING_1),
        tx.object(HAWAL_STAKING_2),
        coin,
        tx.object(HAWAL_ID),
      ],
      typeArguments: moveCall.typeArguments,
    });

    return (debug
      ? [sCoin, moveCallInfos]
      : sCoin) as unknown as MintSCoinResult<T>;
  } else {
    const moveCall = {
      target: HASUI_STAKE_TARGET,
      arguments: [
        { name: "sui_system_state", value: SUI_SYSTEM_STATE },
        {
          name: "staking",
          value: HAEDAL_STAKING_ID,
        },
        { name: "coin", value: amount },
        {
          name: "address",
          value: ZERO_ADDRESS,
        },
      ],
      typeArguments: [],
    };
    moveCallInfos.push(moveCall);

    const [sCoin] = tx.moveCall({
      target: moveCall.target,
      arguments: [
        tx.object(SUI_SYSTEM_STATE),
        tx.object(HAEDAL_STAKING_ID),
        coin,
        tx.object(ZERO_ADDRESS),
      ],
      typeArguments: moveCall.typeArguments,
    });

    return (debug
      ? [sCoin, moveCallInfos]
      : sCoin) as unknown as MintSCoinResult<T>;
  }
}; 