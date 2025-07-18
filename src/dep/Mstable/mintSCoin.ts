import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { CREATE_DEPOSIT_CAP_TARGET, META_VAULT_SUI_INTEGRATION, VAULT, REGISTRY, DEPOSIT_TARGET, VERSION, AMOUNT_LIMIT } from "./constants";

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

  // First, create the deposit cap
  const createDepositCapMoveCall = {
    target: CREATE_DEPOSIT_CAP_TARGET,
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
  moveCallInfos.push(createDepositCapMoveCall);

  const depositCap = tx.moveCall({
    target: CREATE_DEPOSIT_CAP_TARGET,
    arguments: [
      tx.object(META_VAULT_SUI_INTEGRATION),
      tx.object(VAULT),
      tx.object(REGISTRY),
    ],
    typeArguments: createDepositCapMoveCall.typeArguments,
  });

  // Next, perform the deposit
  const depositMoveCall = {
    target: DEPOSIT_TARGET,
    arguments: [
      {
        name: "vault",
        value: VAULT,
      },
      {
        name: "version",
        value: VERSION,
      },
      { name: "deposit_cap", value: "depositCap" },
      { name: "coin", value: amount },
      { name: "amount_limit", value: AMOUNT_LIMIT },
    ],
    typeArguments: [config.coinType, config.underlyingCoinType],
  };
  moveCallInfos.push(depositMoveCall);

  const [sCoin] = tx.moveCall({
    target: DEPOSIT_TARGET,
    arguments: [
      tx.object(VAULT),
      tx.object(VERSION),
      depositCap,
      coin,
      tx.pure.u64(AMOUNT_LIMIT),
    ],
    typeArguments: depositMoveCall.typeArguments,
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 