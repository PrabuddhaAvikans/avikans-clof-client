import { format, isValid, parseISO } from "date-fns";
import { getAppCountryConfig } from "@/lib/countryConfig";

const appCountry = getAppCountryConfig();
const DEFAULT_LOCALE = appCountry.locale;
export const APP_CURRENCY = appCountry.currency;
const DEFAULT_CURRENCY = APP_CURRENCY;

function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatCurrency(
  amount: number,
  _currency: string = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: APP_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactAmount(value: number): string {
  if (!value) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return formatNumber(value);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(
  value: number,
  fractionDigits = 1,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export function formatDate(
  value: Date | string | number,
  pattern = "MMM d, yyyy",
): string {
  const date = toDate(value);
  if (!date) {
    return "-";
  }

  return format(date, pattern);
}

export function formatDateTime(
  value: Date | string | number,
  pattern = "MMM d, yyyy h:mm a",
): string {
  const date = toDate(value);
  if (!date) {
    return "-";
  }

  return format(date, pattern);
}
