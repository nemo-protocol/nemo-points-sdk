import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { PACKAGE_ID, LIQUID_STAKING_INFO, SUI_SYSTEM_STATE } from "./constants";

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

  const redeemMoveCall = {
    target: `${PACKAGE_ID}::liquid_staking::redeem`,
    arguments: [
      { name: "liquid_staking_info", value: LIQUID_STAKING_INFO },
      { name: "coin", value: "sCoin" },
      { name: "sui_system_state", value: SUI_SYSTEM_STATE },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(redeemMoveCall);

  const [coin] = tx.moveCall({
    target: redeemMoveCall.target,
    arguments: [
      tx.object(LIQUID_STAKING_INFO),
      sCoin,
      tx.object(SUI_SYSTEM_STATE),
    ],
    typeArguments: redeemMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 