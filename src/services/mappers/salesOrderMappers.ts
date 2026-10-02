import type { SalesOrderFormData } from "@/services/interfaces/salesOrderService";
import { asRecord, mapOptionalId, toApiOptionalId } from "@/services/mappers/common";
import type { SalesOrder, SalesOrderLineItem } from "@/types/sales-order";

function mapSalesOrderLine(raw: Record<string, unknown>): SalesOrderLineItem {
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
    quantityDelivered: Number(raw.quantityDelivered ?? 0),
    quantityInManufacturing: Number(raw.quantityInManufacturing ?? 0),
    isCustomized: Boolean(raw.isCustomized),
    customization: raw.customization
      ? (raw.customization as SalesOrderLineItem["customization"])
      : undefined,
    requiresManufacturing: Boolean(raw.requiresManufacturing),
  };
}

export function mapSalesOrder(raw: Record<string, unknown>): SalesOrder {
  const lineItems = Array.isArray(raw.lineItems)
    ? raw.lineItems.map((item) => mapSalesOrderLine(asRecord(item)))
    : [];

  return {
    id: String(raw.id),
    orderNumber: String(raw.orderNumber ?? ""),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    customerEmail: String(raw.customerEmail ?? ""),
    quotationId: raw.quotationId == null ? undefined : String(raw.quotationId),
    quotationNumber: raw.quotationNumber as string | undefined,
    costingRequestId: raw.costingRequestId == null ? undefined : String(raw.costingRequestId),
    status: (raw.status as SalesOrder["status"]) ?? "draft",
    priority: (raw.priority as SalesOrder["priority"]) ?? "medium",
    lineItems,
    subtotal: Number(raw.subtotal ?? 0),
    discountAmount: Number(raw.discountAmount ?? 0),
    taxAmount: Number(raw.taxAmount ?? 0),
    totalAmount: Number(raw.totalAmount ?? 0),
    currency: String(raw.currency ?? "LKR"),
    paymentStatus: (raw.paymentStatus as SalesOrder["paymentStatus"]) ?? "unpaid",
    billingAddress: (raw.billingAddress as SalesOrder["billingAddress"]) ?? {
      line1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    shippingAddress: raw.shippingAddress as SalesOrder["shippingAddress"],
    requestedDeliveryDate: raw.requestedDeliveryDate as string | undefined,
    notes: raw.notes as string | undefined,
    assignedTo: raw.assignedTo == null ? undefined : String(raw.assignedTo),
    assignedToName: raw.assignedToName as string | undefined,
    manufacturingJobIds: ((raw.manufacturingJobIds as string[]) ?? []).map(String),
    deliveryIds: ((raw.deliveryIds as string[]) ?? []).map(String),
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    confirmedAt: raw.confirmedAt as string | undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

/** Client form → CreateSalesOrderCommand / UpdateSalesOrderCommand body. */
export function toApiSalesOrderPayload(
  data: SalesOrderFormData | Partial<SalesOrderFormData>,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...data };

  if (data.quotationId !== undefined) {
    body.quotationId = toApiOptionalId(data.quotationId);
  }

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
      // Never send customization: null — ASP.NET rejects JsonElement null binding.
      if (line.customization != null) {
        item.customization = line.customization;
      }
      return item;
    });
  }

  if (data.customerId !== undefined) {
    body.customerId = toApiOptionalId(data.customerId);
  }

  if (!data.requestedDeliveryDate) {
    delete body.requestedDeliveryDate;
  }

  delete body.customerName;
  delete body.deliveryAddress;
  delete body.requiresManufacturing;

  return body;
}
