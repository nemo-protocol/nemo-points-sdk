import Decimal from "decimal.js";
import type { CoinConfig } from "../types/coin";

/**
 * Utility functions for liquidity management workflows
 * Extracted from common patterns in market operations
 */

/**
 * Check if a market has reached maturity (expired)
 */
export function isMarketExpired(coinConfig: CoinConfig): boolean {
    if (!coinConfig.maturity) {
        return false;
    }
    return new Decimal(coinConfig.maturity).lt(Date.now());
}

/**
 * Calculate time until maturity
 */
export function getTimeToMaturity(coinConfig: CoinConfig): {
    days: number;
    hours: number;
    isExpired: boolean;
} {
    if (!coinConfig.maturity) {
        return { days: 0, hours: 0, isExpired: false };
    }

    const maturityTimestamp = parseInt(coinConfig.maturity);
    const currentTimestamp = Date.now();
    const timeDiff = maturityTimestamp - currentTimestamp;

    if (timeDiff <= 0) {
        return { days: 0, hours: 0, isExpired: true };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours, isExpired: false };
}

/**
 * Determine optimal action for PT tokens based on maturity and market conditions
 */
export function getOptimalPtAction(params: {
    coinConfig: CoinConfig;
    ptAmount: string;
    currentPtPrice?: string;
    currentSyPrice?: string;
}): {
    action: "redeem" | "swap" | "hold";
    reason: string;
} {
    const { coinConfig, ptAmount } = params;

    if (new Decimal(ptAmount).lte(0)) {
        return { action: "hold", reason: "No PT tokens to process" };
    }

    const { isExpired } = getTimeToMaturity(coinConfig);

    if (isExpired) {
        return {
            action: "redeem",
            reason: "Market has expired, redeem PT tokens directly"
        };
    }

    // For non-expired markets, default to swap (could be enhanced with price comparison)
    return {
        action: "swap",
        reason: "Market not expired, swap PT for SY for immediate liquidity"
    };
}

/**
 * Validate liquidity operation parameters
 */
export function validateLiquidityParams(params: {
    amount: string;
    slippage?: string;
    minOut?: string;
}): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    const { amount, slippage, minOut } = params;

    // Validate amount
    if (!amount || new Decimal(amount).lte(0)) {
        errors.push("Amount must be greater than 0");
    }

    // Validate slippage
    if (slippage && (new Decimal(slippage).lt(0) || new Decimal(slippage).gt(100))) {
        errors.push("Slippage must be between 0 and 100 percent");
    }

    // Validate minOut
    if (minOut && new Decimal(minOut).lt(0)) {
        errors.push("Minimum output amount cannot be negative");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculate estimated slippage based on pool conditions
 */
export function calculateEstimatedSlippage(params: {
    inputAmount: string;
    poolLiquidity?: string;
    volatility?: string;
}): {
    estimatedSlippage: string;
    confidence: "high" | "medium" | "low";
} {
    const { inputAmount, poolLiquidity = "0", volatility = "0" } = params;

    // Simple estimation - in reality this would use more sophisticated formulas
    const inputDecimal = new Decimal(inputAmount);
    const liquidityDecimal = new Decimal(poolLiquidity);

    if (liquidityDecimal.eq(0)) {
        return { estimatedSlippage: "0", confidence: "low" };
    }

    // Basic slippage estimation: larger trades relative to liquidity = higher slippage
    const ratio = inputDecimal.div(liquidityDecimal);
    const baseSlippage = ratio.mul(100); // Convert to percentage
    const volatilityAdjusted = baseSlippage.mul(new Decimal(volatility).add(1));

    return {
        estimatedSlippage: volatilityAdjusted.toFixed(2),
        confidence: ratio.lt(0.01) ? "high" : ratio.lt(0.05) ? "medium" : "low"
    };
}

/**
 * Format amounts for display
 */
export function formatLiquidityAmount(amount: string, decimals: number = 9): {
    formatted: string;
    scientific: string;
    short: string;
} {
    const decimal = new Decimal(amount);
    const divisor = new Decimal(10).pow(decimals);
    const humanReadable = decimal.div(divisor);

    return {
        formatted: humanReadable.toFixed(4),
        scientific: humanReadable.toExponential(2),
        short: humanReadable.gt(1000000)
            ? `${humanReadable.div(1000000).toFixed(2)}M`
            : humanReadable.gt(1000)
                ? `${humanReadable.div(1000).toFixed(2)}K`
                : humanReadable.toFixed(2)
    };
}

/**
 * Determine receiving token type based on user preference and market conditions
 */
export function getOptimalReceivingType(params: {
    userPreference?: "underlying" | "sy";
    coinConfig: CoinConfig;
    amount: string;
    minValue?: string;
}): {
    receivingType: "underlying" | "sy";
    reason: string;
} {
    const { userPreference, coinConfig, amount, minValue = "0" } = params;

    // Check if underlying is supported
    const supportsUnderlying = !coinConfig.provider?.includes("NoUnderlying");

    if (!supportsUnderlying) {
        return {
            receivingType: "sy",
            reason: "Underlying token not supported for this protocol"
        };
    }

    // Check minimum value requirement
    if (new Decimal(amount).lt(minValue)) {
        return {
            receivingType: "sy",
            reason: `Amount below minimum threshold for underlying conversion (${minValue})`
        };
    }

    // Use user preference if valid
    if (userPreference === "underlying") {
        return {
            receivingType: "underlying",
            reason: "User preference for underlying token"
        };
    }

    return {
        receivingType: "sy",
        reason: userPreference === "sy" ? "User preference for SY token" : "Default to SY token"
    };
}

/**
 * Calculate minimum amounts with slippage protection
 */
export function calculateMinAmounts(params: {
    expectedAmount: string;
    slippagePercent: string;
    buffer?: string; // Additional buffer beyond slippage
}): {
    minAmount: string;
    maxSlippage: string;
    effectiveSlippage: string;
} {
    const { expectedAmount, slippagePercent, buffer = "0" } = params;

    const expected = new Decimal(expectedAmount);
    const slippage = new Decimal(slippagePercent).div(100); // Convert percentage to decimal
    const bufferDecimal = new Decimal(buffer);

    const totalSlippage = slippage.add(bufferDecimal);
    const minAmount = expected.mul(new Decimal(1).sub(totalSlippage));

    return {
        minAmount: minAmount.toFixed(0),
        maxSlippage: slippagePercent,
        effectiveSlippage: totalSlippage.mul(100).toFixed(2) // Convert back to percentage
    };
} 