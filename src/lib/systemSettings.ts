import { DEFAULT_COUNTRY } from "@/lib/countries";
import { getCountryConfig } from "@/lib/countryConfig";

export const SYSTEM_SETTINGS_UPDATED_EVENT = "ats-system-settings-updated";
export const DEFAULT_SYSTEM_LOGO = "/logo.png";

export type SystemSettings = {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  taxRegistration: string;
  logoUrl: string;
  appSubtitle: string;
  country: string;
  taxRate: number;
  quotationValidityDays: number;
  paymentTermsDays: number;
  paymentTerms: string;
  pricesIncludeTax: boolean;
  autoExpireQuotations: boolean;
  quotationPrefix: string;
  salesOrderPrefix: string;
  jobPrefix: string;
  deliveryPrefix: string;
  /**
   * When false, each employee may have one active work session.
   * Assignment to other tasks is still allowed.
   */
  allowConcurrentWork: boolean;
  /** Applied only when allowConcurrentWork is true. */
  maxConcurrentTasks: number;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: "AVIKANS SOLUTION",
  tagline: "Premium Lighting & Manufacturing",
  email: "info@avikans.lk",
  phone: "+94 11 000 0000",
  website: "www.avikans.lk",
  address: "Colombo, Sri Lanka",
  taxRegistration: "VAT 123456789",
  logoUrl: "",
  appSubtitle: "Custom Lighting Product Management",
  country: DEFAULT_COUNTRY,
  taxRate: getCountryConfig(DEFAULT_COUNTRY).defaultTaxRate,
  quotationValidityDays: 30,
  paymentTermsDays: 30,
  paymentTerms: "30% advance, 60% on delivery, 10% on installation",
  pricesIncludeTax: false,
  autoExpireQuotations: true,
  quotationPrefix: "QT",
  salesOrderPrefix: "SO",
  jobPrefix: "PJ",
  deliveryPrefix: "DL",
  allowConcurrentWork: false,
  maxConcurrentTasks: 1,
};

const STORAGE_KEY = "ats.systemSettings";

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function loadSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SYSTEM_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SystemSettings>;
    const country = asString(parsed.country, DEFAULT_SYSTEM_SETTINGS.country);
    return {
      companyName: asString(parsed.companyName, DEFAULT_SYSTEM_SETTINGS.companyName),
      tagline: asString(parsed.tagline, DEFAULT_SYSTEM_SETTINGS.tagline),
      email: asString(parsed.email, DEFAULT_SYSTEM_SETTINGS.email),
      phone: asString(parsed.phone, DEFAULT_SYSTEM_SETTINGS.phone),
      website: asString(parsed.website, DEFAULT_SYSTEM_SETTINGS.website),
      address: asString(parsed.address, DEFAULT_SYSTEM_SETTINGS.address),
      taxRegistration: asString(parsed.taxRegistration, DEFAULT_SYSTEM_SETTINGS.taxRegistration),
      logoUrl: asString(parsed.logoUrl, DEFAULT_SYSTEM_SETTINGS.logoUrl),
      appSubtitle: asString(parsed.appSubtitle, DEFAULT_SYSTEM_SETTINGS.appSubtitle),
      country,
      taxRate: asNumber(parsed.taxRate, getCountryConfig(country).defaultTaxRate),
      quotationValidityDays: asNumber(
        parsed.quotationValidityDays,
        DEFAULT_SYSTEM_SETTINGS.quotationValidityDays,
      ),
      paymentTermsDays: asNumber(
        parsed.paymentTermsDays,
        DEFAULT_SYSTEM_SETTINGS.paymentTermsDays,
      ),
      paymentTerms: asString(parsed.paymentTerms, DEFAULT_SYSTEM_SETTINGS.paymentTerms),
      pricesIncludeTax: asBoolean(
        parsed.pricesIncludeTax,
        DEFAULT_SYSTEM_SETTINGS.pricesIncludeTax,
      ),
      autoExpireQuotations: asBoolean(
        parsed.autoExpireQuotations,
        DEFAULT_SYSTEM_SETTINGS.autoExpireQuotations,
      ),
      quotationPrefix: asString(parsed.quotationPrefix, DEFAULT_SYSTEM_SETTINGS.quotationPrefix),
      salesOrderPrefix: asString(parsed.salesOrderPrefix, DEFAULT_SYSTEM_SETTINGS.salesOrderPrefix),
      jobPrefix: asString(parsed.jobPrefix, DEFAULT_SYSTEM_SETTINGS.jobPrefix),
      deliveryPrefix: asString(parsed.deliveryPrefix, DEFAULT_SYSTEM_SETTINGS.deliveryPrefix),
      allowConcurrentWork: asBoolean(
        parsed.allowConcurrentWork,
        DEFAULT_SYSTEM_SETTINGS.allowConcurrentWork,
      ),
      maxConcurrentTasks: Math.max(
        1,
        Math.floor(
          asNumber(parsed.maxConcurrentTasks, DEFAULT_SYSTEM_SETTINGS.maxConcurrentTasks),
        ),
      ),
    };
  } catch {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

export function saveSystemSettings(settings: SystemSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    throw new Error("Could not save settings. The logo file may be too large.");
  }
  window.dispatchEvent(new Event(SYSTEM_SETTINGS_UPDATED_EVENT));
}

export function resolveSystemLogoUrl(logoUrl?: string): string {
  return logoUrl?.trim() || DEFAULT_SYSTEM_LOGO;
}

export function quotationValidUntilDate(
  from = new Date(),
  days = loadSystemSettings().quotationValidityDays,
): string {
  const next = new Date(from);
  next.setDate(next.getDate() + Math.max(1, days));
  return next.toISOString().slice(0, 10);
}

export function formatDocumentNumber(
  prefix: string,
  sequence: number,
  options?: { year?: boolean; pad?: number },
): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(options?.pad ?? 4, "0");
  if (options?.year === false) {
    return `${prefix}-${sequence}`;
  }
  return `${prefix}-${year}-${padded}`;
}
