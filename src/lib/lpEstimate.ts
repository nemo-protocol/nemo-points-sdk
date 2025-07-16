import Decimal from "decimal.js"
import type { CoinConfig, MarketState } from "../types"
import { fetchObject } from "./fetchObject"
import { queryPriceVoucher } from "./queryPriceVoucher"
import { queryLpOut } from "./queryLpOut"
import { splitSyAmount } from "../utils.js"

// 定义响应数据类型
interface PyStateResponse {
  content: {
    fields: {
      py_index_stored: {
        fields: {
          value: string;
        };
      };
    };
  };
}

// 需要传入的依赖参数
interface EstimateLpOutParams {
  coinConfig: CoinConfig
  marketState: MarketState
  syAmount: string
  // 外部依赖
  suiClient: any
  defaultAddress: string
}

export async function estimateLpOut(params: EstimateLpOutParams) {
  const {
    coinConfig,
    marketState,
    syAmount,
    suiClient,
    defaultAddress,
  } = params

  if (!coinConfig) {
    throw new Error("Please select a pool")
  }
  if (!marketState) {
    throw new Error("Market state is required")
  }

  const exchangeRate = await fetchObject({
    objectId: coinConfig.pyStateId,
    options: { showContent: true },
    format: (data: PyStateResponse) => data?.content?.fields?.py_index_stored?.fields?.value || "0",
    suiClient,
  })

  const priceVoucherResult = await queryPriceVoucher({
    coinConfig,
    suiClient,
    defaultAddress,
    caller: "estimateLpOut",
  })
  
  const priceVoucher = typeof priceVoucherResult === 'string' ? priceVoucherResult : priceVoucherResult[0]

  const { syForPtValue, syValue, ptValue } = splitSyAmount(
    syAmount,
    marketState.lpSupply,
    marketState.totalSy,
    marketState.totalPt,
    exchangeRate,
    priceVoucher,
  )

  const lpAmount =
    marketState.lpSupply == "0"
      ? (Math.sqrt(Number(ptValue) * Number(syValue)) - 1000).toString()
      : (await queryLpOut({
          ptValue,
          syValue,
          coinConfig,
          suiClient,
          defaultAddress,
        }))[0]

  const lpValue = new Decimal(lpAmount)
    .div(10 ** Number(coinConfig?.decimal))
    .toString()

  return {
    lpAmount,
    lpValue,
    ptValue,
    syValue,
    syForPtValue,
  }
} 

