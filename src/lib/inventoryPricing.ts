import type { PricingMethodValue } from "@/types/inventory";

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateSellingPrice(
  costPrice: number,
  pricingMethod: PricingMethodValue,
  markupPercent: number,
  markupFixedAmount: number,
  manualSellingPrice: number,
): number {
  const cost = Number(costPrice) || 0;

  switch (pricingMethod) {
    case "percentage_markup":
      return roundCurrency(cost * (1 + (Number(markupPercent) || 0) / 100));
    case "fixed_markup":
      return roundCurrency(cost + (Number(markupFixedAmount) || 0));
    case "manual":
      return roundCurrency(Number(manualSellingPrice) || 0);
    default:
      return roundCurrency(cost);
  }
}

export function calculateProfit(costPrice: number, sellingPrice: number): number {
  return roundCurrency((Number(sellingPrice) || 0) - (Number(costPrice) || 0));
}

/** Margin % = profit / selling price × 100 */
export function calculateMarginPercent(costPrice: number, sellingPrice: number): number {
  const selling = Number(sellingPrice) || 0;
  if (selling <= 0) return 0;
  return roundCurrency((calculateProfit(costPrice, selling) / selling) * 100);
}

export function calculateMarkupAmount(
  costPrice: number,
  pricingMethod: PricingMethodValue,
  markupPercent: number,
  markupFixedAmount: number,
): number {
  const cost = Number(costPrice) || 0;

  switch (pricingMethod) {
    case "percentage_markup":
      return roundCurrency(cost * ((Number(markupPercent) || 0) / 100));
    case "fixed_markup":
      return roundCurrency(Number(markupFixedAmount) || 0);
    default:
      return 0;
  }
}
