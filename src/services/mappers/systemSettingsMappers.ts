import type { SystemSettings } from "@/lib/systemSettings";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/systemSettings";

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

export function mapSystemSettings(raw: Record<string, unknown>): SystemSettings {
  return {
    companyName: asString(raw.companyName, DEFAULT_SYSTEM_SETTINGS.companyName),
    tagline: asString(raw.tagline, DEFAULT_SYSTEM_SETTINGS.tagline),
    email: asString(raw.email, DEFAULT_SYSTEM_SETTINGS.email),
    phone: asString(raw.phone, DEFAULT_SYSTEM_SETTINGS.phone),
    website: asString(raw.website, DEFAULT_SYSTEM_SETTINGS.website),
    address: asString(raw.address, DEFAULT_SYSTEM_SETTINGS.address),
    taxRegistration: asString(raw.taxRegistration, DEFAULT_SYSTEM_SETTINGS.taxRegistration),
    logoUrl: asString(raw.logoUrl, DEFAULT_SYSTEM_SETTINGS.logoUrl),
    appSubtitle: asString(raw.appSubtitle, DEFAULT_SYSTEM_SETTINGS.appSubtitle),
    country: asString(raw.country, DEFAULT_SYSTEM_SETTINGS.country),
    taxRate: asNumber(raw.taxRate, DEFAULT_SYSTEM_SETTINGS.taxRate),
    quotationValidityDays: asNumber(
      raw.quotationValidityDays,
      DEFAULT_SYSTEM_SETTINGS.quotationValidityDays,
    ),
    paymentTermsDays: asNumber(raw.paymentTermsDays, DEFAULT_SYSTEM_SETTINGS.paymentTermsDays),
    paymentTerms: asString(raw.paymentTerms, DEFAULT_SYSTEM_SETTINGS.paymentTerms),
    pricesIncludeTax: asBoolean(raw.pricesIncludeTax, DEFAULT_SYSTEM_SETTINGS.pricesIncludeTax),
    autoExpireQuotations: asBoolean(
      raw.autoExpireQuotations,
      DEFAULT_SYSTEM_SETTINGS.autoExpireQuotations,
    ),
    quotationPrefix: asString(raw.quotationPrefix, DEFAULT_SYSTEM_SETTINGS.quotationPrefix),
    salesOrderPrefix: asString(raw.salesOrderPrefix, DEFAULT_SYSTEM_SETTINGS.salesOrderPrefix),
    jobPrefix: asString(raw.jobPrefix, DEFAULT_SYSTEM_SETTINGS.jobPrefix),
    deliveryPrefix: asString(raw.deliveryPrefix, DEFAULT_SYSTEM_SETTINGS.deliveryPrefix),
    allowConcurrentWork: asBoolean(
      raw.allowConcurrentWork,
      DEFAULT_SYSTEM_SETTINGS.allowConcurrentWork,
    ),
    maxConcurrentTasks: Math.max(
      1,
      Math.floor(asNumber(raw.maxConcurrentTasks, DEFAULT_SYSTEM_SETTINGS.maxConcurrentTasks)),
    ),
  };
}
