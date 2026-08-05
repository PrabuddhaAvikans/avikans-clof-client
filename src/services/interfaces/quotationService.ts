import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  Quotation,
  QuotationContactEntry,
  QuotationContactType,
  QuotationLineItem,
} from "@/types/quotation";
import type {
  PriorityValue,
  QuotationStatusValue,
} from "@/types/status";
import type { SalesOrder } from "@/types/sales-order";

export interface QuotationListFilters extends PaginatedRequest {
  status?: QuotationStatusValue;
  customerId?: string;
  priority?: PriorityValue;
}

export interface QuotationFormData {
  customerId: string;
  lineItems: Omit<QuotationLineItem, "id" | "lineTotal">[];
  validUntil: string;
  priority: PriorityValue;
  notes?: string;
  termsAndConditions?: string;
  discountAmount?: number;
  status?: QuotationStatusValue;
}

export interface QuotationContactInput {
  type: QuotationContactType;
  summary: string;
  detail?: string;
  outcome?: string;
}

export interface QuotationService {
  list(filters: QuotationListFilters): Promise<PaginatedResponse<Quotation>>;
  getById(id: string): Promise<Quotation>;
  create(data: QuotationFormData): Promise<Quotation>;
  update(id: string, data: Partial<QuotationFormData>): Promise<Quotation>;
  delete(id: string): Promise<void>;
  send(id: string): Promise<Quotation>;
  convertToSalesOrder(id: string): Promise<SalesOrder>;
  addContactEntry(id: string, data: QuotationContactInput): Promise<Quotation>;
}
