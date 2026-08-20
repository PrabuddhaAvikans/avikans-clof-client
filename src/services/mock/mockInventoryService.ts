import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type {
  InventoryFormData,
  InventoryService,
  StockMovementFilters,
} from "@/services/interfaces/inventoryService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialInventoryItems } from "@/services/mock/data/inventory";
import { initialInventoryPriceHistory } from "@/services/mock/data/inventory-price-history";
import {
  buildInventoryItemFromForm,
  createPriceHistoryEntry,
  hasPricingChanged,
  resolveSellingPrice,
} from "@/services/mock/inventoryHelpers";
import { initialStockMovements } from "@/services/mock/data/stock-movements";
import type {
  InventoryItem,
  InventoryPriceHistoryEntry,
  StockMovement,
} from "@/types/inventory";
import { normalizeInventoryItem } from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";

let inventoryItems = cloneData(initialInventoryItems).map(normalizeInventoryItem);
let stockMovements = cloneData(initialStockMovements);
let priceHistory = cloneData(initialInventoryPriceHistory);

function computeStockStatus(item: InventoryItem): StockStatusValue {
  if (item.quantityAvailable <= 0) return "out_of_stock";
  if (item.quantityAvailable <= item.reorderLevel) return "low_stock";
  if (item.quantityReserved > 0) return "reserved";
  return "in_stock";
}

function refreshStockStatus(item: InventoryItem): InventoryItem {
  return normalizeInventoryItem({
    ...item,
    stockStatus: computeStockStatus({
      ...item,
      quantityAvailable: item.quantityOnHand - item.quantityReserved,
    }),
  });
}

function applyFormData(item: InventoryItem, data: Partial<InventoryFormData>): InventoryItem {
  const merged = { ...item, ...data };
  const costPrice = data.costPrice ?? item.costPrice;
  const pricingMethod = data.pricingMethod ?? item.pricingMethod;
  const markupPercent = data.markupPercent ?? item.markupPercent;
  const markupFixedAmount = data.markupFixedAmount ?? item.markupFixedAmount;
  const sellingPrice = resolveSellingPrice({
    costPrice,
    pricingMethod,
    markupPercent,
    markupFixedAmount,
    sellingPrice: data.sellingPrice ?? item.sellingPrice,
  });

  return refreshStockStatus({
    ...merged,
    costPrice,
    unitCost: costPrice,
    pricingMethod,
    markupPercent,
    markupFixedAmount,
    sellingPrice,
    pricingEffectiveDate: data.pricingEffectiveDate ?? item.pricingEffectiveDate,
    updatedAt: nowIso(),
  });
}

function recordPriceHistoryIfChanged(previous: InventoryItem, next: InventoryItem): void {
  if (!hasPricingChanged(previous, next)) return;
  const timestamp = nowIso();
  priceHistory.unshift(createPriceHistoryEntry(next, generateId("iph"), timestamp));
}

export const mockInventoryService: InventoryService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      inventoryItems,
      filters,
      ["name", "sku", "description", "category", "location", "warehouse", "brand"],
      (item) => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.itemType && item.itemType !== filters.itemType) return false;
        if (filters.stockStatus && item.stockStatus !== filters.stockStatus) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.location && item.location !== filters.location) return false;
        if (filters.warehouse && item.warehouse !== filters.warehouse) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const item = inventoryItems.find((i) => i.id === id);
    if (!item) notFoundError("InventoryItem", id);
    return item;
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const item = refreshStockStatus(
      buildInventoryItemFromForm(generateId("inv"), data, {
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
    inventoryItems.push(item);
    priceHistory.unshift(createPriceHistoryEntry(item, generateId("iph"), timestamp));
    return item;
  },

  async update(id, data) {
    await delay();
    const index = inventoryItems.findIndex((i) => i.id === id);
    if (index === -1) notFoundError("InventoryItem", id);
    const previous = inventoryItems[index];
    const next = applyFormData(previous, data);
    recordPriceHistoryIfChanged(previous, next);
    inventoryItems[index] = next;
    return next;
  },

  async delete(id) {
    await delay();
    const index = inventoryItems.findIndex((i) => i.id === id);
    if (index === -1) notFoundError("InventoryItem", id);
    inventoryItems[index] = {
      ...inventoryItems[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },

  async getLowStock() {
    await delay();
    return inventoryItems.filter(
      (item) =>
        item.status === "active" &&
        (item.stockStatus === "low_stock" || item.stockStatus === "out_of_stock"),
    );
  },

  async listMovements(filters: StockMovementFilters) {
    await delay();
    return applyListQuery(
      stockMovements,
      filters,
      ["inventoryItemName", "inventoryItemSku", "notes"],
      (item) => {
        if (filters.inventoryItemId && item.inventoryItemId !== filters.inventoryItemId) {
          return false;
        }
        if (filters.type && item.type !== filters.type) return false;
        return true;
      },
    );
  },

  async recordMovement(inventoryItemId, type, quantity, reference) {
    await delay();
    const index = inventoryItems.findIndex((i) => i.id === inventoryItemId);
    if (index === -1) notFoundError("InventoryItem", inventoryItemId);

    const item = inventoryItems[index];
    const delta = type === "issue" || type === "reservation" ? -Math.abs(quantity) : quantity;

    if (type === "reservation") {
      item.quantityReserved += Math.abs(quantity);
    } else if (type === "release") {
      item.quantityReserved = Math.max(0, item.quantityReserved - Math.abs(quantity));
    } else {
      item.quantityOnHand += delta;
    }

    inventoryItems[index] = refreshStockStatus({
      ...item,
      updatedAt: nowIso(),
    });

    const movement: StockMovement = {
      id: generateId("sm"),
      inventoryItemId,
      inventoryItemName: item.name,
      inventoryItemSku: item.sku,
      type,
      quantity: Math.abs(quantity),
      unit: item.unit,
      referenceType: reference?.referenceType,
      referenceId: reference?.referenceId,
      notes: reference?.notes,
      performedBy: "usr-001",
      performedByName: "Prabuddha Jayawardhana",
      performedAt: nowIso(),
    };
    stockMovements.unshift(movement);
    return movement;
  },

  async getPriceHistory(inventoryItemId) {
    await delay();
    const item = inventoryItems.find((i) => i.id === inventoryItemId);
    if (!item) notFoundError("InventoryItem", inventoryItemId);
    return priceHistory
      .filter((entry) => entry.inventoryItemId === inventoryItemId)
      .sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
      );
  },
};
