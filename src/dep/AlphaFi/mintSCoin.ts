import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { PACKAGE_ID, LIQUID_STAKING_INFO, SUI_SYSTEM_STATE } from "./constants";

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

  const moveCall = {
    target: `${PACKAGE_ID}::liquid_staking::mint`,
    arguments: [
      {
        name: "liquid_staking_info",
        value: LIQUID_STAKING_INFO,
      },
      { name: "sui_system_state", value: SUI_SYSTEM_STATE },
      { name: "coin", value: amount },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(moveCall);

  const [sCoin] = tx.moveCall({
    target: moveCall.target,
    arguments: [
      tx.object(LIQUID_STAKING_INFO),
      tx.object(SUI_SYSTEM_STATE),
      coin,
    ],
    typeArguments: moveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 