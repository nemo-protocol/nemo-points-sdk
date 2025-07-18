import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { INTO_BALANCE_TARGET, DEPOSIT_TARGET, BUCKET_VAULT, CLOCK_OBJECT, FROM_BALANCE_TARGET } from "./constants";

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

  const fromBalanceMoveCall = {
    target: INTO_BALANCE_TARGET,
    arguments: [{ name: "balance", value: amount }],
    typeArguments: [config.underlyingCoinType],
  };
  moveCallInfos.push(fromBalanceMoveCall);

  const sBalance = tx.moveCall({
    target: INTO_BALANCE_TARGET,
    arguments: [coin],
    typeArguments: fromBalanceMoveCall.typeArguments,
  });

  const moveCall = {
    target: DEPOSIT_TARGET,
    arguments: [
      {
        name: "bucket_vault",
        value: BUCKET_VAULT,
      },
      {
        name: "balance",
        value: amount,
      },
      { name: "clock", value: CLOCK_OBJECT },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(moveCall);

  const sbsBalance = tx.moveCall({
    target: DEPOSIT_TARGET,
    arguments: [
      tx.object(BUCKET_VAULT),
      sBalance,
      tx.object(CLOCK_OBJECT),
    ],
    typeArguments: moveCall.typeArguments,
  });
  const [sbsCoin] = tx.moveCall({
    target: FROM_BALANCE_TARGET,
    arguments: [sbsBalance],
    typeArguments: [config.coinType],
  });

  return (debug
    ? [sbsCoin, moveCallInfos]
    : sbsCoin) as unknown as MintSCoinResult<T>;
}; 