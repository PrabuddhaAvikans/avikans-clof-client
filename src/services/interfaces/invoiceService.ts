import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { Invoice, InvoiceLineItem } from "@/types/invoice";
import type { InvoiceStatusValue } from "@/types/status";

export interface InvoiceListFilters extends PaginatedRequest {
  status?: InvoiceStatusValue;
  customerId?: string;
}

export type InvoiceLineItemInput = Omit<InvoiceLineItem, "id" | "lineTotal"> & {
  id?: string;
  lineTotal?: number;
};

export interface InvoiceFormData {
  customerId: string;
  customerName: string;
  customerEmail: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItemInput[];
  currency?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface InvoiceUpdateData {
  issueDate?: string;
  dueDate?: string;
  lineItems?: InvoiceLineItemInput[];
  currency?: string;
  notes?: string;
}

export interface InvoiceService {
  list(filters: InvoiceListFilters): Promise<PaginatedResponse<Invoice>>;
  getById(id: string): Promise<Invoice>;
  create(data: InvoiceFormData): Promise<Invoice>;
  update(id: string, data: InvoiceUpdateData): Promise<Invoice>;
  issue(id: string): Promise<Invoice>;
  void(id: string): Promise<Invoice>;
  recordPayment(id: string, amount: number): Promise<Invoice>;
}
