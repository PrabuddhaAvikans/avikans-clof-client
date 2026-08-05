import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type {
  InventoryService,
  StockMovementFilters,
} from "@/services/interfaces/inventoryService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialInventoryItems } from "@/services/mock/data/inventory";
import { initialStockMovements } from "@/services/mock/data/stock-movements";
import type { InventoryItem, StockMovement } from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";

let inventoryItems = cloneData(initialInventoryItems);
let stockMovements = cloneData(initialStockMovements);

function computeStockStatus(item: InventoryItem): StockStatusValue {
  if (item.quantityAvailable <= 0) return "out_of_stock";
  if (item.quantityAvailable <= item.reorderLevel) return "low_stock";
  if (item.quantityReserved > 0) return "reserved";
  return "in_stock";
}

function refreshStockStatus(item: InventoryItem): InventoryItem {
  return {
    ...item,
    quantityAvailable: item.quantityOnHand - item.quantityReserved,
    stockStatus: computeStockStatus(item),
  };
}

export const mockInventoryService: InventoryService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      inventoryItems,
      filters,
      ["name", "sku", "description", "category", "location"],
      (item) => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.stockStatus && item.stockStatus !== filters.stockStatus) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.location && item.location !== filters.location) return false;
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
    const item = refreshStockStatus({
      id: generateId("inv"),
      ...data,
      quantityReserved: 0,
      quantityAvailable: data.quantityOnHand,
      stockStatus: "in_stock",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    inventoryItems.push(item);
    return item;
  },

  async update(id, data) {
    await delay();
    const index = inventoryItems.findIndex((i) => i.id === id);
    if (index === -1) notFoundError("InventoryItem", id);
    inventoryItems[index] = refreshStockStatus({
      ...inventoryItems[index],
      ...data,
      updatedAt: nowIso(),
    });
    return inventoryItems[index];
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
      performedByName: "John Doe",
      performedAt: nowIso(),
    };
    stockMovements.unshift(movement);
    return movement;
  },
};
