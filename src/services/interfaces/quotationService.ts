import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  Quotation,
  QuotationContactType,
  QuotationLineItem,
} from "@/types/quotation";
import type {
  PriorityValue,
  QuotationStatusValue,
} from "@/types/status";
import type { SalesOrder } from "@/types/sales-order";
import type { Product } from "@/types/product";

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
  /** draft = keep as draft without a new version; save = record a revision. */
  saveMode?: "draft" | "save";
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
  /** Explicit optional action - does not run automatically on customization. */
  promoteCustomizationToProductVersion(
    quotationId: string,
    lineItemId: string,
    revisionNotes?: string,
  ): Promise<{ quotation: Quotation; product: Product }>;
  approveLineCustomization(
    quotationId: string,
    lineItemId: string,
    notes?: string,
  ): Promise<Quotation>;
}
