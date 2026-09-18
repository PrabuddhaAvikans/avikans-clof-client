export const PRODUCT_SKU_PREFIX: Record<string, string> = {
  custom_lighting: "CL",
  standard_fixture: "FIX",
  finished_good: "FG",
  component_kit: "KIT",
  component: "CMP",
  raw_material: "RM",
  service: "SVC",
};

function slugFromName(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  return slug || "PROD";
}

export function suggestProductSku(
  productType: string,
  name: string,
  existingSkus: string[] = [],
): string {
  const prefix = PRODUCT_SKU_PREFIX[productType] ?? "PRD";
  const slug = slugFromName(name);
  const taken = new Set(existingSkus.map((sku) => sku.trim().toUpperCase()));
  let sequence = 1;
  let candidate = `${prefix}-${slug}-${String(sequence).padStart(3, "0")}`;
  while (taken.has(candidate)) {
    sequence += 1;
    candidate = `${prefix}-${slug}-${String(sequence).padStart(3, "0")}`;
  }
  return candidate;
}
