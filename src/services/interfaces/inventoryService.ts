import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type {
  InventoryItem,
  StockMovement,
  StockMovementTypeValue,
} from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";

export interface InventoryListFilters extends PaginatedRequest {
  category?: string;
  stockStatus?: StockStatusValue;
  status?: EntityStatus;
  location?: string;
}

export interface InventoryFormData {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  location: string;
  supplier?: string;
  status: EntityStatus;
}

export interface StockMovementFilters extends PaginatedRequest {
  inventoryItemId?: string;
  type?: StockMovementTypeValue;
}

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
    reference?: { referenceType: string; referenceId: string; notes?: string },
  ): Promise<StockMovement>;
}
