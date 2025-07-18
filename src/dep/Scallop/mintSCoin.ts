import type { CoinConfig } from "@/types/coin";
import type { MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { MINT_TARGET, MINT_S_COIN_TARGET, VERSION_OBJECT, MARKET_OBJECT, CLOCK_OBJECT, getTreasury } from "./constants";

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
  const treasury = getTreasury(config.coinType);

  const moveCall = {
    target: MINT_TARGET,
    arguments: [
      { name: "version", value: VERSION_OBJECT },
      { name: "market", value: MARKET_OBJECT },
      { name: "amount", value: amount },
      { name: "clock", value: CLOCK_OBJECT },
    ],
    typeArguments: [config.underlyingCoinType],
  };
  moveCallInfos.push(moveCall);

  const marketCoin = tx.moveCall({
    target: MINT_TARGET,
    arguments: [
      tx.object(VERSION_OBJECT),
      tx.object(MARKET_OBJECT),
      coin,
      tx.object(CLOCK_OBJECT),
    ],
    typeArguments: moveCall.typeArguments,
  });

  const mintSCoinMoveCall: MoveCallInfo = {
    target: MINT_S_COIN_TARGET,
    arguments: [
      { name: "treasury", value: treasury },
      { name: "market_coin", value: "marketCoin" },
    ],
    typeArguments: [config.coinType, config.underlyingCoinType],
  };
  moveCallInfos.push(mintSCoinMoveCall);

  const [sCoin] = tx.moveCall({
    ...mintSCoinMoveCall,
    arguments: [tx.object(treasury), marketCoin],
  });

  return (debug
    ? [sCoin, moveCallInfos]
    : sCoin) as unknown as MintSCoinResult<T>;
}; 