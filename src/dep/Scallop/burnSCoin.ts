import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { BURN_S_COIN_TARGET, REDEEM_TARGET, VERSION_OBJECT, MARKET_OBJECT, CLOCK_OBJECT, getTreasury } from "./constants";

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
  const treasury = getTreasury(config.coinType);

  const burnSCoinMoveCall = {
    target: BURN_S_COIN_TARGET,
    arguments: [
      { name: "treasury", value: treasury },
      { name: "s_coin", value: "sCoin" },
    ],
    typeArguments: [config.coinType, config.underlyingCoinType],
  };
  moveCallInfos.push(burnSCoinMoveCall);

  const [marketCoin] = tx.moveCall({
    target: burnSCoinMoveCall.target,
    arguments: [tx.object(treasury), sCoin],
    typeArguments: burnSCoinMoveCall.typeArguments,
  });

  const redeemMoveCall = {
    target: REDEEM_TARGET,
    arguments: [
      { name: "version", value: VERSION_OBJECT },
      { name: "market", value: MARKET_OBJECT },
      { name: "market_coin", value: "marketCoin" },
      { name: "clock", value: CLOCK_OBJECT },
    ],
    typeArguments: [config.underlyingCoinType],
  };
  moveCallInfos.push(redeemMoveCall);

  const [coin] = tx.moveCall({
    target: redeemMoveCall.target,
    arguments: [
      tx.object(VERSION_OBJECT),
      tx.object(MARKET_OBJECT),
      marketCoin,
      tx.object(CLOCK_OBJECT),
    ],
    typeArguments: redeemMoveCall.typeArguments,
  });

  return (debug
    ? [coin, moveCallInfos]
    : coin) as unknown as BurnSCoinResult<T>;
}; 