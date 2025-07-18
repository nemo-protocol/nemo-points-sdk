import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { INTO_BALANCE_TARGET, WITHDRAW_TARGET, REDEEM_WITHDRAW_TICKET_TARGET, BUCKET_VAULT, CLOCK_OBJECT, FROM_BALANCE_TARGET } from "./constants";

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

  // Convert sCoin to balance first
  const toBalanceMoveCall = {
    target: INTO_BALANCE_TARGET,
    arguments: [{ name: "coin", value: "sCoin" }],
    typeArguments: [config.coinType],
  };
  moveCallInfos.push(toBalanceMoveCall);

  const [sbsBalance] = tx.moveCall({
    target: toBalanceMoveCall.target,
    arguments: [sCoin],
    typeArguments: toBalanceMoveCall.typeArguments,
  });

  // Call withdraw to get a withdraw ticket
  const withdrawMoveCall = {
    target: WITHDRAW_TARGET,
    arguments: [
      {
        name: "bucket_vault",
        value: BUCKET_VAULT,
      },
      {
        name: "balance",
        value: "sbsBalance",
      },
      { name: "clock", value: CLOCK_OBJECT },
    ],
    typeArguments: [config.underlyingCoinType, config.coinType],
  };
  moveCallInfos.push(withdrawMoveCall);

  const [withdrawTicket] = tx.moveCall({
    target: withdrawMoveCall.target,
    arguments: [
      tx.object(BUCKET_VAULT),
      sbsBalance,
      tx.object(CLOCK_OBJECT),
    ],
    typeArguments: withdrawMoveCall.typeArguments,
  });

  // Redeem the withdraw ticket to get the underlying balance
  const redeemTicketMoveCall = {
    target: REDEEM_WITHDRAW_TICKET_TARGET,
    arguments: [
      {
        name: "bucket_vault",
        value: BUCKET_VAULT,
      },
      {
        name: "withdraw_ticket",
        value: "withdrawTicket",
      },
    ],
    typeArguments: [config.underlyingCoinType, config.coinType],
  };
  moveCallInfos.push(redeemTicketMoveCall);

  const [underlyingBalance] = tx.moveCall({
    target: redeemTicketMoveCall.target,
    arguments: [
      tx.object(BUCKET_VAULT),
      withdrawTicket,
    ],
    typeArguments: redeemTicketMoveCall.typeArguments,
  });

  // Convert balance back to coin
  const fromBalanceMoveCall = {
    target: FROM_BALANCE_TARGET,
    arguments: [{ name: "balance", value: "underlyingBalance" }],
    typeArguments: [config.underlyingCoinType],
  };
  moveCallInfos.push(fromBalanceMoveCall);

  const [coin] = tx.moveCall({
    target: fromBalanceMoveCall.target,
    arguments: [underlyingBalance],
    typeArguments: fromBalanceMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 