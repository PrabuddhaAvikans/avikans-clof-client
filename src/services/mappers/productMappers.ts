import type { BomItem, Product, ProductVersion } from "@/types/product";

function mapBomItem(raw: Record<string, unknown>): BomItem {
  const alternatives = ((raw.alternatives as unknown[]) ?? []).map((entry) => {
    const alt = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(alt.id ?? ""),
      inventoryItemId: String(alt.inventoryItemId ?? ""),
      inventoryItemName: String(alt.inventoryItemName ?? ""),
      sku: String(alt.sku ?? ""),
      unitCost: Number(alt.unitCost ?? 0),
      isApproved: Boolean(alt.isApproved),
      notes: alt.notes as string | undefined,
    };
  });

  return {
    id: String(raw.id ?? ""),
    inventoryItemId: String(raw.inventoryItemId ?? ""),
    inventoryItemName: String(raw.inventoryItemName ?? ""),
    sku: String(raw.sku ?? ""),
    quantity: Number(raw.quantity ?? 0),
    unit: String(raw.unit ?? "pcs"),
    unitCost: Number(raw.unitCost ?? 0),
    wastePercent: Number(raw.wastePercent ?? 0),
    requiredQuantity: Number(raw.requiredQuantity ?? raw.quantity ?? 0),
    lineCost: Number(raw.lineCost ?? 0),
    isRequired: raw.isRequired !== false,
    notes: raw.notes as string | undefined,
    sequence: Number(raw.sequence ?? 0),
    alternatives,
  };
}

export function mapVersion(raw: Record<string, unknown>): ProductVersion {
  return {
    id: String(raw.id),
    productId: String(raw.productId),
    versionNumber: Number(raw.versionNumber ?? 1),
    label: String(raw.label ?? `v${raw.versionNumber ?? 1}`),
    status: (raw.status as ProductVersion["status"]) ?? "draft",
    isLocked: Boolean(raw.isLocked),
    specifications: (raw.specifications as ProductVersion["specifications"]) ?? {},
    bom: ((raw.bom as unknown[]) ?? []).map((item) =>
      mapBomItem((item ?? {}) as Record<string, unknown>),
    ),
    operations: (raw.operations as ProductVersion["operations"]) ?? [],
    attributes: (raw.attributes as ProductVersion["attributes"]) ?? [],
    images: (raw.images as ProductVersion["images"]) ?? [],
    costBreakdown: (raw.costBreakdown as ProductVersion["costBreakdown"]) ?? {
      materialCost: 0,
      labourCost: 0,
      coatingFinishingCost: 0,
      machineCost: 0,
      overheadCost: 0,
      otherCost: 0,
      extraLines: [],
    },
    basePrice: Number(raw.basePrice ?? 0),
    costPrice: Number(raw.costPrice ?? 0),
    leadTimeDays: Number(raw.leadTimeDays ?? 0),
    minOrderQuantity: Number(raw.minOrderQuantity ?? 1),
    tags: ((raw.tags as string[]) ?? []).map(String),
    revisionNotes: raw.revisionNotes as string | undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    releasedAt: raw.releasedAt as string | undefined,
    releasedBy: raw.releasedBy as string | undefined,
    approvedAt: raw.approvedAt as string | undefined,
  };
}

export function mapProduct(raw: Record<string, unknown>): Product {
  const versions = ((raw.versions as unknown[]) ?? []).map((v) =>
    mapVersion(v as Record<string, unknown>),
  );
  return {
    id: String(raw.id),
    sku: String(raw.sku),
    name: String(raw.name),
    description: String(raw.description ?? ""),
    categoryId: String(raw.categoryId),
    categoryName: String(raw.categoryName ?? ""),
    brandId: String(raw.brandId ?? ""),
    brandName: String(raw.brandName ?? ""),
    productType: (raw.productType as Product["productType"]) ?? "finished_good",
    customerId: raw.customerId == null ? undefined : String(raw.customerId),
    customerName: raw.customerName as string | undefined,
    projectId: raw.projectId == null ? undefined : String(raw.projectId),
    projectName: raw.projectName as string | undefined,
    currency: String(raw.currency ?? "LKR"),
    status: (raw.status as Product["status"]) ?? "active",
    currentVersionId: String(raw.currentVersionId ?? versions[0]?.id ?? ""),
    versions,
    basePrice: Number(raw.basePrice ?? 0),
    costPrice: Number(raw.costPrice ?? 0),
    images: (raw.images as Product["images"]) ?? [],
    bom: (raw.bom as Product["bom"]) ?? [],
    operations: (raw.operations as Product["operations"]) ?? [],
    attributes: (raw.attributes as Product["attributes"]) ?? [],
    weightKg: raw.weightKg as number | undefined,
    dimensions: raw.dimensions as string | undefined,
    leadTimeDays: Number(raw.leadTimeDays ?? 0),
    minOrderQuantity: Number(raw.minOrderQuantity ?? 1),
    tags: ((raw.tags as string[]) ?? []).map(String),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    createdBy: String(raw.createdBy ?? "system"),
  };
}
