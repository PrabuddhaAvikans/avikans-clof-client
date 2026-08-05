import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { QuotationService } from "@/services/interfaces/quotationService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCustomers } from "@/services/mock/data/customers";
import { initialQuotations } from "@/services/mock/data/quotations";
import { mockSalesOrderService } from "@/services/mock/mockSalesOrderService";
import type { Quotation, QuotationContactEntry, QuotationLineItem } from "@/types/quotation";

let quotations = cloneData(initialQuotations);

function computeLineTotal(
  item: Pick<QuotationLineItem, "quantity" | "unitPrice" | "discountPercent" | "taxPercent">,
): number {
  const subtotal = item.quantity * item.unitPrice;
  const afterDiscount = subtotal * (1 - item.discountPercent / 100);
  return afterDiscount * (1 + item.taxPercent / 100);
}

function buildLineItems(
  items: Omit<QuotationLineItem, "id" | "lineTotal">[],
): QuotationLineItem[] {
  return items.map((item) => ({
    ...item,
    id: generateId("qli"),
    lineTotal: computeLineTotal(item),
  }));
}

function computeTotals(lineItems: QuotationLineItem[], discountAmount = 0) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100),
    0,
  );
  const taxAmount = lineItems.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    return sum + base * (item.taxPercent / 100);
  }, 0);
  const totalAmount = subtotal - discountAmount + taxAmount;
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

function nextQuotationNumber(): string {
  const year = new Date().getFullYear();
  const count = quotations.length + 1;
  return `QT-${year}-${String(count).padStart(4, "0")}`;
}

export const mockQuotationService: QuotationService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      quotations,
      filters,
      ["quotationNumber", "customerName", "customerEmail"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.customerId && item.customerId !== filters.customerId) return false;
        if (filters.priority && item.priority !== filters.priority) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const quotation = quotations.find((q) => q.id === id);
    if (!quotation) notFoundError("Quotation", id);
    return quotation;
  },

  async create(data) {
    await delay();
    const customer = initialCustomers.find((c) => c.id === data.customerId);
    if (!customer) notFoundError("Customer", data.customerId);

    const lineItems = buildLineItems(data.lineItems);
    const totals = computeTotals(lineItems, data.discountAmount ?? 0);
    const timestamp = nowIso();

    const quotation: Quotation = {
      id: generateId("quo"),
      quotationNumber: nextQuotationNumber(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      status: "draft",
      priority: data.priority,
      lineItems,
      ...totals,
      currency: "LKR",
      validUntil: data.validUntil,
      paymentStatus: "unpaid",
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      contactHistory: [
        {
          id: generateId("qch"),
          type: "comment",
          summary: "Quotation created",
          contactedBy: "usr-001",
          contactedByName: "John Doe",
          contactedAt: timestamp,
        },
      ],
      createdBy: "usr-001",
      createdByName: "John Doe",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    quotations.push(quotation);
    return quotation;
  },

  async update(id, data) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    const existing = quotations[index];
    const lineItems = data.lineItems
      ? buildLineItems(data.lineItems)
      : existing.lineItems;
    const totals = computeTotals(lineItems, data.discountAmount ?? existing.discountAmount);

    quotations[index] = {
      ...existing,
      ...data,
      lineItems,
      ...totals,
      updatedAt: nowIso(),
    };
    return quotations[index];
  },

  async delete(id) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);
    if (quotations[index].status !== "draft" && quotations[index].status !== "ready_to_send") {
      throw {
        code: "INVALID_STATE",
        message: "Only draft or ready-to-send quotations can be deleted.",
      };
    }
    quotations.splice(index, 1);
  },

  async send(id) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    quotations[index] = {
      ...quotations[index],
      status: "sent",
      sentAt: nowIso(),
      updatedAt: nowIso(),
      contactHistory: [
        {
          id: generateId("qch"),
          type: "email",
          summary: "Quotation sent to customer",
          detail: `Email sent to ${quotations[index].customerEmail}`,
          contactedBy: "usr-001",
          contactedByName: "John Doe",
          contactedAt: nowIso(),
          outcome: "Delivered",
        },
        ...quotations[index].contactHistory,
      ],
    };
    return quotations[index];
  },

  async addContactEntry(id, data) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    const quotation = quotations[index];
    const locked =
      quotation.status === "accepted" ||
      quotation.status === "converted" ||
      quotation.status === "rejected";
    if (locked) {
      throw {
        code: "INVALID_STATE",
        message: "Contact history can only be logged until the quotation is approved.",
      };
    }

    const entry: QuotationContactEntry = {
      id: generateId("qch"),
      type: data.type,
      summary: data.summary,
      detail: data.detail,
      outcome: data.outcome,
      contactedBy: "usr-001",
      contactedByName: "John Doe",
      contactedAt: nowIso(),
    };

    quotations[index] = {
      ...quotation,
      contactHistory: [entry, ...quotation.contactHistory],
      updatedAt: nowIso(),
    };
    return quotations[index];
  },

  async convertToSalesOrder(id) {
    await delay();
    const quotation = quotations.find((q) => q.id === id);
    if (!quotation) notFoundError("Quotation", id);
    if (quotation.status !== "accepted" && quotation.status !== "sent") {
      throw {
        code: "INVALID_STATE",
        message: "Quotation must be accepted or sent before conversion.",
      };
    }

    const salesOrder = await mockSalesOrderService.create({
      customerId: quotation.customerId,
      quotationId: quotation.id,
      lineItems: quotation.lineItems.map((item) => ({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxPercent: item.taxPercent,
      })),
      priority: quotation.priority,
      discountAmount: quotation.discountAmount,
    });

    const qIndex = quotations.findIndex((q) => q.id === id);
    quotations[qIndex] = {
      ...quotations[qIndex],
      status: "converted",
      salesOrderId: salesOrder.id,
      updatedAt: nowIso(),
    };

    return salesOrder;
  },
};
