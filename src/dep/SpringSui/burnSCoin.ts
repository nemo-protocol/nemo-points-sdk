import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { REDEEM_TARGET, SPRING_SUI_STAKING_INFO_LIST } from "./constants";

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

  const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
    (item) => item.coinType === config.coinType
  )?.value;
  if (!lstInfo) {
    throw new Error(`SpringSui: lstInfo not found for ${config.coinType}`);
  }
  const redeemMoveCall = {
    target: REDEEM_TARGET,
    arguments: [
      {
        name: "liquid_staking_info",
        value: lstInfo,
      },
      { name: "coin", value: sCoin },
      { name: "sui_system_state", value: "0x5" },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(redeemMoveCall);

  const [coin] = tx.moveCall({
    target: redeemMoveCall.target,
    arguments: [tx.object(lstInfo), sCoin, tx.object("0x5")],
    typeArguments: redeemMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 