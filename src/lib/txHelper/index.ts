import Decimal from "decimal.js"
import type { CoinData, CoinConfig, MoveCallInfo } from "../../types"
import {
  Transaction,
  type TransactionResult,
  type TransactionObjectArgument,
} from "@mysten/sui/transactions"

export const initPyPosition = (tx: Transaction, coinConfig: CoinConfig) => {
  const moveCall = {
    target: `${coinConfig.nemoContractId}::py::init_py_position`,
    arguments: [coinConfig.version, coinConfig.pyStateId, "0x6"],
    typeArguments: [coinConfig.syCoinType],
  }
  console.log("init_py_position move call:", moveCall)

  const [pyPosition] = tx.moveCall({
    ...moveCall,
    arguments: moveCall.arguments.map((arg) => tx.object(arg)),
  })

  return pyPosition
}

export function splitCoinHelper(
  tx: Transaction,
  coinData: CoinData[],
  amounts: string[],
  coinType?: string
) {
  console.log("splitCoinHelper params:", {
    coinData,
    amounts,
    coinType,
  })

  const totalTargetAmount = amounts.reduce(
    (sum, amount) => sum.add(new Decimal(amount)),
    new Decimal(0)
  )

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
    )

    if (totalBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "Insufficient balance")
    }

    return tx.splitCoins(tx.gas, amounts)
  } else {
    const firstCoinBalance = new Decimal(coinData[0].balance)

    if (firstCoinBalance.gte(totalTargetAmount)) {
      if (firstCoinBalance.eq(totalTargetAmount) && amounts.length === 1) {
        return [tx.object(coinData[0].coinObjectId)]
      }
      return tx.splitCoins(tx.object(coinData[0].coinObjectId), amounts)
    }

    const coinsToUse: string[] = []
    let accumulatedBalance = new Decimal(0)

    for (const coin of coinData) {
      accumulatedBalance = accumulatedBalance.add(coin.balance)
      coinsToUse.push(coin.coinObjectId)

      if (accumulatedBalance.gte(totalTargetAmount)) {
        break
      }
    }

    if (accumulatedBalance.lt(totalTargetAmount)) {
      throw new Error(coinType + " " + "insufficient balance")
    }

    tx.mergeCoins(
      tx.object(coinsToUse[0]),
      coinsToUse.slice(1).map((id) => tx.object(id))
    )
    return tx.splitCoins(coinsToUse[0], amounts)
  }
}

export function depositSyCoin(
  tx: Transaction,
  coinConfig: CoinConfig,
  splitCoin: TransactionObjectArgument,
  coinType: string
) {
  const depositMoveCall = {
    target: `${coinConfig.nemoContractId}::sy::deposit`,
    arguments: [coinConfig.version, "splitCoin", coinConfig.syStateId],
    typeArguments: [coinType, coinConfig.syCoinType],
  }
  console.log("sy::deposit move call:", depositMoveCall)

  const [syCoin] = tx.moveCall({
    ...depositMoveCall,
    arguments: [
      tx.object(coinConfig.version),
      splitCoin,
      tx.object(coinConfig.syStateId),
    ],
  })

  return syCoin
}

export const mintPY = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionObjectArgument,
  priceVoucher: TransactionObjectArgument,
  pyPosition: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::yield_factory::mint_py`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "sy_coin", value: "syCoin" },
      { name: "price_voucher", value: "priceVoucher" },
      { name: "py_position", value: "pyPosition" },
      { name: "py_state", value: coinConfig.pyStateId },
      { name: "yield_factory_config", value: coinConfig.yieldFactoryConfigId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  const txMoveCall = {
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      priceVoucher,
      pyPosition,
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.yieldFactoryConfigId),
      tx.object("0x6"),
    ],
    typeArguments: debugInfo.typeArguments,
  }

  console.log("mint_py move call:", txMoveCall)

  const result = tx.moveCall(txMoveCall)

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const redeemSyCoin = <T extends boolean = false>(
  tx: Transaction,
  coinConfig: CoinConfig,
  syCoin: TransactionObjectArgument,
  returnDebugInfo?: T
): T extends true ? [TransactionResult, MoveCallInfo] : TransactionResult => {
  const debugInfo: MoveCallInfo = {
    target: `${coinConfig.nemoContractId}::sy::redeem`,
    arguments: [
      { name: "version", value: coinConfig.version },
      { name: "sy_coin", value: syCoin },
      { name: "sy_state", value: coinConfig.syStateId },
    ],
    typeArguments: [coinConfig.coinType, coinConfig.syCoinType],
  }

  console.log("sy::redeem move call:", debugInfo)

  const result = tx.moveCall({
    target: debugInfo.target,
    arguments: [
      tx.object(coinConfig.version),
      syCoin,
      tx.object(coinConfig.syStateId),
    ],
    typeArguments: debugInfo.typeArguments,
  })

  return (returnDebugInfo ? [result, debugInfo] : result) as T extends true
    ? [TransactionResult, MoveCallInfo]
    : TransactionResult
}

export const mergeAllLpPositions = (
  tx: Transaction,
  coinConfig: CoinConfig,
  lpPositions: any[],
  marketPosition: TransactionObjectArgument
) => {
  console.log("mergeAllLpPositions params:", {
    tx,
    coinConfig,
    lpPositions,
    marketPosition,
  })

  if (lpPositions.length === 0) {
    return marketPosition
  }

  const joinMoveCall = {
    target: `${coinConfig.nemoContractId}::market_position::join`,
    arguments: [lpPositions[0].id.id, marketPosition, "0x6"],
    typeArguments: [],
  }
  console.log("market_position::join move call:", joinMoveCall)

  tx.moveCall({
    ...joinMoveCall,
    arguments: joinMoveCall.arguments.map((arg) => tx.object(arg)),
  })

  for (let i = 1; i < lpPositions.length; i++) {
    const joinMoveCall = {
      target: `${coinConfig.nemoContractId}::market_position::join`,
      arguments: [lpPositions[0].id.id, lpPositions[i].id.id, "0x6"],
      typeArguments: [],
    }
    console.log("market_position::join move call:", joinMoveCall)

    tx.moveCall({
      ...joinMoveCall,
      arguments: joinMoveCall.arguments.map((arg) => tx.object(arg)),
    })
  }

  return tx.object(lpPositions[0].id.id)
} 