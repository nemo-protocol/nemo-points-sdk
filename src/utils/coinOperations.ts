import type {
    Transaction,
    TransactionObjectArgument,
} from "@mysten/sui/transactions";
import Decimal from "decimal.js";
import type { CoinData, MoveCallInfo } from "../api/types";
import type { CoinConfig } from "../types/coin";

// Provider-specific mint functions
import { mintSCoin as mintScallop } from "../dep/Scallop/mintSCoin";
import { mintSCoin as mintStrater } from "../dep/Strater/mintSCoin";
import { mintSCoin as mintAftermath } from "../dep/Aftermath/mintSCoin";
import { mintSCoin as mintSpringSui } from "../dep/SpringSui/mintSCoin";
import { mintSCoin as mintVolo } from "../dep/Volo/mintSCoin";
import { mintSCoin as mintHaedal } from "../dep/Haedal/mintSCoin";
import { mintSCoin as mintAlphaFi } from "../dep/AlphaFi/mintSCoin";
import { mintSCoin as mintMstable } from "../dep/Mstable/mintSCoin";
import { mintSCoin as mintWinter } from "../dep/Winter/mintSCoin";
import { mintSCoin as mintCetus } from "../dep/Cetus/mintSCoin";

// Provider-specific burn functions
import { burnSCoin as burnScallop } from "../dep/Scallop/burnSCoin";
import { burnSCoin as burnStrater } from "../dep/Strater/burnSCoin";
import { burnSCoin as burnAftermath } from "../dep/Aftermath/burnSCoin";
import { burnSCoin as burnSpringSui } from "../dep/SpringSui/burnSCoin";
import { burnSCoin as burnVolo } from "../dep/Volo/burnSCoin";
import { burnSCoin as burnHaedal } from "../dep/Haedal/burnSCoin";
import { burnSCoin as burnAlphaFi } from "../dep/AlphaFi/burnSCoin";
import { burnSCoin as burnMstable } from "../dep/Mstable/burnSCoin";
import { burnSCoin as burnWinter } from "../dep/Winter/burnSCoin";

/**
 * Coin Operations Utilities
 * Extracted from txHelper folder - reusable coin manipulation functions
 */

export interface CoinSplitOptions {
    coinData: CoinData[];
    amounts: string[];
    coinType?: string;
}

export interface ProviderMintOptions {
    amount: string | string[];
    address: string;
    vaultId?: string;
    slippage: string;
    limited: boolean;
    coinData: CoinData[];
    splitAmounts: string[];
    coinAmount: string | number;
}

export type MintSCoinResult<T extends boolean = false> = T extends true
    ? { coins: TransactionObjectArgument[]; debugInfo: MoveCallInfo[] }
    : TransactionObjectArgument[];

export type SupportedProvider =
    | "Scallop"
    | "Strater"
    | "Aftermath"
    | "SpringSui"
    | "Volo"
    | "Haedal"
    | "AlphaFi"
    | "Mstable"
    | "Winter"
    | "Cetus";

export const SUPPORTED_PROVIDERS: SupportedProvider[] = [
    "Scallop",
    "Strater",
    "Aftermath",
    "SpringSui",
    "Volo",
    "Haedal",
    "AlphaFi",
    "Mstable",
    "Winter",
    "Cetus"
];

/**
 * Enhanced coin splitting with proper type handling
 * Fixed transaction types to match @mysten/sui v1.36.0+
 */
export function splitCoinHelper(
    tx: Transaction,
    options: CoinSplitOptions
): TransactionObjectArgument[] {
    const { coinData, amounts } = options;

    if (!coinData || coinData.length === 0) {
        throw new Error("No coin data provided");
    }

    if (!amounts || amounts.length === 0) {
        throw new Error("No amounts provided for splitting");
    }

    // Convert string amounts to transaction arguments
    const amountArgs = amounts.map(amount => tx.pure.u64(amount));

    // Use the first coin as gas if no specific coins provided
    if (coinData.length === 0) {
        const results = tx.splitCoins(tx.gas, amountArgs);
        return Array.isArray(results) ? results : [results];
    } else {
        if (coinData.length === 1) {
            // Single coin - split it
            if (amounts.length === 1) {
                return [tx.object(coinData[0].coinObjectId)];
            } else {
                const results = tx.splitCoins(tx.object(coinData[0].coinObjectId), amountArgs);
                return Array.isArray(results) ? results : [results];
            }
        } else {
            // Multiple coins - use existing coins and split if needed
            const coinObjects = coinData.map(coin => tx.object(coin.coinObjectId));

            if (coinObjects.length >= amounts.length) {
                return coinObjects.slice(0, amounts.length);
            } else {
                // Need to split some coins
                const results = tx.splitCoins(coinObjects[0], amountArgs.slice(coinObjects.length - 1));
                const allCoins = [...coinObjects, ...(Array.isArray(results) ? results : [results])];
                return allCoins.slice(0, amounts.length);
            }
        }
    }
}

/**
 * Calculate total coin amount from coin data
 */
export function calculateTotalAmount(coinData: CoinData[]): string {
    return coinData.reduce((total, coin) => {
        return new Decimal(total).add(coin.balance).toString();
    }, "0");
}

/**
 * Deposit SY coin with appropriate handling
 */
export function depositSyCoin(
    _tx: Transaction,
    syCoin: TransactionObjectArgument
): TransactionObjectArgument {
    // For now, just return the SY coin
    // In the future, this could handle additional deposit logic
    return syCoin;
}

/**
 * Get coin value with decimal handling
 */
export function getCoinValue(amount: string, decimal: number = 9): string {
    return new Decimal(amount).div(new Decimal(10).pow(decimal)).toString();
}

/**
 * Provider-specific mint operations
 * Extracted from txHelper/coin.ts
 */
export async function mintMultiSCoin<T extends boolean = false>(
    tx: Transaction,
    config: CoinConfig,
    options: ProviderMintOptions & { debug?: T }
): Promise<MintSCoinResult<T>> {
    const { debug = false } = options;

    try {
        let result: any;

        // Create coin object from coinData
        const coin = tx.object(options.coinData[0].coinObjectId);

        // Ensure amount is a string (use first amount if array)
        const amount = Array.isArray(options.amount) ? options.amount[0] : options.amount;

        switch (config.provider) {
            case "Scallop":
                result = await mintScallop({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Strater":
                result = await mintStrater({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Aftermath":
                result = await mintAftermath({ tx, config, coin, amount, debug: options.debug });
                break;
            case "SpringSui":
                result = await mintSpringSui({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Volo":
                result = await mintVolo({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Haedal":
                result = await mintHaedal({ tx, config, coin, amount, debug: options.debug });
                break;
            case "AlphaFi":
                result = await mintAlphaFi({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Mstable":
                result = await mintMstable({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Winter":
                result = await mintWinter({ tx, config, coin, amount, debug: options.debug });
                break;
            case "Cetus":
                result = await mintCetus({ tx, config, coin, amount, address: options.address, slippage: options.slippage, debug: options.debug });
                break;
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }

        if (debug && Array.isArray(result) && result.length === 2) {
            return {
                coins: result[0],
                debugInfo: result[1]
            } as MintSCoinResult<T>;
        }

        return {
            coins: Array.isArray(result) ? result : [result]
        } as MintSCoinResult<T>;

    } catch (error) {
        throw new Error(`Failed to mint SCoin for provider ${config.provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Provider-specific burn operations
 * Extracted from txHelper/coin.ts
 */
export async function burnSCoin(
    tx: Transaction,
    config: CoinConfig,
    address: string,
    sCoin: TransactionObjectArgument
): Promise<TransactionObjectArgument> {
    try {
        let result: any;

        switch (config.provider) {
            case "Scallop":
                result = await burnScallop({ tx, config, address, sCoin });
                break;
            case "Strater":
                result = await burnStrater({ tx, config, address, sCoin });
                break;
            case "Aftermath":
                result = await burnAftermath({ tx, config, address, sCoin });
                break;
            case "SpringSui":
                result = await burnSpringSui({ tx, config, address, sCoin });
                break;
            case "Volo":
                result = await burnVolo({ tx, config, address, sCoin });
                break;
            case "Haedal":
                result = await burnHaedal({ tx, config, address, sCoin });
                break;
            case "AlphaFi":
                result = await burnAlphaFi({ tx, config, address, sCoin });
                break;
            case "Mstable":
                result = await burnMstable({ tx, config, address, sCoin });
                break;
            case "Winter":
                result = await burnWinter({ tx, config, address, sCoin });
                break;
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }

        return result;

    } catch (error) {
        throw new Error(`Failed to burn SCoin for provider ${config.provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Validate coin data and amounts
 */
export function validateCoinOperation(coinData: CoinData[], amounts: string[], _coinType?: string): void {
    if (!coinData || coinData.length === 0) {
        throw new Error("No coin data provided");
    }

    if (!amounts || amounts.length === 0) {
        throw new Error("No amounts provided");
    }

    const totalRequired = amounts.reduce(
        (sum, amount) => sum.add(amount),
        new Decimal(0)
    ).toString();
    const totalAvailable = coinData.reduce(
        (sum, coin) => sum.add(coin.balance),
        new Decimal(0)
    ).toString();

    if (new Decimal(totalAvailable).lt(totalRequired)) {
        throw new Error(`Insufficient balance. Required: ${totalRequired}, Available: ${totalAvailable}`);
    }
} 