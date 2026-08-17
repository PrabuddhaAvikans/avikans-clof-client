import { DEFAULT_COUNTRY } from "@/lib/countries";

/** How a country's tax is labelled and split on financial summaries. */
export type TaxComponentConfig = {
  /** Short code shown in UI, e.g. VAT, SGST, CGST */
  code: string;
  /** Fraction of total tax amount (must sum to 1 across components). */
  share: number;
};

export type CountryConfig = {
  country: string;
  currency: string;
  locale: string;
  /** Generic tax name used in forms/columns (VAT, GST, Sales Tax). */
  taxName: string;
  /** Default statutory rate (%) used when line items don't specify one. */
  defaultTaxRate: number;
  /**
   * Display breakdown for tax totals.
   * Single-entry = one line (e.g. VAT). Multi-entry = split (e.g. SGST + CGST).
   */
  taxComponents: TaxComponentConfig[];
};

/**
 * Country-wise application configuration.
 * Change `DEFAULT_COUNTRY` (or look up by address country) to switch labels/currency.
 */
export const COUNTRY_CONFIG: Record<string, CountryConfig> = {
  "Sri Lanka": {
    country: "Sri Lanka",
    currency: "LKR",
    locale: "en-LK",
    taxName: "VAT",
    defaultTaxRate: 18,
    taxComponents: [{ code: "VAT", share: 1 }],
  },
  India: {
    country: "India",
    currency: "INR",
    locale: "en-IN",
    taxName: "GST",
    defaultTaxRate: 18,
    taxComponents: [
      { code: "SGST", share: 0.5 },
      { code: "CGST", share: 0.5 },
    ],
  },
  "United Arab Emirates": {
    country: "United Arab Emirates",
    currency: "AED",
    locale: "en-AE",
    taxName: "VAT",
    defaultTaxRate: 5,
    taxComponents: [{ code: "VAT", share: 1 }],
  },
  Singapore: {
    country: "Singapore",
    currency: "SGD",
    locale: "en-SG",
    taxName: "GST",
    defaultTaxRate: 9,
    taxComponents: [{ code: "GST", share: 1 }],
  },
  "United Kingdom": {
    country: "United Kingdom",
    currency: "GBP",
    locale: "en-GB",
    taxName: "VAT",
    defaultTaxRate: 20,
    taxComponents: [{ code: "VAT", share: 1 }],
  },
  "United States": {
    country: "United States",
    currency: "USD",
    locale: "en-US",
    taxName: "Sales Tax",
    defaultTaxRate: 0,
    taxComponents: [{ code: "Sales Tax", share: 1 }],
  },
};

export type TaxBreakdownLine = {
  code: string;
  /** e.g. "VAT (18%)" or "SGST (9%)" */
  label: string;
  amount: number;
  ratePercent: number;
};

export function getCountryConfig(country: string = DEFAULT_COUNTRY): CountryConfig {
  return COUNTRY_CONFIG[country] ?? COUNTRY_CONFIG[DEFAULT_COUNTRY];
}

/** Operating-country config for the app (seller/company country). */
export function getAppCountryConfig(): CountryConfig {
  return getCountryConfig(DEFAULT_COUNTRY);
}

/**
 * Build display rows for a tax total using country tax-component shares.
 * `effectiveTaxRate` is the overall rate applied to the taxable amount (e.g. 18).
 */
export function getTaxBreakdownLines(
  taxAmount: number,
  effectiveTaxRate: number,
  country: string = DEFAULT_COUNTRY,
): TaxBreakdownLine[] {
  const config = getCountryConfig(country);

  return config.taxComponents.map((component) => {
    const ratePercent = effectiveTaxRate * component.share;
    const rateLabel =
      Number.isInteger(ratePercent) || Math.abs(ratePercent - Math.round(ratePercent)) < 0.005
        ? String(Math.round(ratePercent))
        : ratePercent.toFixed(2);

    return {
      code: component.code,
      label: `${component.code} (${rateLabel}%)`,
      amount: taxAmount * component.share,
      ratePercent,
    };
  });
}

/** Overall effective rate from pre-tax base and tax amount; falls back to country default. */
export function resolveEffectiveTaxRate(
  taxAmount: number,
  taxableAmount: number,
  country: string = DEFAULT_COUNTRY,
): number {
  if (taxableAmount > 0 && taxAmount > 0) {
    return (taxAmount / taxableAmount) * 100;
  }
  return getCountryConfig(country).defaultTaxRate;
}
