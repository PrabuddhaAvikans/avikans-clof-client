import type { Invoice, InvoiceLineItem } from "@/types/invoice";

export function mapLineItem(raw: Record<string, unknown>): InvoiceLineItem {
  return {
    id: String(raw.id),
    productId: String(raw.productId),
    productSku: String(raw.productSku ?? ""),
    productName: String(raw.productName ?? ""),
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unitPrice ?? 0),
    taxPercent: Number(raw.taxPercent ?? 0),
    lineTotal: Number(raw.lineTotal ?? 0),
  };
}

export function mapInvoice(raw: Record<string, unknown>): Invoice {
  return {
    id: String(raw.id),
    invoiceNumber: String(raw.invoiceNumber ?? ""),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    customerEmail: String(raw.customerEmail ?? ""),
    salesOrderId: raw.salesOrderId == null ? undefined : String(raw.salesOrderId),
    salesOrderNumber: raw.salesOrderNumber as string | undefined,
    status: (raw.status as Invoice["status"]) ?? "draft",
    issueDate: String(raw.issueDate ?? new Date().toISOString()),
    dueDate: String(raw.dueDate ?? new Date().toISOString()),
    lineItems: ((raw.lineItems as unknown[]) ?? []).map((item) =>
      mapLineItem(item as Record<string, unknown>),
    ),
    subtotal: Number(raw.subtotal ?? 0),
    taxAmount: Number(raw.taxAmount ?? 0),
    totalAmount: Number(raw.totalAmount ?? 0),
    amountPaid: Number(raw.amountPaid ?? 0),
    amountCredited: Number(raw.amountCredited ?? 0),
    outstandingAmount: Number(raw.outstandingAmount ?? 0),
    currency: String(raw.currency ?? "LKR"),
    notes: raw.notes as string | undefined,
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}
