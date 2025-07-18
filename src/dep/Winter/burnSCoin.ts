import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { BURN_LST_TARGET, FCFS_TARGET, WALRUS_STAKING, GET_ALLOWED_VERSIONS_TARGET, BLIZZARD_AV, VECTOR_TRANSFER_STAKED_WAL_TARGET, Winter_Blizzard_Staking_List } from "./constants";

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
  address,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  if (config.provider === "Winter") {
    throw new Error("Underlying protocol error, try to withdraw to wWAL.");
  }

  // Get coin value
  const coinValue = tx.moveCall({
    target: "0x2::coin::value",
    arguments: [sCoin],
    typeArguments: [config.coinType],
  });

  const blizzardStaking = Winter_Blizzard_Staking_List.find(
    (item) => item.coinType === config.coinType
  )?.value;

  if (!blizzardStaking) {
    throw new Error("Winter blizzard staking not found");
  }

  const fcfsMoveCall = {
    target: FCFS_TARGET,
    arguments: [
      {
        name: "blizzard_staking",
        value: blizzardStaking,
      },
      {
        name: "walrus_staking",
        value: WALRUS_STAKING,
      },
      {
        name: "amount",
        value: coinValue,
      },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(fcfsMoveCall);

  // Call blizzard_hooks::fcfs to get ixVector
  const [, ixVector] = tx.moveCall({
    target: fcfsMoveCall.target,
    arguments: [
      tx.object(blizzardStaking),
      tx.object(WALRUS_STAKING),
      coinValue,
    ],
    typeArguments: fcfsMoveCall.typeArguments,
  });

  // First call get_allowed_versions to get version information
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

  const allowedVersions = tx.moveCall({
    target: getAllowedVersionsMoveCall.target,
    arguments: [
      tx.object(BLIZZARD_AV),
    ],
    typeArguments: getAllowedVersionsMoveCall.typeArguments,
  });

  // Call burn_lst function
  const burnLstMoveCall = {
    target: BURN_LST_TARGET,
    arguments: [
      {
        name: "blizzard_staking",
        value: blizzardStaking,
      },
      {
        name: "staking",
        value: WALRUS_STAKING,
      },
      {
        name: "s_coin",
        value: sCoin,
      },
      {
        name: "ix_vector",
        value: ixVector,
      },
      {
        name: "allowed_versions",
        value: allowedVersions,
      },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(burnLstMoveCall);

  const [coin, stakedWals] = tx.moveCall({
    target: burnLstMoveCall.target,
    arguments: [
      tx.object(blizzardStaking),
      tx.object(WALRUS_STAKING),
      sCoin,
      ixVector,
      allowedVersions,
    ],
    typeArguments: burnLstMoveCall.typeArguments,
  });

  const vectorTransferStakedWalMoveCall = {
    target: VECTOR_TRANSFER_STAKED_WAL_TARGET,
    arguments: [
      {
        name: "walrus_staking",
        value: WALRUS_STAKING,
      },
      {
        name: "StakedWalVector",
        value: stakedWals,
      },
      {
        name: "address",
        value: address,
      },
    ],
    typeArguments: [],
  };

  tx.moveCall({
    target: vectorTransferStakedWalMoveCall.target,
    arguments: [
      tx.object(WALRUS_STAKING),
      stakedWals,
      tx.pure.address(address),
    ],
    typeArguments: vectorTransferStakedWalMoveCall.typeArguments,
  });

  moveCallInfos.push(vectorTransferStakedWalMoveCall);

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 