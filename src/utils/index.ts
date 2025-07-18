import Decimal from "decimal.js";

/**
 * Checks if a string amount is valid (not empty, not "0", and is a valid number)
 * @param amount The amount string to check
 * @returns boolean indicating if the amount is valid
 */
export const isValidAmount = (
  amount?: string | number | Decimal | null
): boolean => {
  if (
    !amount ||
    amount === 0 ||
    amount === "" ||
    amount === "0" ||
    amount === "NaN" ||
    new Decimal(amount).isZero()
  )
    return false;
  const num = Number(amount);
  return !isNaN(num) && num > 0;
};

type DivideReturnType<T> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : Decimal;

/**
 * Safe division function that handles decimal operations
 */
export const safeDivide = <T extends "string" | "number" | "decimal">(
  numerator?: string | number | Decimal,
  denominator?: string | number | Decimal,
  returnType: T = "string" as T
): DivideReturnType<T> => {
  try {
    const num = new Decimal(numerator || 0);
    const den = new Decimal(denominator || 0);

    if (!isValidAmount(denominator)) {
      return (
        returnType === "string"
          ? "0"
          : returnType === "number"
          ? 0
          : new Decimal(0)
      ) as DivideReturnType<T>;
    }

    const result = num.div(den);

    return (
      returnType === "number"
        ? result.toNumber()
        : returnType === "decimal"
        ? result
        : result.toString()
    ) as DivideReturnType<T>;
  } catch {
    return (
      returnType === "string"
        ? "0"
        : returnType === "number"
        ? 0
        : new Decimal(0)
    ) as DivideReturnType<T>;
  }
};

/**
 * Split SY amount into PT and SY components
 */
export function splitSyAmount(
  syAmount: string,
  _lpSupply: string,
  _totalSy: string,
  _totalPt: string,
  exchangeRate: string,
  priceVoucher: string
): {
  syForPtValue: string;
  syValue: string;
  ptValue: string;
} {
  const syAmountDecimal = new Decimal(syAmount);
  const exchangeRateDecimal = new Decimal(exchangeRate);
  const priceVoucherDecimal = new Decimal(priceVoucher);

  // Calculate PT value based on exchange rate and price voucher
  const ptValue = syAmountDecimal
    .mul(exchangeRateDecimal)
    .div(priceVoucherDecimal);

  // Calculate SY value for PT
  const syForPtValue = ptValue
    .mul(priceVoucherDecimal)
    .div(exchangeRateDecimal);

  // Calculate remaining SY value
  const syValue = syAmountDecimal.sub(syForPtValue);

  return {
    syForPtValue: syForPtValue.toFixed(0),
    syValue: syValue.toFixed(0),
    ptValue: ptValue.toFixed(0),
  };
}
