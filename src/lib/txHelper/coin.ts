import Decimal from "decimal.js";
import type { CoinConfig } from "@/types/coin";
import type { CoinData, MoveCallInfo } from "@/api/types";
import {
  Transaction,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions";


// Provider-specific mint functions
import { mintSCoin as mintScallop } from "../../dep/Scallop/mintSCoin";
import { mintSCoin as mintStrater } from "../../dep/Strater/mintSCoin";
import { mintSCoin as mintAftermath } from "../../dep/Aftermath/mintSCoin";
import { mintSCoin as mintSpringSui } from "../../dep/SpringSui/mintSCoin";
import { mintSCoin as mintVolo } from "../../dep/Volo/mintSCoin";
import { mintSCoin as mintHaedal } from "../../dep/Haedal/mintSCoin";
import { mintSCoin as mintAlphaFi } from "../../dep/AlphaFi/mintSCoin";
import { mintSCoin as mintMstable } from "../../dep/Mstable/mintSCoin";
import { mintSCoin as mintWinter } from "../../dep/Winter/mintSCoin";
import { mintSCoin as mintCetus } from "../../dep/Cetus/mintSCoin";

// Provider-specific burn functions
import { burnSCoin as burnScallop } from "../../dep/Scallop/burnSCoin";
import { burnSCoin as burnStrater } from "../../dep/Strater/burnSCoin";
import { burnSCoin as burnAftermath } from "../../dep/Aftermath/burnSCoin";
import { burnSCoin as burnSpringSui } from "../../dep/SpringSui/burnSCoin";
import { burnSCoin as burnVolo } from "../../dep/Volo/burnSCoin";
import { burnSCoin as burnHaedal } from "../../dep/Haedal/burnSCoin";
import { burnSCoin as burnAlphaFi } from "../../dep/AlphaFi/burnSCoin";
import { burnSCoin as burnMstable } from "../../dep/Mstable/burnSCoin";
import { burnSCoin as burnWinter } from "../../dep/Winter/burnSCoin";

type MintMultiSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument[], MoveCallInfo[]]
  : TransactionObjectArgument[];

type MintMultiSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string | string[];
  address: string;
  tx: Transaction;
  vaultId?: string;
  slippage: string;
  limited: boolean;
  coinData: CoinData[];
  config: CoinConfig;
  splitAmounts: string[];
  coinAmount: string | number;
};

export const mintMultiSCoin = async <T extends boolean = false>({
  tx,
  amount,
  limited,
  vaultId,
  address,
  coinData,
  slippage,
  coinAmount,
  config,
  splitAmounts,
  debug = false as T,
}: MintMultiSCoinParams<T>): Promise<MintMultiSCoinResult<T>> => {
  if (!limited || splitAmounts.length === 1) {
    const splitCoins = splitCoinHelper({
      tx,
      coinData,
      amounts: splitAmounts,
      coinType: config.underlyingCoinType,
    });
    const sCoins = [];
    const moveCallInfos: MoveCallInfo[] = [];

    for (const [index, coin] of splitCoins.entries()) {
      const amountValue = Array.isArray(amount) ? amount[index] : amount;
      if (!amountValue) {
        throw new Error(`Amount at index ${index} is undefined`);
      }
      const [sCoin, moveCallInfo] = await mintSCoin({
        tx,
        coin,
        vaultId,
        address,
        slippage,
        config,
        debug: true,
        amount: amountValue,
      });
      sCoins.push(sCoin);
      moveCallInfos.push(...moveCallInfo);
    }

    return (debug
      ? [sCoins, moveCallInfos]
      : sCoins) as unknown as MintMultiSCoinResult<T>;
  } else {
    const amountValue = Array.isArray(amount) ? amount[0] : amount;
    if (!amountValue) {
      throw new Error("Amount is undefined");
    }
    const [coin] = splitCoinHelper({
      tx,
      coinData,
      amounts: [amountValue],
      coinType: config.underlyingCoinType,
    });

    const [sCoin, moveCallInfos] = await mintSCoin({
      tx,
      coin,
      config,
      vaultId,
      address,
      slippage,
      debug: true,
      amount: amountValue,
    });

    const totalAmount = splitAmounts.reduce(
      (sum, amount) => sum.plus(new Decimal(amount)),
      new Decimal(0)
    );

    // Calculate the actual split amounts based on the total coin amount
    const actualSplitAmounts = splitAmounts.map((amount) =>
      new Decimal(amount)
        .div(totalAmount)
        .mul(coinAmount)
        .toFixed(0, Decimal.ROUND_HALF_UP)
    );

    const splitMoveCallInfo: MoveCallInfo = {
      target: `0x2::coin::split`,
      arguments: [
        { name: "self", value: sCoin },
        { name: "amounts", value: JSON.stringify(actualSplitAmounts) },
      ],
      typeArguments: [config.coinType],
    };
    moveCallInfos.push(splitMoveCallInfo);

    const splitCoins = tx.splitCoins(sCoin, actualSplitAmounts);
    const coins = [...splitCoins, sCoin];

    return (debug
      ? [coins, moveCallInfos]
      : coins) as unknown as MintMultiSCoinResult<T>;
  }
};

type MintSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

type MintSCoinParams<T extends boolean = false> = {
  debug?: T;
  amount: string;
  tx: Transaction;
  address: string;
  vaultId?: string;
  slippage: string;
  coinData?: CoinData[];
  config: CoinConfig;
  coin?: TransactionObjectArgument;
};

export const mintSCoin = async <T extends boolean = false>({
  tx,
  coin,
  amount,
  config,
  address,
  vaultId,
  slippage,
  coinData,
  debug = false as T,
}: MintSCoinParams<T>): Promise<MintSCoinResult<T>> => {
  if (!coin) {
    if (!coinData) {
      throw new Error("coinData is required");
    }
    const [_coin] = splitCoinHelper({
      tx,
      coinData,
      amounts: [amount],
      coinType: config.underlyingCoinType,
    });
    coin = _coin;
  }

  // Switch based on underlying protocol
  switch (config.underlyingProtocol) {
    case "Scallop": {
      const result = await mintScallop({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Strater": {
      const result = await mintStrater({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Aftermath": {
      const result = await mintAftermath({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "SpringSui": {
      const result = await mintSpringSui({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Volo": {
      const result = await mintVolo({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Haedal": {
      const result = await mintHaedal({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "AlphaFi": {
      const result = await mintAlphaFi({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Mstable": {
      const result = await mintMstable({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Winter": {
      const result = await mintWinter({
        tx,
        coin,
        amount,
        config,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    case "Cetus": {
      const result = await mintCetus({
        tx,
        coin,
        amount,
        config,
        address,
        vaultId,
        slippage,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as MintSCoinResult<T>;
    }
    default:
      throw new Error(
        "mintSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
  }
};

type GetCoinValueResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo]
  : TransactionObjectArgument;

export const getCoinValue = <T extends boolean = false>(
  tx: Transaction,
  coin: TransactionObjectArgument,
  coinType: string,
  debug = false as T
): GetCoinValueResult<T> => {
  const moveCallInfo: MoveCallInfo = {
    target: `0x2::coin::value`,
    arguments: [{ name: "coin", value: coin }],
    typeArguments: [coinType],
  };

  const coinValue = tx.moveCall({
    target: moveCallInfo.target,
    arguments: [coin],
    typeArguments: moveCallInfo.typeArguments,
  });

  return (debug
    ? [coinValue, moveCallInfo]
    : coinValue) as unknown as GetCoinValueResult<T>;
};

type BurnSCoinResult<T extends boolean> = T extends true
  ? [TransactionObjectArgument, MoveCallInfo[]]
  : TransactionObjectArgument;

type BurnSCoinParams<T extends boolean = false> = {
  debug?: T;
  // amount?: string;
  tx: Transaction;
  address: string;
  // slippage?: string;
  config: CoinConfig;
  sCoin: TransactionObjectArgument;
};

export const burnSCoin = async <T extends boolean = false>({
  tx,
  sCoin,
  config,
  address,
  debug = false as T,
}: BurnSCoinParams<T>): Promise<BurnSCoinResult<T>> => {
  // Switch based on underlying protocol
  switch (config.underlyingProtocol) {
    case "Scallop": {
      const result = await burnScallop({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Strater": {
      const result = await burnStrater({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Aftermath": {
      const result = await burnAftermath({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "SpringSui": {
      const result = await burnSpringSui({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Volo": {
      const result = await burnVolo({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Haedal": {
      const result = await burnHaedal({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "AlphaFi": {
      const result = await burnAlphaFi({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Mstable": {
      const result = await burnMstable({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    case "Winter": {
      const result = await burnWinter({
        tx,
        sCoin,
        config,
        address,
        debug: true,
      });
      return (debug ? result : result[0]) as unknown as BurnSCoinResult<T>;
    }
    default:
      console.error(
        "burnSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
      throw new Error(
        "burnSCoin Unsupported underlying protocol: " +
          config.underlyingProtocol
      );
  }
};

interface SplitCoinHelperParams {
  tx: Transaction;
  amounts: string[];
  coinType?: string;
  coinData: CoinData[];
}

/**
 * Split coins based on amounts array.
 * @param amounts - array length must be >= 1
 * @returns TransactionObjectArgument[] - length equals amounts.length
 */
export function splitCoinHelper({
  tx,
  amounts,
  coinType,
  coinData,
}: SplitCoinHelperParams): TransactionObjectArgument[] {
  if (amounts.length < 1) {
    throw new Error("amounts must have at least one element");
  }

  if (coinData.length < 1) {
    throw new Error("Coin data is empty");
  }

  const totalTargetAmount = amounts.reduce(
    (sum, amount) => sum.add(new Decimal(amount)),
    new Decimal(0)
  );

  if (
    !coinType ||
    [
      "0x2::sui::SUI",
      "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    ].includes(coinType)
  ) {
    const totalBalance = coinData.reduce(
      (sum, coin) => sum.add(coin.balance),
      new Decimal(0)
    );

    if (totalBalance.lt(totalTargetAmount)) {
      throw new Error(`${coinType} Insufficient balance`);
    }

    const result = tx.splitCoins(tx.gas, amounts);
    if (result.length !== amounts.length) {
      throw new Error(
        "splitCoinHelper: result length does not match amounts length"
      );
    }
    return result;
  } else {
    const firstCoin = coinData[0];
    if (!firstCoin) {
      throw new Error("First coin data is undefined");
    }

    const firstCoinBalance = new Decimal(firstCoin.balance);

    if (firstCoinBalance.gte(totalTargetAmount)) {
      if (firstCoinBalance.eq(totalTargetAmount) && amounts.length === 1) {
        const result = [tx.object(firstCoin.coinObjectId)];
        if (result.length !== amounts.length) {
          throw new Error(
            "splitCoinHelper: result length does not match amounts length"
          );
        }
        return result;
      }
      const result = tx.splitCoins(tx.object(firstCoin.coinObjectId), amounts);
      if (result.length !== amounts.length) {
        throw new Error(
          "splitCoinHelper: result length does not match amounts length"
        );
      }
      return result;
    }

    const coinsToUse: string[] = [];
    let accumulatedBalance = new Decimal(0);

    for (const coin of coinData) {
      accumulatedBalance = accumulatedBalance.add(coin.balance);
      coinsToUse.push(coin.coinObjectId);

      if (accumulatedBalance.gte(totalTargetAmount)) {
        break;
      }
    }

    if (accumulatedBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "insufficient balance");
    }

    const firstCoinId = coinsToUse[0];
    if (!firstCoinId) {
      throw new Error("First coin ID is undefined");
    }

    tx.mergeCoins(
      tx.object(firstCoinId),
      coinsToUse.slice(1).map((id) => tx.object(id))
    );
    const result = tx.splitCoins(firstCoinId, amounts);
    if (result.length !== amounts.length) {
      throw new Error(
        "splitCoinHelper: result length does not match amounts length"
      );
    }
    return result;
  }
}
