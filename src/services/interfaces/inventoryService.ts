import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type {
  InventoryItem,
  InventoryItemTypeValue,
  InventoryPriceHistoryEntry,
  PricingMethodValue,
  StockMovement,
  StockMovementTrace,
  StockMovementTypeValue,
} from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";

export interface InventoryListFilters extends PaginatedRequest {
  category?: string;
  itemType?: InventoryItemTypeValue;
  stockStatus?: StockStatusValue;
  status?: EntityStatus;
  location?: string;
  warehouse?: string;
}

export interface InventoryFormData {
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
  warehouse: string;
  location: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  buyingPrice?: number;
  costPrice: number;
  pricingMethod: PricingMethodValue;
  markupPercent: number;
  markupFixedAmount: number;
  sellingPrice: number;
  pricingEffectiveDate: string;
  status: EntityStatus;
}

export interface StockMovementFilters extends PaginatedRequest {
  inventoryItemId?: string;
  type?: StockMovementTypeValue;
  referenceType?: string;
  referenceId?: string;
}

export type StockMovementReference = {
  referenceType: string;
  referenceId: string;
  notes?: string;
  trace?: StockMovementTrace;
};

export interface InventoryService {
  list(filters: InventoryListFilters): Promise<PaginatedResponse<InventoryItem>>;
  getById(id: string): Promise<InventoryItem>;
  create(data: InventoryFormData): Promise<InventoryItem>;
  update(id: string, data: Partial<InventoryFormData>): Promise<InventoryItem>;
  delete(id: string): Promise<void>;
  getLowStock(): Promise<InventoryItem[]>;
  listMovements(filters: StockMovementFilters): Promise<PaginatedResponse<StockMovement>>;
  recordMovement(
    inventoryItemId: string,
    type: StockMovementTypeValue,
    quantity: number,
    reference?: StockMovementReference,
  ): Promise<StockMovement>;
  getPriceHistory(inventoryItemId: string): Promise<InventoryPriceHistoryEntry[]>;
  findBySku(sku: string): Promise<InventoryItem | null>;
}
