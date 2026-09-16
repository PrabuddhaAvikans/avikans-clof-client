import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { DeliveryService } from "@/services/interfaces/deliveryService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialDeliveries } from "@/services/mock/data/deliveries";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import { initialUsers } from "@/services/mock/data/users";
import { loadSystemSettings } from "@/lib/systemSettings";
import type { Delivery } from "@/types/delivery";

let deliveries = cloneData(initialDeliveries);

function nextDeliveryNumber(): string {
  const year = new Date().getFullYear();
  const prefix = loadSystemSettings().deliveryPrefix || "DL";
  return `${prefix}-${year}-${String(500 + deliveries.length).padStart(4, "0")}`;
}

export const mockDeliveryService: DeliveryService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      deliveries,
      filters,
      ["deliveryNumber", "customerName", "salesOrderNumber", "trackingNumber"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.salesOrderId && item.salesOrderId !== filters.salesOrderId) return false;
        if (filters.customerId && item.customerId !== filters.customerId) return false;
        if (filters.priority && item.priority !== filters.priority) return false;
        if (filters.driverId && item.driverId !== filters.driverId) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const delivery = deliveries.find((d) => d.id === id);
    if (!delivery) notFoundError("Delivery", id);
    return delivery;
  },

  async create(data) {
    await delay();
    const salesOrder = initialSalesOrders.find((o) => o.id === data.salesOrderId);
    if (!salesOrder) notFoundError("SalesOrder", data.salesOrderId);

    const driver = data.driverId
      ? initialUsers.find((u) => u.id === data.driverId)
      : undefined;

    const timestamp = nowIso();
    const delivery: Delivery = {
      id: generateId("del"),
      deliveryNumber: nextDeliveryNumber(),
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      customerName: salesOrder.customerName,
      status: "planned",
      priority: data.priority,
      items: data.items.map((item) => ({ ...item, id: generateId("di") })),
      shippingAddress: salesOrder.shippingAddress ?? salesOrder.billingAddress,
      carrier: data.carrier,
      driverId: driver?.id,
      driverName: driver?.displayName,
      vehicleNumber: data.vehicleNumber,
      scheduledDate: data.scheduledDate,
      notes: data.notes,
      createdBy: "usr-001",
      createdByName: "Prabuddha Jayawardhana",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    deliveries.push(delivery);
    return delivery;
  },

  async update(id, data) {
    await delay();
    const index = deliveries.findIndex((d) => d.id === id);
    if (index === -1) notFoundError("Delivery", id);

    const driver = data.driverId
      ? initialUsers.find((u) => u.id === data.driverId)
      : undefined;

    deliveries[index] = {
      ...deliveries[index],
      ...data,
      items: data.items
        ? data.items.map((item) => ({ ...item, id: generateId("di") }))
        : deliveries[index].items,
      driverId: driver?.id ?? deliveries[index].driverId,
      driverName: driver?.displayName ?? deliveries[index].driverName,
      updatedAt: nowIso(),
    };
    return deliveries[index];
  },

  async delete(id) {
    await delay();
    const index = deliveries.findIndex((d) => d.id === id);
    if (index === -1) notFoundError("Delivery", id);
    if (deliveries[index].status !== "planned") {
      throw { code: "INVALID_STATE", message: "Only planned deliveries can be deleted." };
    }
    deliveries.splice(index, 1);
  },

  async dispatchDelivery(id) {
    await delay();
    const index = deliveries.findIndex((d) => d.id === id);
    if (index === -1) notFoundError("Delivery", id);

    deliveries[index] = {
      ...deliveries[index],
      status: "dispatched",
      dispatchedAt: nowIso(),
      updatedAt: nowIso(),
    };
    return deliveries[index];
  },

  async recordProofOfDelivery(id, proof) {
    await delay();
    const index = deliveries.findIndex((d) => d.id === id);
    if (index === -1) notFoundError("Delivery", id);

    deliveries[index] = {
      ...deliveries[index],
      status: "delivered",
      deliveredAt: nowIso(),
      proofOfDelivery: { ...proof, id: generateId("pod") },
      updatedAt: nowIso(),
    };
    return deliveries[index];
  },
};
