import type { EntityStatus } from "@/types/common";
import type { StockStatusValue } from "@/types/status";

export const StockMovementType = {
  receipt: "receipt",
  issue: "issue",
  transfer: "transfer",
  adjustment: "adjustment",
  reservation: "reservation",
  release: "release",
} as const;

export type StockMovementTypeValue =
  (typeof StockMovementType)[keyof typeof StockMovementType];

export const InventoryItemType = {
  raw_material: "raw_material",
  component: "component",
  sub_assembly: "sub_assembly",
  consumable: "consumable",
  coating: "coating",
  service: "service",
  packaging: "packaging",
  finished_product: "finished_product",
} as const;

export type InventoryItemTypeValue =
  (typeof InventoryItemType)[keyof typeof InventoryItemType];

export const InventoryItemTypeLabels: Record<InventoryItemTypeValue, string> = {
  raw_material: "Raw Material",
  component: "Component",
  sub_assembly: "Sub Assembly",
  consumable: "Consumable",
  coating: "Coating",
  service: "Service",
  packaging: "Packaging",
  finished_product: "Finished Product",
};

export const PricingMethod = {
  percentage_markup: "percentage_markup",
  fixed_markup: "fixed_markup",
  manual: "manual",
} as const;

export type PricingMethodValue = (typeof PricingMethod)[keyof typeof PricingMethod];

export const PricingMethodLabels: Record<PricingMethodValue, string> = {
  percentage_markup: "Percentage Markup",
  fixed_markup: "Fixed Amount Markup",
  manual: "Manual Final Price",
};

export interface InventoryPriceHistoryEntry {
  id: string;
  inventoryItemId: string;
  buyingPrice?: number;
  costPrice: number;
  sellingPrice: number;
  pricingMethod: PricingMethodValue;
  markupPercent: number;
  markupFixedAmount: number;
  effectiveDate: string;
  changedBy: string;
  changedByName: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  itemType: InventoryItemTypeValue;
  unit: string;
  brand?: string;
  supplier?: string;
  taxCode?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  warehouse: string;
  location: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  /** Optional purchase price from supplier */
  buyingPrice?: number;
  /** Cost price used for BOM / manufacturing costing */
  costPrice: number;
  /**
   * @deprecated Use costPrice. Kept in sync for backward compatibility with BOM and legacy UI.
   */
  unitCost: number;
  pricingMethod: PricingMethodValue;
  markupPercent: number;
  markupFixedAmount: number;
  /** Direct inventory sales price — separate from cost price */
  sellingPrice: number;
  pricingEffectiveDate: string;
  stockStatus: StockStatusValue;
  status: EntityStatus;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemSku: string;
  type: StockMovementTypeValue;
  quantity: number;
  unit: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}

/** Ensures costPrice and unitCost stay aligned for backward compatibility. */
export function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  const costPrice = item.costPrice ?? item.unitCost ?? 0;
  return {
    ...item,
    costPrice,
    unitCost: costPrice,
    quantityAvailable: item.quantityOnHand - item.quantityReserved,
  };
}
