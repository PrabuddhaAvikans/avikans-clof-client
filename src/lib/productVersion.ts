import type { Product, ProductSpecifications, ProductVersion } from "@/types/product";
import { ProductVersionStatus } from "@/types/status";

const LOCKED_VERSION_STATUSES = new Set<string>([
  "approved",
  "released",
]);

export function isVersionLocked(version: ProductVersion): boolean {
  return version.isLocked || LOCKED_VERSION_STATUSES.has(version.status);
}

export function isVersionEditable(version: ProductVersion): boolean {
  return !isVersionLocked(version);
}

export function getVersionById(product: Product, versionId: string): ProductVersion | undefined {
  return product.versions.find((version) => version.id === versionId);
}

export function getCurrentVersion(product: Product): ProductVersion {
  const current = getVersionById(product, product.currentVersionId);
  if (current) return current;
  return product.versions[product.versions.length - 1];
}

export function getReleasedVersion(product: Product): ProductVersion | undefined {
  return product.versions.find((version) => version.status === "released");
}

/** Prefer released, then approved, then the current version for manufacturing. */
export function getApprovedManufacturingVersion(product: Product): ProductVersion {
  return (
    product.versions.find((version) => version.status === "released") ??
    product.versions.find((version) => version.status === "approved") ??
    getCurrentVersion(product)
  );
}

export function getEditableVersion(product: Product): ProductVersion | undefined {
  return product.versions.find((version) => isVersionEditable(version));
}

export function syncProductFromVersion(product: Product, version: ProductVersion): Product {
  return {
    ...product,
    currentVersionId: version.id,
    basePrice: version.basePrice,
    costPrice: version.costPrice,
    images: version.images,
    bom: version.bom,
    operations: version.operations,
    attributes: version.attributes,
    weightKg: version.specifications.weightKg,
    dimensions: version.specifications.dimensions,
    leadTimeDays: version.leadTimeDays,
    minOrderQuantity: version.minOrderQuantity,
    tags: version.tags,
    updatedAt: version.updatedAt,
  };
}

export function specificationsFromLegacy(product: {
  weightKg?: number;
  dimensions?: string;
  attributes: { name: string; value: string; unit?: string }[];
}): ProductSpecifications {
  const attr = (name: string) =>
    product.attributes.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value;

  return {
    weightKg: product.weightKg,
    dimensions: product.dimensions,
    wattage: Number(attr("Wattage")) || undefined,
    colorTemperature: attr("Color Temperature"),
    cri: attr("CRI"),
    beamAngle: attr("Beam Angle"),
    ipRating: attr("IP Rating"),
    materialPrimary: attr("Material"),
    coatingFinish: attr("Coating Finish"),
    coatingProcess: attr("Coating Process"),
    voltage: attr("Input Voltage"),
    dimming: attr("Dimming"),
  };
}

export function getVersionStatusLabel(status: ProductVersion["status"]): string {
  return ProductVersionStatus[status]?.label ?? status.replace(/_/g, " ");
}
