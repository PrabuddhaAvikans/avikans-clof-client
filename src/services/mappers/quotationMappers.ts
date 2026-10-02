import type { QuotationFormData } from "@/services/interfaces/quotationService";
import {
  asRecord,
  mapAttachment,
  mapOptionalId,
  toApiAttachment,
  toApiOptionalId,
} from "@/services/mappers/common";
import type {
  Quotation,
  QuotationContactEntry,
  QuotationLineItem,
  QuotationRevision,
} from "@/types/quotation";

function mapQuotationLine(raw: Record<string, unknown>): QuotationLineItem {
  return {
    id: String(raw.id),
    productId: mapOptionalId(raw.productId),
    productSku: String(raw.productSku ?? ""),
    productName: String(raw.productName ?? ""),
    description: raw.description as string | undefined,
    productVersionId: raw.productVersionId == null ? undefined : String(raw.productVersionId),
    productVersionLabel: raw.productVersionLabel as string | undefined,
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unitPrice ?? 0),
    discountPercent: Number(raw.discountPercent ?? 0),
    taxPercent: Number(raw.taxPercent ?? 0),
    lineTotal: Number(raw.lineTotal ?? 0),
    isCustomized: Boolean(raw.isCustomized),
    customization: raw.customization
      ? (raw.customization as QuotationLineItem["customization"])
      : undefined,
    requiresManufacturing: Boolean(raw.requiresManufacturing),
  };
}

function mapContact(raw: Record<string, unknown>): QuotationContactEntry {
  return {
    id: String(raw.id),
    type: raw.type as QuotationContactEntry["type"],
    summary: String(raw.summary ?? ""),
    detail: raw.detail as string | undefined,
    contactedBy: String(raw.contactedBy ?? ""),
    contactedByName: String(raw.contactedByName ?? ""),
    contactedAt: String(raw.contactedAt ?? ""),
    outcome: raw.outcome as string | undefined,
  };
}

function mapRevision(raw: Record<string, unknown>): QuotationRevision {
  return {
    id: String(raw.id),
    versionNumber: Number(raw.versionNumber ?? 0),
    label: String(raw.label ?? ""),
    isCurrent: Boolean(raw.isCurrent),
    isDraft: Boolean(raw.isDraft),
    totalAmount: Number(raw.totalAmount ?? 0),
    currency: String(raw.currency ?? "LKR"),
    notes: raw.notes as string | undefined,
    createdAt: String(raw.createdAt ?? ""),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
  };
}

export function mapQuotation(raw: Record<string, unknown>): Quotation {
  const lineItems = Array.isArray(raw.lineItems)
    ? raw.lineItems.map((item) => mapQuotationLine(asRecord(item)))
    : [];
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map((item) => mapAttachment(asRecord(item)))
    : [];
  const contactHistory = Array.isArray(raw.contactHistory)
    ? raw.contactHistory.map((item) => mapContact(asRecord(item)))
    : [];
  const revisions = Array.isArray(raw.revisions)
    ? raw.revisions.map((item) => mapRevision(asRecord(item)))
    : [];

  return {
    id: String(raw.id),
    quotationNumber: String(raw.quotationNumber ?? ""),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    customerEmail: String(raw.customerEmail ?? ""),
    status: (raw.status as Quotation["status"]) ?? "draft",
    priority: (raw.priority as Quotation["priority"]) ?? "medium",
    lineItems,
    subtotal: Number(raw.subtotal ?? 0),
    discountAmount: Number(raw.discountAmount ?? 0),
    taxAmount: Number(raw.taxAmount ?? 0),
    totalAmount: Number(raw.totalAmount ?? 0),
    currency: String(raw.currency ?? "LKR"),
    validUntil: String(raw.validUntil ?? new Date().toISOString()),
    paymentStatus: (raw.paymentStatus as Quotation["paymentStatus"]) ?? "unpaid",
    billingAddress: (raw.billingAddress as Quotation["billingAddress"]) ?? {
      line1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    shippingAddress: raw.shippingAddress as Quotation["shippingAddress"],
    notes: raw.notes as string | undefined,
    termsAndConditions: raw.termsAndConditions as string | undefined,
    attachments,
    salesOrderId: raw.salesOrderId == null ? undefined : String(raw.salesOrderId),
    contactHistory,
    revisions,
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    sentAt: raw.sentAt as string | undefined,
    viewedAt: raw.viewedAt as string | undefined,
    acceptedAt: raw.acceptedAt as string | undefined,
    rejectionReason: raw.rejectionReason as string | undefined,
    rejectedAt: raw.rejectedAt as string | undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

/** Client form → CreateQuotationCommand / UpdateQuotationCommand body. */
export function toApiQuotationPayload(
  data: QuotationFormData | Partial<QuotationFormData>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...data };

  if (data.lineItems) {
    body.lineItems = data.lineItems.map((line) => {
      const item: Record<string, unknown> = {
        productId: toApiOptionalId(line.productId),
        productSku: line.productSku,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent ?? 0,
        taxPercent: line.taxPercent ?? 0,
        isCustomized: Boolean(line.isCustomized && line.customization),
        requiresManufacturing: line.requiresManufacturing ?? false,
      };
      if (line.description != null && line.description !== "") {
        item.description = line.description;
      }
      if (line.productVersionId) {
        item.productVersionId = toApiOptionalId(line.productVersionId);
      }
      if (line.productVersionLabel) {
        item.productVersionLabel = line.productVersionLabel;
      }
      // Never send customization: null — ASP.NET JsonElement/JsonNode binding rejects it.
      if (line.customization != null) {
        item.customization = line.customization;
      }
      return item;
    });
  }

  if (data.attachments) {
    body.attachments = data.attachments.map(toApiAttachment);
  }

  return body;
}
