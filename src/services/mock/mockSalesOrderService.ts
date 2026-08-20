import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { SalesOrderService } from "@/services/interfaces/salesOrderService";
import {
  computeLineTotal,
  computeQuotationTotals,
} from "@/features/sales/schemas/quotationSchema";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCustomers } from "@/services/mock/data/customers";
import { initialQuotations } from "@/services/mock/data/quotations";
import { initialUsers } from "@/services/mock/data/users";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import { initialSalesOrderCostingRequests } from "@/services/mock/data/sales-order-costing";
import { mockCostingService } from "@/services/mock/mockCostingService";
import type { SalesOrder, SalesOrderLineItem } from "@/types/sales-order";

let salesOrders: SalesOrder[] = cloneData(initialSalesOrders).map((order) => ({
  ...order,
  costingRequestId:
    order.costingRequestId ??
    initialSalesOrderCostingRequests.find((item) => item.salesOrderId === order.id)?.id,
}));

function buildLineItems(
  items: Omit<SalesOrderLineItem, "id" | "lineTotal" | "quantityDelivered" | "quantityInManufacturing">[],
): SalesOrderLineItem[] {
  return items.map((item) => ({
    ...item,
    id: generateId("sli"),
    lineTotal: computeLineTotal(item),
    quantityDelivered: 0,
    quantityInManufacturing: 0,
  }));
}

function computeTotals(lineItems: SalesOrderLineItem[], discountAmount = 0) {
  const totals = computeQuotationTotals(lineItems, discountAmount);
  return {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
  };
}

function nextOrderNumber(): string {
  const year = new Date().getFullYear();
  return `SO-${year}-${String(salesOrders.length + 1).padStart(4, "0")}`;
}

export const mockSalesOrderService: SalesOrderService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      salesOrders,
      filters,
      ["orderNumber", "customerName", "customerEmail"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.customerId && item.customerId !== filters.customerId) return false;
        if (filters.priority && item.priority !== filters.priority) return false;
        if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const order = salesOrders.find((o) => o.id === id);
    if (!order) notFoundError("SalesOrder", id);
    return order;
  },

  async create(data) {
    await delay();
    const customer = initialCustomers.find((c) => c.id === data.customerId);
    if (!customer) notFoundError("Customer", data.customerId);

    const billingActive =
      customer.billingAddresses?.[customer.activeBillingAddressIndex] ?? customer.billingAddresses[0];
    const shippingActive = customer.deliverySameAsBilling
      ? undefined
      : customer.shippingAddresses?.[customer.activeShippingAddressIndex ?? 0];

    const quotation = data.quotationId
      ? initialQuotations.find((q) => q.id === data.quotationId)
      : undefined;

    const lineItems = buildLineItems(data.lineItems);
    const totals = computeTotals(lineItems, data.discountAmount ?? 0);
    const timestamp = nowIso();

    const order: SalesOrder = {
      id: generateId("so"),
      orderNumber: nextOrderNumber(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      quotationId: data.quotationId,
      quotationNumber: quotation?.quotationNumber,
      status: "draft",
      priority: data.priority,
      lineItems,
      ...totals,
      currency: "LKR",
      paymentStatus: "unpaid",
      billingAddress: billingActive,
      shippingAddress: shippingActive,
      requestedDeliveryDate: data.requestedDeliveryDate,
      notes: data.notes,
      manufacturingJobIds: [],
      deliveryIds: [],
      createdBy: "usr-001",
      createdByName: "Prabuddha Jayawardhana",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    salesOrders.push(order);

    const costing = await mockCostingService.createFromSalesOrder(order);
    order.costingRequestId = costing.id;

    return order;
  },

  async update(id, data) {
    await delay();
    const index = salesOrders.findIndex((o) => o.id === id);
    if (index === -1) notFoundError("SalesOrder", id);

    const existing = salesOrders[index];
    const lineItems = data.lineItems ? buildLineItems(data.lineItems) : existing.lineItems;
    const totals = computeTotals(lineItems, data.discountAmount ?? existing.discountAmount);

    salesOrders[index] = {
      ...existing,
      ...data,
      lineItems,
      ...totals,
      updatedAt: nowIso(),
    };
    return salesOrders[index];
  },

  async delete(id) {
    await delay();
    const index = salesOrders.findIndex((o) => o.id === id);
    if (index === -1) notFoundError("SalesOrder", id);
    if (
      salesOrders[index].status !== "draft" &&
      salesOrders[index].status !== "pending_review"
    ) {
      throw {
        code: "INVALID_STATE",
        message: "Only draft or pending-review orders can be deleted.",
      };
    }
    salesOrders.splice(index, 1);
  },

  async confirm(id) {
    await delay();
    const index = salesOrders.findIndex((o) => o.id === id);
    if (index === -1) notFoundError("SalesOrder", id);

    const costing = await mockCostingService.getBySalesOrderId(id);
    if (!costing || costing.status !== "approved") {
      throw {
        code: "INVALID_STATE",
        message: "Complete estimation and costing approval before confirming this sales order.",
      };
    }

    salesOrders[index] = {
      ...salesOrders[index],
      status: "confirmed",
      confirmedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return salesOrders[index];
  },

  async cancel(id, reason) {
    await delay();
    const index = salesOrders.findIndex((o) => o.id === id);
    if (index === -1) notFoundError("SalesOrder", id);
    salesOrders[index] = {
      ...salesOrders[index],
      status: "cancelled",
      notes: reason
        ? `${salesOrders[index].notes ?? ""}\nCancelled: ${reason}`.trim()
        : salesOrders[index].notes,
      updatedAt: nowIso(),
    };
    return salesOrders[index];
  },

  async assign(id, userId) {
    await delay();
    const index = salesOrders.findIndex((o) => o.id === id);
    if (index === -1) notFoundError("SalesOrder", id);
    const user = initialUsers.find((u) => u.id === userId);
    if (!user) notFoundError("User", userId);

    salesOrders[index] = {
      ...salesOrders[index],
      assignedTo: user.id,
      assignedToName: user.displayName,
      updatedAt: nowIso(),
    };
    return salesOrders[index];
  },
};
