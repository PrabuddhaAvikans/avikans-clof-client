import { generateId } from "@/services/http";
import { migrateLegacyBomLine, normalizeBomLines } from "@/lib/bom";
import { specificationsFromLegacy, syncProductFromVersion } from "@/lib/productVersion";
import type {
  BomItem,
  CostBreakdown,
  Product,
  ProductFormData,
  ProductHeaderFormData,
  ProductImage,
  ProductOperationInput,
  ProductSpecifications,
  ProductVersion,
  ProductVersionFormData,
} from "@/types/product";
import { emptyCostBreakdown, computeTotalCost } from "@/types/product";
import type { ProductVersionStatusValue } from "@/types/status";

import type { ProductSeed, BomLineSeed } from "@/services/mock/data/products";

export function createVersionLabel(versionNumber: number): string {
  return `V${versionNumber}`;
}

export function createBomItems(
  items: ProductFormData["bom"] | undefined,
  idPrefix: string,
): BomItem[] {
  return normalizeBomLines(items, idPrefix);
}

export function createVersionFromFormData(
  productId: string,
  versionNumber: number,
  data: ProductFormData,
  timestamps: { createdAt: string; updatedAt: string },
  options?: {
    status?: ProductVersionStatusValue;
    isLocked?: boolean;
    images?: ProductImage[];
    revisionNotes?: string;
  },
): ProductVersion {
  const versionId = generateId("ver");
  const specifications: ProductSpecifications = {
    ...specificationsFromLegacy({
      weightKg: data.weightKg,
      dimensions: data.dimensions,
      attributes: data.attributes,
    }),
    ...data.specifications,
  };

  const status = options?.status ?? "draft";
  const isLocked = options?.isLocked ?? (status === "approved" || status === "released");

  return {
    id: versionId,
    productId,
    versionNumber,
    label: createVersionLabel(versionNumber),
    status,
    isLocked,
    specifications,
    bom: createBomItems(data.bom, versionId),
    operations: (data.operations ?? []).map((op, index) => ({
      id: op.id ?? `${versionId}-op-${index + 1}`,
      name: op.name,
      sequence: op.sequence ?? (index + 1) * 10,
      description: op.description,
      workstation: op.workstation || "",
      estimatedHours: op.estimatedHours,
      labourCostRate: op.labourCostRate,
      machineName: op.machineName,
      machineCost: op.machineCost,
      isRequired: op.isRequired ?? true,
      isEnabled: op.isEnabled ?? true,
      notes: op.notes,
      prerequisiteOperationIds: op.prerequisiteOperationIds,
      isQualityCheck: op.isQualityCheck,
    })),
    attributes: data.attributes.map((attr, index) => ({
      ...attr,
      id: `${versionId}-attr-${index + 1}`,
    })),
    costBreakdown: { ...emptyCostBreakdown(), ...data.costBreakdown },
    images: data.images ?? options?.images ?? [],
    basePrice: data.basePrice,
    costPrice: data.costBreakdown
      ? computeTotalCost({ ...emptyCostBreakdown(), ...data.costBreakdown })
      : data.costPrice,
    leadTimeDays: data.leadTimeDays,
    minOrderQuantity: data.minOrderQuantity,
    tags: data.tags,
    revisionNotes: options?.revisionNotes ?? data.revisionNotes,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    releasedAt: status === "released" ? timestamps.updatedAt : undefined,
    approvedAt: status === "approved" || status === "released" ? timestamps.updatedAt : undefined,
  };
}

export function createVersionFromExisting(
  source: ProductVersion,
  versionNumber: number,
  timestamp: string,
  revisionNotes?: string,
): ProductVersion {
  const versionId = generateId("ver");
  const operationIdMap = new Map(
    source.operations.map((op, index) => [op.id, `${versionId}-op-${index + 1}`]),
  );
  return {
    ...source,
    id: versionId,
    versionNumber,
    label: createVersionLabel(versionNumber),
    status: "draft",
    isLocked: false,
    bom: source.bom.map((item, index) =>
      migrateLegacyBomLine({ ...item, id: `${versionId}-bom-${index + 1}` }, index + 1),
    ),
    operations: source.operations.map((op, index) => ({
      ...op,
      id: operationIdMap.get(op.id) ?? `${versionId}-op-${index + 1}`,
      sequence: op.sequence ?? (index + 1) * 10,
      prerequisiteOperationIds: op.prerequisiteOperationIds
        ?.map((id) => operationIdMap.get(id) ?? id)
        .filter(Boolean),
    })),
    attributes: source.attributes.map((attr, index) => ({
      ...attr,
      id: `${versionId}-attr-${index + 1}`,
    })),
    images: source.images.map((image, index) => ({
      ...image,
      id: `${versionId}-img-${index + 1}`,
      sortOrder: index,
    })),
    revisionNotes: revisionNotes,
    createdAt: timestamp,
    updatedAt: timestamp,
    releasedAt: undefined,
    releasedBy: undefined,
    approvedAt: undefined,
  };
}

export function buildProductFromForm(
  id: string,
  data: ProductFormData,
  categoryName: string,
  brandName: string,
  timestamps: { createdAt: string; updatedAt: string },
  customerName?: string,
  createdBy = "usr-001",
): Product {
  const version = createVersionFromFormData(id, 1, data, timestamps);
  const header: Product = {
    id,
    sku: data.sku,
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    categoryName,
    brandId: data.brandId,
    brandName,
    productType: data.productType,
    customerId: data.customerId,
    customerName,
    projectId: data.projectId,
    projectName: data.projectName,
    currency: "LKR",
    status: data.status,
    currentVersionId: version.id,
    versions: [version],
    basePrice: 0,
    costPrice: 0,
    images: [],
    bom: [],
    operations: [],
    attributes: [],
    leadTimeDays: 0,
    minOrderQuantity: 1,
    tags: [],
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    createdBy,
  };
  return syncProductFromVersion(header, version);
}

export function applyVersionFormData(
  version: ProductVersion,
  data: ProductVersionFormData,
  timestamp: string,
): ProductVersion {
  const specifications = {
    ...version.specifications,
    ...(data.specifications ?? {}),
  };

  return {
    ...version,
    specifications,
    bom: data.bom ? createBomItems(data.bom, version.id) : version.bom,
    operations: data.operations
      ? (data.operations as ProductOperationInput[]).map((op, index) => ({
          id: op.id ?? `${version.id}-op-${index + 1}`,
          name: op.name,
          sequence: op.sequence ?? (index + 1) * 10,
          description: op.description,
          workstation: op.workstation || "",
          estimatedHours: op.estimatedHours,
          labourCostRate: op.labourCostRate,
          machineName: op.machineName,
          machineCost: op.machineCost,
          isRequired: op.isRequired ?? true,
          isEnabled: op.isEnabled ?? true,
          notes: op.notes,
          prerequisiteOperationIds: op.prerequisiteOperationIds,
          isQualityCheck: op.isQualityCheck,
        }))
      : version.operations,
    attributes: data.attributes
      ? data.attributes.map((attr, index) => ({
          ...attr,
          id: `${version.id}-attr-${index + 1}`,
        }))
      : version.attributes,
    costBreakdown: data.costBreakdown
      ? { ...version.costBreakdown, ...data.costBreakdown }
      : version.costBreakdown,
    basePrice: data.basePrice ?? version.basePrice,
    costPrice: data.costBreakdown
      ? computeTotalCost({ ...version.costBreakdown, ...data.costBreakdown })
      : (data.costPrice ?? version.costPrice),
    leadTimeDays: data.leadTimeDays ?? version.leadTimeDays,
    minOrderQuantity: data.minOrderQuantity ?? version.minOrderQuantity,
    tags: data.tags ?? version.tags,
    revisionNotes: data.revisionNotes ?? version.revisionNotes,
    images: data.images ?? version.images,
    updatedAt: timestamp,
  };
}

export function applyHeaderFormData(
  product: Product,
  data: ProductHeaderFormData,
  categoryName?: string,
  brandName?: string,
  customerName?: string,
  timestamp?: string,
): Product {
  return {
    ...product,
    sku: data.sku ?? product.sku,
    name: data.name ?? product.name,
    description: data.description ?? product.description,
    categoryId: data.categoryId ?? product.categoryId,
    categoryName: categoryName ?? product.categoryName,
    brandId: data.brandId ?? product.brandId,
    brandName: brandName ?? product.brandName,
    productType: data.productType ?? product.productType,
    customerId: data.customerId ?? product.customerId,
    customerName: customerName ?? product.customerName,
    projectId: data.projectId ?? product.projectId,
    projectName: data.projectName ?? product.projectName,
    status: data.status ?? product.status,
    updatedAt: timestamp ?? product.updatedAt,
  };
}

export function migrateLegacyProduct(product: ProductSeed): Product {
  const versionStatus: ProductVersionStatusValue =
    product.status === "active" ? "released" : "draft";
  const version: ProductVersion = {
    id: `${product.id}-ver-1`,
    productId: product.id,
    versionNumber: 1,
    label: "V1",
    status: versionStatus,
    isLocked: versionStatus === "released",
    specifications: specificationsFromLegacy(product),
    bom: (product.bom ?? []).map((item, index) => migrateLegacyBomLine(item, index + 1)),
    operations: (product.operations ?? []).map((op, index) => ({
      id: op.id ?? `${product.id}-op-${index + 1}`,
      name: op.name,
      sequence: op.sequence ?? (index + 1) * 10,
      description: op.description,
      workstation: op.workstation || "",
      estimatedHours: op.estimatedHours,
      labourCostRate: op.labourCostRate,
      machineName: op.machineName,
      machineCost: op.machineCost,
      isRequired: op.isRequired ?? true,
      isEnabled: op.isEnabled ?? true,
      notes: op.notes,
      prerequisiteOperationIds: op.prerequisiteOperationIds,
      isQualityCheck: op.isQualityCheck,
    })),
    attributes: product.attributes ?? [],
    images: product.images ?? [],
    costBreakdown: {
      ...emptyCostBreakdown(),
      materialCost: product.costPrice * 0.45,
      labourCost: product.costPrice * 0.20,
      coatingFinishingCost: product.costPrice * 0.10,
      machineCost: product.costPrice * 0.10,
      overheadCost: product.costPrice * 0.10,
      otherCost: product.costPrice * 0.05,
    },
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    leadTimeDays: product.leadTimeDays,
    minOrderQuantity: product.minOrderQuantity,
    tags: product.tags ?? [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    releasedAt: versionStatus === "released" ? product.updatedAt : undefined,
    approvedAt: versionStatus === "released" ? product.updatedAt : undefined,
  };

  const migrated: Product = {
    ...product,
    bom: [],
    operations: [],
    productType: product.productType ?? "custom_lighting",
    currentVersionId: version.id,
    versions: [version],
  };

  return syncProductFromVersion(migrated, version);
}

export function formDataFromProduct(product: Product): ProductFormData {
  const version = product.versions.find((v) => v.id === product.currentVersionId) ?? product.versions[0];
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    brandId: product.brandId,
    productType: product.productType,
    customerId: product.customerId,
    projectId: product.projectId,
    projectName: product.projectName,
    basePrice: version.basePrice,
    costPrice: version.costPrice,
    status: product.status,
    attributes: version.attributes.map(({ name, value, unit }) => ({ name, value, unit })),
    leadTimeDays: version.leadTimeDays,
    minOrderQuantity: version.minOrderQuantity,
    tags: version.tags,
    weightKg: version.specifications.weightKg,
    dimensions: version.specifications.dimensions,
    specifications: version.specifications,
    bom: version.bom.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      inventoryItemName: item.inventoryItemName,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      wastePercent: item.wastePercent,
      isRequired: item.isRequired,
      notes: item.notes,
      sequence: item.sequence,
      alternatives: item.alternatives.map(({ id: _id, ...alt }) => alt),
    })),
    operations: version.operations.map((op) => ({
      id: op.id,
      name: op.name,
      sequence: op.sequence,
      description: op.description,
      workstation: op.workstation,
      estimatedHours: op.estimatedHours,
      labourCostRate: op.labourCostRate,
      machineName: op.machineName,
      machineCost: op.machineCost,
      isRequired: op.isRequired,
      isEnabled: op.isEnabled,
      notes: op.notes,
      prerequisiteOperationIds: op.prerequisiteOperationIds,
      isQualityCheck: op.isQualityCheck,
    })),
    costBreakdown: version.costBreakdown,
    revisionNotes: version.revisionNotes,
    images: version.images,
  };
}

export function versionFormDataFromProductForm(
  values: ProductFormData,
): ProductVersionFormData {
  return {
    specifications: {
      ...values.specifications,
      weightKg: values.weightKg,
      dimensions: values.dimensions,
    },
    bom: values.bom,
    operations: values.operations,
    attributes: values.attributes,
    costBreakdown: values.costBreakdown,
    basePrice: values.basePrice,
    costPrice: values.costPrice,
    leadTimeDays: values.leadTimeDays,
    minOrderQuantity: values.minOrderQuantity,
    tags: values.tags,
    revisionNotes: values.revisionNotes,
    images: values.images,
  };
}
