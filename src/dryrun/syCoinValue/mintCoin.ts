import { Transaction } from "@mysten/sui/transactions"
import type { SuiClient } from "@mysten/sui/client"
import type { CoinConfig, CoinData } from "../../api/types"
import { mintSCoin, getCoinValue } from "../../lib/txHelper/coin"
import { bcs } from "@mysten/sui/bcs"
import Decimal from "decimal.js"

interface ContractError extends Error {
  debugInfo?: DebugInfo
}

interface DebugInfo {
  moveCall: any[]
  rawResult: any
  parsedOutput?: any
}

interface MintCoinParams {
  suiClient: SuiClient
  defaultAddress: string
  coinConfig: CoinConfig
  amount: string
  vaultId?: string
  slippage: string
  coinData: CoinData[]
}

type Result = { coinValue: string; coinAmount: string }

type DryRunResult<T extends boolean> = T extends true
  ? [Result, DebugInfo]
  : Result

export async function mintCoin<T extends boolean = false>(
  params: MintCoinParams & { debug?: T }
): Promise<DryRunResult<T>> {
  const {
    suiClient,
    defaultAddress,
    coinConfig,
    amount,
    vaultId,
    slippage,
    coinData,
    debug = false as T
  } = params

  if (!defaultAddress) {
    throw new Error("Please connect wallet first")
  }
  if (!coinConfig) {
    throw new Error("Please select token first")
  }

  const tx = new Transaction()
  tx.setSender(defaultAddress)

  const [sCoin, mintMoveCallInfos] = await mintSCoin({
    tx,
    amount,
    vaultId,
    address: defaultAddress,
    slippage,
    coinData,
    config: coinConfig,
    debug: true,
  })

  const [, getCoinValueMoveCallInfo] = getCoinValue(
    tx,
    sCoin,
    coinConfig.coinType,
    true,
  )

  const result = await suiClient.devInspectTransactionBlock({
    sender: defaultAddress,
    transactionBlock: await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    }),
  })

  const debugInfo: DebugInfo = {
    moveCall: [...mintMoveCallInfos, getCoinValueMoveCallInfo],
    rawResult: result,
  }

  if (result?.error) {
    const error = new Error(result.error) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  if (!result.results || result.results.length === 0) {
    const message = "No results returned from transaction"
    if (debugInfo.rawResult) {
      debugInfo.rawResult.error = message
    }
    const error = new Error(message) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  const lastResult = result.results[result.results.length - 1]
  if (!lastResult?.returnValues?.[0]) {
    const message = "Failed to get return values"
    if (debugInfo.rawResult) {
      debugInfo.rawResult.error = message
    }
    const error = new Error(message) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  if (lastResult.returnValues[0][1] !== "u64") {
    const message = "Failed to get coin amount"
    if (debugInfo.rawResult) {
      debugInfo.rawResult.error = message
    }
    const error = new Error(message) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  const coinAmount = bcs.U64.parse(
    new Uint8Array(lastResult.returnValues[0][0]),
  )

  const decimal = Number(coinConfig.decimal)

  const coinValue = new Decimal(coinAmount)
    .div(10 ** decimal)
    .toFixed(decimal)

  debugInfo.parsedOutput = coinValue

  const resultObj = {
    coinValue,
    coinAmount,
  }

  return (debug ? [resultObj, debugInfo] : resultObj) as DryRunResult<T>
} 