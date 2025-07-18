import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { CREATE_WITHDRAW_CAP_TARGET, META_VAULT_SUI_INTEGRATION, VAULT, REGISTRY, WITHDRAW_TARGET, VERSION, AMOUNT_LIMIT } from "./constants";

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

  // First, create the withdraw cap
  const createWithdrawCapMoveCall = {
    target: CREATE_WITHDRAW_CAP_TARGET,
    arguments: [
      {
        name: "meta_vault_sui_integration",
        value: META_VAULT_SUI_INTEGRATION,
      },
      {
        name: "vault",
        value: VAULT,
      },
      {
        name: "registry",
        value: REGISTRY,
      },
    ],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(createWithdrawCapMoveCall);

  const [withdrawCap] = tx.moveCall({
    target: createWithdrawCapMoveCall.target,
    arguments: [
      tx.object(META_VAULT_SUI_INTEGRATION),
      tx.object(VAULT),
      tx.object(REGISTRY),
    ],
    typeArguments: createWithdrawCapMoveCall.typeArguments,
  });

  // Next, perform the withdrawal
  const withdrawMoveCall = {
    target: WITHDRAW_TARGET,
    arguments: [
      {
        name: "vault",
        value: VAULT,
      },
      {
        name: "version",
        value: VERSION,
      },
      { name: "withdraw_cap", value: "withdrawCap" },
      { name: "coin", value: "sCoin" },
      { name: "amount_limit", value: AMOUNT_LIMIT },
    ],
    typeArguments: [config.coinType, config.underlyingCoinType],
  };
  moveCallInfos.push(withdrawMoveCall);

  const [coin] = tx.moveCall({
    target: withdrawMoveCall.target,
    arguments: [
      tx.object(VAULT),
      tx.object(VERSION),
      withdrawCap,
      sCoin,
      tx.pure.u64(AMOUNT_LIMIT),
    ],
    typeArguments: withdrawMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 