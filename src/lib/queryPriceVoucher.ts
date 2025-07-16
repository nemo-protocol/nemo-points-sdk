import { bcs } from "@mysten/sui/bcs"
import { ContractError } from "../types"
import type { DebugInfo } from "../types"
import { Transaction } from "@mysten/sui/transactions"
import { getPriceVoucher } from "./txHelper/price"
import type { CoinConfig } from "../types"

interface QueryPriceVoucherParams {
  coinConfig: CoinConfig
  suiClient: any // SuiClient instance
  defaultAddress: string
  caller?: string
}

export async function queryPriceVoucher(
  params: QueryPriceVoucherParams,
  debug: boolean = false,
): Promise<string | [string, DebugInfo]> {
  const { coinConfig, suiClient, defaultAddress, caller } = params

  if (!coinConfig) {
    throw new Error("Please select a pool")
  }

  const tx = new Transaction()
  tx.setSender(defaultAddress)

  const debugInfo: DebugInfo = {
    moveCall: [],
    rawResult: {},
  }

  try {
    const [, priceVoucherMoveCallInfo] = getPriceVoucher(
      tx,
      coinConfig,
      true, // returnDebugInfo = true to get [TransactionObjectArgument, MoveCallInfo]
    )

    debugInfo.moveCall = [priceVoucherMoveCallInfo]

    const result = await suiClient.devInspectTransactionBlock({
      sender: defaultAddress,
      transactionBlock: await tx.build({
        client: suiClient,
        onlyTransactionKind: true,
      }),
    })

    debugInfo.rawResult = result

    if (!debug) {
      console.log(
        `[${caller || 'queryPriceVoucher'}] queryPriceVoucher move call:`,
        debugInfo.moveCall,
      )
    }

    if (result?.error) {
      throw new ContractError(
        "queryPriceVoucher error: " + result.error,
        debugInfo,
      )
    }

    if (!result?.results?.[0]?.returnValues?.[0]) {
      const message = "Failed to get price voucher"
      debugInfo.rawResult.error = message
      throw new ContractError(message, debugInfo)
    }

    const outputVoucher = bcs.U128.parse(
      new Uint8Array(result.results[0].returnValues[0][0]),
    ).toString()

    debugInfo.parsedOutput = outputVoucher

    return debug ? [outputVoucher, debugInfo] : outputVoucher
  } catch (error) {
    console.log("queryPriceVoucher error", error)
    throw new Error("Failed to get price voucher")
  }
} 