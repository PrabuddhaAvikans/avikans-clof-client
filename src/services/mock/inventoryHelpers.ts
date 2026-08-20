import { calculateSellingPrice } from "@/lib/inventoryPricing";
import type { InventoryFormData } from "@/services/interfaces/inventoryService";
import type {
  InventoryItem,
  InventoryPriceHistoryEntry,
  PricingMethodValue,
} from "@/types/inventory";

export function resolveSellingPrice(data: {
  costPrice: number;
  pricingMethod: PricingMethodValue;
  markupPercent: number;
  markupFixedAmount: number;
  sellingPrice: number;
}): number {
  if (data.pricingMethod === "manual") {
    return data.sellingPrice;
  }
  return calculateSellingPrice(
    data.costPrice,
    data.pricingMethod,
    data.markupPercent,
    data.markupFixedAmount,
    data.sellingPrice,
  );
}

export function buildInventoryItemFromForm(
  id: string,
  data: InventoryFormData,
  timestamps: { createdAt: string; updatedAt: string },
): InventoryItem {
  const costPrice = data.costPrice;
  const sellingPrice = resolveSellingPrice({
    costPrice,
    pricingMethod: data.pricingMethod,
    markupPercent: data.markupPercent,
    markupFixedAmount: data.markupFixedAmount,
    sellingPrice: data.sellingPrice,
  });

  return {
    id,
    sku: data.sku,
    name: data.name,
    description: data.description,
    category: data.category,
    itemType: data.itemType,
    unit: data.unit,
    brand: data.brand,
    supplier: data.supplier,
    taxCode: data.taxCode,
    quantityOnHand: data.quantityOnHand,
    quantityReserved: 0,
    quantityAvailable: data.quantityOnHand,
    warehouse: data.warehouse,
    location: data.location,
    minStock: data.minStock,
    maxStock: data.maxStock,
    reorderLevel: data.reorderLevel,
    reorderQuantity: data.reorderQuantity,
    buyingPrice: data.buyingPrice,
    costPrice,
    unitCost: costPrice,
    pricingMethod: data.pricingMethod,
    markupPercent: data.markupPercent,
    markupFixedAmount: data.markupFixedAmount,
    sellingPrice,
    pricingEffectiveDate: data.pricingEffectiveDate,
    stockStatus: "in_stock",
    status: data.status,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function hasPricingChanged(
  previous: InventoryItem,
  next: Pick<
    InventoryItem,
    | "buyingPrice"
    | "costPrice"
    | "sellingPrice"
    | "pricingMethod"
    | "markupPercent"
    | "markupFixedAmount"
    | "pricingEffectiveDate"
  >,
): boolean {
  return (
    previous.buyingPrice !== next.buyingPrice ||
    previous.costPrice !== next.costPrice ||
    previous.sellingPrice !== next.sellingPrice ||
    previous.pricingMethod !== next.pricingMethod ||
    previous.markupPercent !== next.markupPercent ||
    previous.markupFixedAmount !== next.markupFixedAmount ||
    previous.pricingEffectiveDate !== next.pricingEffectiveDate
  );
}

export function createPriceHistoryEntry(
  item: InventoryItem,
  entryId: string,
  timestamp: string,
): InventoryPriceHistoryEntry {
  return {
    id: entryId,
    inventoryItemId: item.id,
    buyingPrice: item.buyingPrice,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    pricingMethod: item.pricingMethod,
    markupPercent: item.markupPercent,
    markupFixedAmount: item.markupFixedAmount,
    effectiveDate: item.pricingEffectiveDate,
    changedBy: "usr-001",
    changedByName: "Prabuddha Jayawardhana",
    createdAt: timestamp,
  };
}
