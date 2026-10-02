import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { CreditNote, CreditNoteLineItem } from "@/types/credit-note";
import type { CreditNoteReasonValue, CreditNoteStatusValue } from "@/types/status";

export interface CreditNoteListFilters extends PaginatedRequest {
  status?: CreditNoteStatusValue;
  customerId?: string;
  invoiceId?: string;
}

export type CreditNoteLineItemInput = Omit<CreditNoteLineItem, "id" | "lineTotal"> & {
  id?: string;
  lineTotal?: number;
};

export interface CreditNoteFormData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  invoiceId?: string;
  invoiceNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  reason: CreditNoteReasonValue;
  lineItems: CreditNoteLineItemInput[];
  currency?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface CreditNoteUpdateData {
  reason?: CreditNoteReasonValue;
  invoiceId?: string;
  invoiceNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  lineItems?: CreditNoteLineItemInput[];
  currency?: string;
  notes?: string;
}

export interface ApplyCreditNoteInput {
  invoiceId: string;
  amount: number;
  note?: string;
  appliedBy?: string;
  appliedByName?: string;
}

export interface IssueCreditNoteInput {
  issuedBy?: string;
  issuedByName?: string;
}

export interface CreditNoteService {
  list(filters: CreditNoteListFilters): Promise<PaginatedResponse<CreditNote>>;
  getById(id: string): Promise<CreditNote>;
  create(data: CreditNoteFormData): Promise<CreditNote>;
  update(id: string, data: CreditNoteUpdateData): Promise<CreditNote>;
  issue(id: string, data?: IssueCreditNoteInput): Promise<CreditNote>;
  void(id: string): Promise<CreditNote>;
  apply(id: string, data: ApplyCreditNoteInput): Promise<CreditNote>;
}
