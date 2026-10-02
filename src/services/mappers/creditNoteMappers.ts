import type {
  CreditNote,
  CreditNoteApplication,
  CreditNoteLineItem,
} from "@/types/credit-note";

export function mapLineItem(raw: Record<string, unknown>): CreditNoteLineItem {
  return {
    id: String(raw.id),
    productId: raw.productId == null ? undefined : String(raw.productId),
    productSku: raw.productSku as string | undefined,
    productName: String(raw.productName ?? ""),
    description: raw.description as string | undefined,
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unitPrice ?? 0),
    taxPercent: Number(raw.taxPercent ?? 0),
    lineTotal: Number(raw.lineTotal ?? 0),
  };
}

export function mapApplication(raw: Record<string, unknown>): CreditNoteApplication {
  return {
    id: String(raw.id),
    invoiceId: String(raw.invoiceId),
    invoiceNumber: String(raw.invoiceNumber ?? ""),
    amount: Number(raw.amount ?? 0),
    note: String(raw.note ?? ""),
    appliedAt: String(raw.appliedAt ?? new Date().toISOString()),
    appliedBy: String(raw.appliedBy ?? ""),
    appliedByName: String(raw.appliedByName ?? ""),
  };
}

export function mapCreditNote(raw: Record<string, unknown>): CreditNote {
  return {
    id: String(raw.id),
    creditNoteNumber: String(raw.creditNoteNumber ?? ""),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    customerEmail: String(raw.customerEmail ?? ""),
    invoiceId: raw.invoiceId == null ? undefined : String(raw.invoiceId),
    invoiceNumber: raw.invoiceNumber as string | undefined,
    salesOrderId: raw.salesOrderId == null ? undefined : String(raw.salesOrderId),
    salesOrderNumber: raw.salesOrderNumber as string | undefined,
    status: (raw.status as CreditNote["status"]) ?? "draft",
    reason: (raw.reason as CreditNote["reason"]) ?? "other",
    issueDate: raw.issueDate == null ? undefined : String(raw.issueDate),
    lineItems: ((raw.lineItems as unknown[]) ?? []).map((item) =>
      mapLineItem(item as Record<string, unknown>),
    ),
    subtotal: Number(raw.subtotal ?? 0),
    taxAmount: Number(raw.taxAmount ?? 0),
    totalAmount: Number(raw.totalAmount ?? 0),
    appliedAmount: Number(raw.appliedAmount ?? 0),
    remainingAmount: Number(raw.remainingAmount ?? 0),
    currency: String(raw.currency ?? "LKR"),
    notes: raw.notes as string | undefined,
    applications: ((raw.applications as unknown[]) ?? []).map((item) =>
      mapApplication(item as Record<string, unknown>),
    ),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    issuedBy: raw.issuedBy as string | undefined,
    issuedByName: raw.issuedByName as string | undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}
