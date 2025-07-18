import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { REQUEST_STAKE_TARGET, STAKED_SUI_VAULT, SAFE, SYSTEM_STATE, REFERRAL_VAULT, VALIDATOR } from "./constants";

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
    target: REQUEST_STAKE_TARGET,
    arguments: [
      { name: "staked_sui_vault", value: STAKED_SUI_VAULT },
      { name: "safe", value: SAFE },
      { name: "system_state", value: SYSTEM_STATE },
      { name: "referral_vault", value: REFERRAL_VAULT },
      { name: "coin", value: amount },
      { name: "validator", value: VALIDATOR },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(moveCall);

  const [sCoin] = tx.moveCall({
    target: moveCall.target,
    arguments: [
      tx.object(STAKED_SUI_VAULT),
      tx.object(SAFE),
      tx.object(SYSTEM_STATE),
      tx.object(REFERRAL_VAULT),
      coin,
      tx.pure.address(VALIDATOR),
    ],
    typeArguments: moveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 