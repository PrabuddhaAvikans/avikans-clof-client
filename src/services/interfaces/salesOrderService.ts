import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { SalesOrder, SalesOrderLineItem } from "@/types/sales-order";
import type {
  PriorityValue,
  SalesOrderStatusValue,
} from "@/types/status";

export interface SalesOrderListFilters extends PaginatedRequest {
  status?: SalesOrderStatusValue;
  customerId?: string;
  priority?: PriorityValue;
  assignedTo?: string;
}

export interface SalesOrderFormData {
  customerId: string;
  quotationId?: string;
  quotationNumber?: string;
  lineItems: Omit<SalesOrderLineItem, "id" | "lineTotal" | "quantityDelivered" | "quantityInManufacturing">[];
  priority: PriorityValue;
  requestedDeliveryDate?: string;
  notes?: string;
  discountAmount?: number;
}

export interface SalesOrderService {
  list(filters: SalesOrderListFilters): Promise<PaginatedResponse<SalesOrder>>;
  getById(id: string): Promise<SalesOrder>;
  create(data: SalesOrderFormData): Promise<SalesOrder>;
  update(id: string, data: Partial<SalesOrderFormData>): Promise<SalesOrder>;
  delete(id: string): Promise<void>;
  confirm(id: string): Promise<SalesOrder>;
  cancel(id: string, reason?: string): Promise<SalesOrder>;
  assign(id: string, userId: string): Promise<SalesOrder>;
}
