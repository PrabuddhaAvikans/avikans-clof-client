import type { CreditNoteReasonValue, CreditNoteStatusValue } from "@/types/status";

export interface CreditNoteLineItem {
  id: string;
  productId?: string;
  productSku?: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  lineTotal: number;
}

export interface CreditNoteApplication {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  note: string;
  appliedAt: string;
  appliedBy: string;
  appliedByName: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  invoiceId?: string;
  invoiceNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  status: CreditNoteStatusValue;
  reason: CreditNoteReasonValue;
  issueDate?: string;
  lineItems: CreditNoteLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  currency: string;
  notes?: string;
  applications: CreditNoteApplication[];
  createdBy: string;
  createdByName: string;
  issuedBy?: string;
  issuedByName?: string;
  createdAt: string;
  updatedAt: string;
}
