import type { Product, ProductVersion } from "@/types/product";

export type ProductFulfillment = "existing" | "manufacture";

export function getProductFulfillment(
  product: Pick<Product, "productType" | "operations" | "bom">,
  version?: Pick<ProductVersion, "operations" | "bom">,
): ProductFulfillment {
  const operations = version?.operations ?? product.operations ?? [];
  const bom = version?.bom ?? product.bom ?? [];
  const hasRouting = operations.some((operation) => operation.isEnabled !== false);
  const hasBom = bom.length > 0;

  if (product.productType === "finished_good") {
    return "existing";
  }

  if (hasRouting || hasBom || product.productType === "custom_lighting") {
    return "manufacture";
  }

  return "existing";
}

export function productNeedsManufacturing(
  product: Pick<Product, "productType" | "operations" | "bom">,
  version?: Pick<ProductVersion, "operations" | "bom">,
): boolean {
  return getProductFulfillment(product, version) === "manufacture";
}

export function lineNeedsManufacturing(line: {
  requiresManufacturing?: boolean;
  isCustomized?: boolean;
}): boolean {
  if (line.isCustomized) return true;
  if (typeof line.requiresManufacturing === "boolean") {
    return line.requiresManufacturing;
  }
  return true;
}

export function orderNeedsManufacturing(
  lines: Array<{ requiresManufacturing?: boolean; isCustomized?: boolean }>,
): boolean {
  return lines.some((line) => lineNeedsManufacturing(line));
}

export function fulfillmentLabel(fulfillment: ProductFulfillment): string {
  return fulfillment === "manufacture" ? "Needs manufacturing" : "Existing product";
}
