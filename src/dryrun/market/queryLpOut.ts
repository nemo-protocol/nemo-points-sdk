import { Transaction } from "@mysten/sui/transactions"
import { bcs } from "@mysten/sui/bcs"
import type { CoinConfig } from "../../api/types"
import type { DebugInfo } from "../../api/types"
import { ContractError } from "../../api/types"

interface QueryLpOutParams {
  ptValue: string
  syValue: string
  coinConfig: CoinConfig
  // 需要传入的依赖
  suiClient: any // SuiClient instance
  defaultAddress: string
}

type QueryReturn<TDebug extends boolean> = TDebug extends true
  ? [string, DebugInfo]
  : [string]

export async function queryLpOut<TDebug extends boolean = false>(
  params: QueryLpOutParams,
  debug: TDebug = false as TDebug,
): Promise<QueryReturn<TDebug>> {
  const { ptValue, syValue, coinConfig, suiClient, defaultAddress } = params

  if (!coinConfig) {
    throw new Error("Please select a pool")
  }

  const tx = new Transaction()
  tx.setSender(defaultAddress)

  const moveCallInfo = {
    target: `${coinConfig.nemoContractId}::router::get_lp_out_from_mint_lp`,
    arguments: [
      { name: "pt_value", value: ptValue },
      { name: "sy_value", value: syValue },
      { name: "market_state_id", value: coinConfig.marketStateId },
    ],
    typeArguments: [coinConfig.syCoinType],
  }

  tx.moveCall({
    target: moveCallInfo.target,
    arguments: [
      tx.pure.u64(ptValue),
      tx.pure.u64(syValue),
      tx.object(coinConfig.marketStateId),
    ],
    typeArguments: moveCallInfo.typeArguments,
  })

  const result = await suiClient.devInspectTransactionBlock({
    sender: defaultAddress,
    transactionBlock: await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    }),
  })

  const debugInfo: DebugInfo = {
    moveCall: [moveCallInfo],
    rawResult: result,
  }

  if (result?.error) {
    throw new ContractError(result.error, debugInfo)
  }

  if (!result?.results?.[0]?.returnValues?.[0]) {
    const message = "Failed to get LP amount"
    debugInfo.rawResult.error = message
    throw new ContractError(message, debugInfo)
  }

  const outputAmount = bcs.U64.parse(
    new Uint8Array(result.results[0].returnValues[0][0]),
  )

  debugInfo.parsedOutput = outputAmount.toString()

  const returnValue = outputAmount.toString()

  return (
    debug ? [returnValue, debugInfo] : [returnValue]
  ) as QueryReturn<TDebug>
} 