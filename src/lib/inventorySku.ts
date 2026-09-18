import { InventoryItemType, type InventoryItemTypeValue } from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";

export const INVENTORY_SKU_PREFIX: Record<string, string> = {
  [InventoryItemType.raw_material]: "RM",
  [InventoryItemType.component]: "CMP",
  [InventoryItemType.sub_assembly]: "SA",
  [InventoryItemType.consumable]: "CON",
  [InventoryItemType.coating]: "CTG",
  [InventoryItemType.service]: "SVC",
  [InventoryItemType.packaging]: "PKG",
  [InventoryItemType.finished_product]: "FG",
  [InventoryItemType.reusable_scrap]: "SCR",
  [InventoryItemType.reprocessing_wip]: "WIP",
  [InventoryItemType.recovered_material]: "REC",
};

function slugFromName(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  return slug || "ITEM";
}

export function suggestInventorySku(
  itemType: string,
  name: string,
  existingSkus: string[] = [],
): string {
  const prefix = INVENTORY_SKU_PREFIX[itemType] ?? "INV";
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

export function isServiceItemType(itemType: string): boolean {
  return itemType === InventoryItemType.service;
}

export function deriveFormStockStatus(
  quantityOnHand: number,
  reorderLevel: number,
  trackStock: boolean,
): StockStatusValue {
  if (!trackStock) return "in_stock";
  if (quantityOnHand <= 0) return "out_of_stock";
  if (quantityOnHand <= reorderLevel) return "low_stock";
  return "in_stock";
}

export function isTrackedByDefault(itemType: InventoryItemTypeValue | string): boolean {
  return !isServiceItemType(itemType);
}
