import {
  companyDetailLines,
  documentLetterFooter,
  documentLogoUrl,
  type CommercialDocument,
} from "@/lib/commercialDocument";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SystemSettings } from "@/lib/systemSettings";
import type { Invoice } from "@/types/invoice";
import { getStatusLabel, InvoiceStatus } from "@/types/status";

export function buildInvoiceDocument(
  invoice: Invoice,
  company: SystemSettings,
): CommercialDocument {
  const money = (amount: number) => formatCurrency(amount, invoice.currency);
  const totals: CommercialDocument["totals"] = [
    { label: "Subtotal", value: money(invoice.subtotal) },
    { label: "Tax", value: money(invoice.taxAmount) },
    { label: "Total", value: money(invoice.totalAmount), emphasize: true },
    { label: "Amount paid", value: money(invoice.amountPaid) },
  ];

  if (invoice.amountCredited > 0) {
    totals.push({ label: "Credited", value: money(invoice.amountCredited) });
  }

  totals.push({
    label: "Outstanding",
    value: money(invoice.outstandingAmount),
    emphasize: true,
  });

  return {
    kind: "Invoice",
    number: invoice.invoiceNumber,
    companyName: company.companyName,
    logoUrl: documentLogoUrl(company),
    companyLines: companyDetailLines(company),
    meta: [
      { label: "Issue date", value: formatDate(invoice.issueDate) },
      { label: "Due date", value: formatDate(invoice.dueDate) },
      { label: "Status", value: getStatusLabel(InvoiceStatus, invoice.status) },
      ...(invoice.salesOrderNumber
        ? [{ label: "Sales order", value: invoice.salesOrderNumber }]
        : []),
    ],
    billTo: {
      heading: "Bill to",
      lines: [invoice.customerName, invoice.customerEmail].filter(Boolean),
    },
    columns: [
      { label: "#", width: 0.4, align: "left" },
      { label: "Description", width: 2.6, align: "left" },
      { label: "Qty", width: 0.6, align: "right" },
      { label: "Unit Price", width: 1.15, align: "right" },
      { label: "Tax %", width: 0.7, align: "right" },
      { label: "Line Total", width: 1.2, align: "right" },
    ],
    rows: invoice.lineItems.map((item, index) => [
      String(index + 1),
      `${item.productName}\n${item.productSku}`,
      String(item.quantity),
      money(item.unitPrice),
      `${item.taxPercent}%`,
      money(item.lineTotal),
    ]),
    totals,
    notes: invoice.notes,
    terms: company.paymentTerms,
    letterFooter: documentLetterFooter(company),
    signatures: [
      { label: "Authorized signature", name: company.companyName },
      { label: "Customer", name: invoice.customerName },
    ],
  };
}
