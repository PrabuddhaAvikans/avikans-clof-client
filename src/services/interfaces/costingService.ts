import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { CoatingLineItem, CostingRequest, EstimationMaterial } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import type { CoatingStatusValue, CostingRequestStatusValue } from "@/types/status";

export interface CostingListFilters extends PaginatedRequest {
  status?: CostingRequestStatusValue;
  coatingStatus?: CoatingStatusValue;
  salesOrderId?: string;
  linkedToSalesOrder?: boolean;
}

export type EstimationMaterialInput = Pick<
  EstimationMaterial,
  | "id"
  | "inventoryItemId"
  | "inventoryItemName"
  | "sku"
  | "quantity"
  | "unit"
  | "wastePercent"
  | "unitCost"
  | "isRequired"
  | "alternativeItemId"
  | "alternativeItemName"
  | "notes"
  | "salesOrderLineItemId"
  | "sourceType"
  | "sourceProductName"
  | "productVersionLabel"
>;

export type CoatingSubmitData = {
  items: Array<
    Pick<
      CoatingLineItem,
      "id" | "productId" | "productName" | "finish" | "process" | "quantity" | "unitCost"
    >
  >;
  materials?: EstimationMaterialInput[];
  notes?: string;
};

export interface CostingService {
  list(filters: CostingListFilters): Promise<PaginatedResponse<CostingRequest>>;
  getById(id: string): Promise<CostingRequest>;
  getBySalesOrderId(salesOrderId: string): Promise<CostingRequest | null>;
  createFromSalesOrder(order: SalesOrder): Promise<CostingRequest>;
  syncFromSalesOrder(order: SalesOrder): Promise<CostingRequest>;
  submitCoating(id: string, data: CoatingSubmitData): Promise<CostingRequest>;
  approve(id: string, comment?: string): Promise<CostingRequest>;
  reject(id: string, comment: string): Promise<CostingRequest>;
  requestChanges(id: string, comment: string): Promise<CostingRequest>;
  updateNotes(id: string, notes: string): Promise<CostingRequest>;
  addComment(id: string, comment: string): Promise<CostingRequest>;
}
