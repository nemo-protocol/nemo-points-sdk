import { Decimal } from "decimal.js";
import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { getPriceVoucher } from "@/lib/txHelper/price";
import { initPyPosition } from "@/core/trade/initPyPosition";
import { redeemSyCoin, redeemInterest } from "@/core/market/redeem";
import { getCoinValue } from "@/lib/txHelper/coin";
import type { QueryYieldParams } from "@/types/position";

/**
 * Query YT Yield amount (simulate redeem_due_interest)
 */
export async function queryYield({
  client,
  config,
  address,
  ytBalance,
  pyPositions,
}: QueryYieldParams & { client: SuiClient }): Promise<{
  syValue: string;
  syAmount: string;
}> {
  if (!address) {
    throw new Error("Address is required");
  }
  if (!config) {
    throw new Error("config is required");
  }
  if (!ytBalance || ytBalance === "0") {
    throw new Error("No YT balance to claim");
  }

  try {
    const tx = new Transaction();
    tx.setSender(address);

    const { pyPosition, created } = initPyPosition({
      tx,
      config,
      pyPositions,
    });

    const [priceVoucher] = getPriceVoucher(tx, config);

    const syCoin = redeemInterest(tx, config, pyPosition, priceVoucher);

    const yieldToken = redeemSyCoin(tx, config, syCoin);

    getCoinValue(tx, yieldToken, config.coinType);

    if (created) {
      tx.transferObjects([pyPosition as any], address);
    }

    const result = await client.devInspectTransactionBlock({
      sender: address,
      transactionBlock: await tx.build({
        client: client,
        onlyTransactionKind: true,
      }),
    });

    if (result.error) {
      throw new Error(`Failed to query yield: ${result.error}`);
    }

    const lastResult = result.results?.[result.results.length - 1];
    if (!lastResult || lastResult?.returnValues?.[0][1] !== "u64") {
      throw new Error("Failed to get yield amount");
    }

    const decimal = Number(config.decimal);
    const syAmount = bcs.U64.parse(
      new Uint8Array(lastResult.returnValues[0][0])
    );
    const syValue = new Decimal(syAmount).div(10 ** decimal).toString();

    return { syAmount, syValue };
  } catch (error) {
    throw new Error(`Failed to query yield: ${error}`);
  }
}
