import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import { initCetusVaultsSDK, InputType } from "@cetusprotocol/vaults-sdk";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";

type MintSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string;
  tx: Transaction;
  address: string;
  vaultId?: string;
  slippage: string;
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
  address,
  vaultId,
  slippage,
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  const moveCallInfos: MoveCallInfo[] = [];

  if (!vaultId) {
    throw new Error("Vault ID is required for Cetus");
  }
  const sdk = initCetusVaultsSDK({
    network: "mainnet",
  });

  sdk.senderAddress = address;

  const depositResult = await sdk.Vaults.calculateDepositAmount({
    vault_id: vaultId,
    fix_amount_a: false,
    input_amount: amount,
    slippage: Number(slippage),
    side: InputType.OneSide,
  });

  const sCoin = (await sdk.Vaults.deposit(
    {
      coin_object_b: coin as any,
      vault_id: vaultId,
      slippage: Number(slippage),
      deposit_result: depositResult,
      return_lp_token: true,
    },
    tx
  )) as TransactionObjectArgument;

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 