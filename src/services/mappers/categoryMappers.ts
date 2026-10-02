import type { Category } from "@/types/category";

export function mapCategory(raw: Record<string, unknown>): Category {
  return {
    id: String(raw.id),
    name: String(raw.name),
    slug: String(raw.slug),
    description: raw.description as string | undefined,
    parentId: raw.parentId == null ? null : String(raw.parentId),
    parentName: raw.parentName as string | undefined,
    sortOrder: Number(raw.sortOrder ?? 0),
    status: (raw.status as Category["status"]) ?? "active",
    productCount: Number(raw.productCount ?? 0),
    imageUrl: raw.imageUrl as string | undefined,
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.modifiedOnUtc ?? new Date().toISOString()),
  };
}
