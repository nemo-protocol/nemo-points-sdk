import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { GET_ALLOWED_VERSIONS_TARGET, BLIZZARD_AV, MINT_TARGET, STAKING, ID, Winter_Blizzard_Staking_List } from "./constants";

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

  const blizzardStaking = Winter_Blizzard_Staking_List.find(
    (item) => item.coinType === config.coinType
  )?.value;

  if (!blizzardStaking) {
    throw new Error("Winter blizzard staking not found");
  }
  const getAllowedVersionsMoveCall = {
    target: GET_ALLOWED_VERSIONS_TARGET,
    arguments: [
      {
        name: "blizzard_av",
        value: BLIZZARD_AV,
      },
    ],
    typeArguments: [],
  };
  moveCallInfos.push(getAllowedVersionsMoveCall);

  const [allowedVersions] = tx.moveCall({
    target: getAllowedVersionsMoveCall.target,
    arguments: [
      tx.object(BLIZZARD_AV),
    ],
    typeArguments: getAllowedVersionsMoveCall.typeArguments,
  });

  // Then call blizzard_protocol::mint
  const mintMoveCall = {
    target: MINT_TARGET,
    arguments: [
      {
        name: "blizzard_staking",
        value: blizzardStaking,
      },
      {
        name: "staking",
        value: STAKING,
      },
      {
        name: "coin",
        value: amount,
      },
      {
        name: "id",
        value: ID,
      },
      {
        name: "allowed_versions",
        value: allowedVersions,
      },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(mintMoveCall);

  const [sCoin] = tx.moveCall({
    target: mintMoveCall.target,
    arguments: [
      tx.object(blizzardStaking),
      tx.object(STAKING),
      coin,
      tx.object(ID),
      allowedVersions,
    ],
    typeArguments: mintMoveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 