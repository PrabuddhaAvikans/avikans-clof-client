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
  reusable_scrap: "reusable_scrap",
  reprocessing_wip: "reprocessing_wip",
  recovered_material: "recovered_material",
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
  reusable_scrap: "Reusable Scrap",
  reprocessing_wip: "Under Reprocessing",
  recovered_material: "Recovered Material",
};

export const PRODUCTION_ISSUABLE_ITEM_TYPES: InventoryItemTypeValue[] = [
  InventoryItemType.raw_material,
  InventoryItemType.component,
  InventoryItemType.recovered_material,
  InventoryItemType.reusable_scrap,
];

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
  buyingPrice?: number;
  costPrice: number;
  unitCost: number;
  pricingMethod: PricingMethodValue;
  markupPercent: number;
  markupFixedAmount: number;
  sellingPrice: number;
  pricingEffectiveDate: string;
  stockStatus: StockStatusValue;
  status: EntityStatus;
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementTrace {
  sourceInventoryTransactionId?: string;
  sourceProductionOrderId?: string;
  sourceProductionBatchId?: string;
  sourceMaterialLotId?: string;
  reprocessingBatchId?: string;
  parentMaterialTransactionId?: string;
  unitCost?: number;
  carriedValue?: number;
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
  trace?: StockMovementTrace;
}

export function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  const costPrice = item.costPrice ?? item.unitCost ?? 0;
  return {
    ...item,
    costPrice,
    unitCost: costPrice,
    quantityAvailable: item.quantityOnHand - item.quantityReserved,
  };
}
