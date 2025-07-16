import { ContractError } from "../types"
import type { DebugInfo } from "../types"

// Update GetObjectParams type definition
interface GetObjectParams {
  objectId: string
  options?: any
  typeArguments?: string[]
}

type ExtendedGetObjectParams<TData = unknown, TResult = TData> = GetObjectParams & {
  format?: (data: TData) => TResult;
  suiClient: any // SuiClient instance
}

type FetchObjectReturn<TResult, TDebug extends boolean> = TDebug extends true 
  ? [TResult, DebugInfo] 
  : TResult;

export async function fetchObject<TData = unknown, TResult = TData, TDebug extends boolean = false>(
  params: ExtendedGetObjectParams<TData, TResult>,
  debug: TDebug = false as TDebug,
): Promise<FetchObjectReturn<TResult, TDebug>> {
  const {
    objectId,
    options,
    typeArguments = [],
    format,
    suiClient,
  } = params

  const debugInfo: DebugInfo = {
    moveCall: [{
      target: "get_object",
      arguments: [
        {
          name: "object_id",
          value: objectId,
        },
      ],
      typeArguments,
    }],
    rawResult: {
      error: undefined,
      results: [],
    },
  }

  try {
    const response = await suiClient.getObject({
      id: objectId,
      options,
    })

    // Record raw result
    debugInfo.rawResult = {
      error: undefined,
      results: [response],
    }

    if ("error" in response && response.error) {
      const message = String(response.error)
      debugInfo.rawResult.error = message
      throw new ContractError(message, debugInfo)
    }

    const data = response.data as TData
    
    if (!data) {
      const message = "Object not found"
      debugInfo.rawResult.error = message
      throw new ContractError(message, debugInfo)
    }

    // Process data with format function if provided
    const processedData = format ? format(data) : data as unknown as TResult
    debugInfo.parsedOutput = JSON.stringify(processedData)
    return (debug ? [processedData, debugInfo] : processedData) as FetchObjectReturn<TResult, TDebug>
  } catch (error) {
    debugInfo.rawResult = {
      error: error instanceof Error ? error.message : String(error),
    }
    throw new ContractError(
      error instanceof Error ? error.message : String(error),
      debugInfo,
    )
  }
} 