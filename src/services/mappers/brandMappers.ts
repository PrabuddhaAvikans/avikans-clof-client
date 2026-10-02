import type { Brand } from "@/types/brand";

export function mapBrand(raw: Record<string, unknown>): Brand {
  return {
    id: String(raw.id),
    name: String(raw.name),
    slug: String(raw.slug),
    description: raw.description as string | undefined,
    logoUrl: raw.logoUrl as string | undefined,
    website: raw.website as string | undefined,
    countryOfOrigin: raw.countryOfOrigin as string | undefined,
    status: (raw.status as Brand["status"]) ?? "active",
    productCount: Number(raw.productCount ?? 0),
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.modifiedOnUtc ?? new Date().toISOString()),
  };
}
