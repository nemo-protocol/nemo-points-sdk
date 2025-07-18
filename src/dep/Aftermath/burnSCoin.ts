import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { REQUEST_UNSTAKE_ATOMIC_TARGET, STAKED_SUI_VAULT, SAFE, REFERRAL_VAULT, TREASURY } from "./constants";

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

  const burnMoveCall = {
    target: REQUEST_UNSTAKE_ATOMIC_TARGET,
    arguments: [
      { name: "staked_sui_vault", value: STAKED_SUI_VAULT },
      { name: "safe", value: SAFE },
      { name: "referral_vault", value: REFERRAL_VAULT },
      { name: "treasury", value: TREASURY },
      { name: "s_coin", value: "sCoin" },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(burnMoveCall);

  const [coin] = tx.moveCall({
    target: burnMoveCall.target,
    arguments: [
      tx.object(STAKED_SUI_VAULT),
      tx.object(SAFE),
      tx.object(REFERRAL_VAULT),
      tx.object(TREASURY),
      sCoin,
    ],
    typeArguments: burnMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 