import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { MINT_TARGET, SPRING_SUI_STAKING_INFO_LIST } from "./constants";

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

  const lstInfo = SPRING_SUI_STAKING_INFO_LIST.find(
    (item) => item.coinType === config.coinType
  )?.value;
  if (!lstInfo) {
    throw new Error(`SpringSui: lstInfo not found for ${config.coinType}`);
  }
  const moveCall = {
    target: MINT_TARGET,
    arguments: [
      {
        name: "liquid_staking_info",
        value: lstInfo,
      },
      { name: "sui_system_state", value: "0x5" },
      { name: "coin", value: amount },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(moveCall);

  const [sCoin] = tx.moveCall({
    target: moveCall.target,
    arguments: [tx.object(lstInfo), tx.object("0x5"), coin],
    typeArguments: moveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 