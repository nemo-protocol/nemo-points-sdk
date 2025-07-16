import { bcs } from "@mysten/sui/bcs"
import { Transaction } from "@mysten/sui/transactions"
import type { SuiClient } from "@mysten/sui/client"
import type { CoinConfig, CoinData } from "../../types"
import { getPriceVoucher } from "../../lib/txHelper/price"

interface ContractError extends Error {
  debugInfo?: DebugInfo
}

interface DebugInfo {
  moveCall: any[]
  rawResult: any
  parsedOutput?: any
}



type DryRunResult<T extends boolean> = T extends true
  ? [string, DebugInfo]
  : string

export async function addLiquiditySinglePtDryRun<T extends boolean = false>(
  params: {
    suiClient: SuiClient
    defaultAddress: string
    coinConfig: CoinConfig
    netSyIn: string
    coinData: CoinData[]
    debug?: T
  }
): Promise<DryRunResult<T>> {
  const { suiClient, defaultAddress, coinConfig, netSyIn, coinData, debug = false as T } = params

  if (!defaultAddress) {
    throw new Error("Please connect wallet first")
  }
  if (!coinConfig) {
    throw new Error("Please select a pool")
  }
  if (!coinData?.length) {
    throw new Error("No available coins")
  }

  const tx = new Transaction()
  tx.setSender(defaultAddress)

  const [priceVoucher, priceVoucherInfo] = getPriceVoucher(tx, coinConfig)

  const moveCallInfo = {
    target: `${coinConfig.nemoContractId}::offchain::single_liquidity_add_pt_out`,
    arguments: [
      { name: "net_sy_in", value: netSyIn },
      { name: "price_voucher", value: "priceVoucher" },
      {
        name: "market_factory_config",
        value: coinConfig.marketFactoryConfigId,
      },
      { name: "py_state", value: coinConfig.pyStateId },
      { name: "market_state", value: coinConfig.marketStateId },
      { name: "clock", value: "0x6" },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  tx.moveCall({
    target: moveCallInfo.target,
    arguments: [
      tx.pure.u64(netSyIn),
      priceVoucher,
      tx.object(coinConfig.marketFactoryConfigId),
      tx.object(coinConfig.pyStateId),
      tx.object(coinConfig.marketStateId),
      tx.object("0x6"),
    ],
    typeArguments: [coinConfig.syCoinType],
  })

  const result = await suiClient.devInspectTransactionBlock({
    sender: defaultAddress,
    transactionBlock: await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    }),
  })

  const debugInfo: DebugInfo = {
    moveCall: [priceVoucherInfo, moveCallInfo],
    rawResult: result,
  }

  if (result.error) {
    const error = new Error(result.error) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  if (!result?.results?.[1]?.returnValues?.[0]) {
    const message = "Failed to get pt value"
    if (debugInfo.rawResult) {
      debugInfo.rawResult.error = message
    }
    const error = new Error(message) as ContractError
    error.debugInfo = debugInfo
    throw error
  }

  const ptAmount = bcs.U64.parse(
    new Uint8Array(result.results[1].returnValues[0][0]),
  )

  debugInfo.parsedOutput = ptAmount

  return (debug ? [ptAmount, debugInfo] : ptAmount) as DryRunResult<T>
} 