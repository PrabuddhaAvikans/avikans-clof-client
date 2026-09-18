import type { InventoryItem } from "@/types/inventory";
import { PricingMethod } from "@/types/inventory";
import type { InventoryFormValues } from "@/features/inventory/schemas/inventorySchema";
import { DEFAULT_WAREHOUSE_NAME } from "@/lib/warehouses";

export function createDefaultInventoryFormValues(): InventoryFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    sku: "",
    name: "",
    description: "",
    category: "",
    itemType: "component",
    unit: "pcs",
    brand: "",
    supplier: "",
    taxCode: "",
    quantityOnHand: 0,
    warehouse: DEFAULT_WAREHOUSE_NAME,
    trackStock: true,
    minStock: 0,
    maxStock: 100,
    reorderLevel: 10,
    reorderQuantity: 50,
    buyingPrice: undefined,
    costPrice: 0,
    pricingMethod: PricingMethod.percentage_markup,
    markupPercent: 20,
    markupFixedAmount: 0,
    sellingPrice: 0,
    pricingEffectiveDate: today,
    status: "active",
  };
}

export function inventoryItemToFormValues(item: InventoryItem): InventoryFormValues {
  return {
    sku: item.sku,
    name: item.name,
    description: item.description ?? "",
    category: item.category,
    itemType: item.itemType,
    unit: item.unit,
    brand: item.brand ?? "",
    supplier: item.supplier ?? "",
    taxCode: item.taxCode ?? "",
    quantityOnHand: item.quantityOnHand,
    warehouse: item.warehouse,
    trackStock: item.itemType !== "service",
    minStock: item.minStock,
    maxStock: item.maxStock,
    reorderLevel: item.reorderLevel,
    reorderQuantity: item.reorderQuantity,
    buyingPrice: item.buyingPrice,
    costPrice: item.costPrice,
    pricingMethod: item.pricingMethod,
    markupPercent: item.markupPercent,
    markupFixedAmount: item.markupFixedAmount,
    sellingPrice: item.sellingPrice,
    pricingEffectiveDate: item.pricingEffectiveDate,
    status: item.status,
  };
}
