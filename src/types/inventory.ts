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

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  location: string;
  supplier?: string;
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
