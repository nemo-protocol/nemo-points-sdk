import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { STAKE_POOL, METADATA } from "./constants";

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
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  const moveCall = {
    target: `0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20::stake_pool::stake`,
    arguments: [
      {
        name: "native_pool",
        value: STAKE_POOL,
      },
      {
        name: "metadata",
        value: METADATA,
      },
      { name: "sui_system_state", value: "0x5" },
      { name: "coin", value: amount },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(moveCall);

  const [sCoin] = tx.moveCall({
    target: moveCall.target,
    arguments: [
      tx.object(STAKE_POOL),
      tx.object(METADATA),
      tx.object("0x5"),
      coin,
    ],
    typeArguments: moveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 