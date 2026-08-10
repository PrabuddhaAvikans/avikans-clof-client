import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { ManufacturingService } from "@/services/interfaces/manufacturingService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialManufacturingJobs } from "@/services/mock/data/manufacturing";
import { initialProducts } from "@/services/mock/data/products";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import { initialUsers } from "@/services/mock/data/users";
import type { ManufacturingJob } from "@/types/manufacturing";

let manufacturingJobs = cloneData(initialManufacturingJobs);

function nextJobNumber(): string {
  const year = new Date().getFullYear();
  return `JC-${year}-${String(1200 + manufacturingJobs.length)}`;
}

export const mockManufacturingService: ManufacturingService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      manufacturingJobs,
      filters,
      ["jobNumber", "productName", "productSku", "customerName", "salesOrderNumber"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.salesOrderId && item.salesOrderId !== filters.salesOrderId) return false;
        if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
        if (filters.priority && item.priority !== filters.priority) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const job = manufacturingJobs.find((j) => j.id === id);
    if (!job) notFoundError("ManufacturingJob", id);
    return job;
  },

  async create(data) {
    await delay();
    const salesOrder = initialSalesOrders.find((o) => o.id === data.salesOrderId);
    if (!salesOrder) notFoundError("SalesOrder", data.salesOrderId);
    const product = initialProducts.find((p) => p.id === data.productId);
    if (!product) notFoundError("Product", data.productId);

    const assignee = data.assignedTo
      ? initialUsers.find((u) => u.id === data.assignedTo)
      : undefined;

    const timestamp = nowIso();
    const job: ManufacturingJob = {
      id: generateId("mj"),
      jobNumber: nextJobNumber(),
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      customerName: salesOrder.customerName,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      quantity: data.quantity,
      status: "draft",
      priority: data.priority,
      operations: [],
      materialRequirements: product.bom.map((bom) => ({
        id: generateId("mr"),
        inventoryItemId: bom.inventoryItemId,
        inventoryItemSku: bom.sku,
        inventoryItemName: bom.inventoryItemName,
        requiredQuantity: bom.quantity * data.quantity,
        reservedQuantity: 0,
        issuedQuantity: 0,
        unit: bom.unit,
        status: "pending" as const,
      })),
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      assignedTo: assignee?.id,
      assignedToName: assignee?.displayName,
      notes: data.notes,
      createdBy: "usr-004",
      createdByName: "Nuwan Wickramasinghe",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    manufacturingJobs.push(job);
    return job;
  },

  async update(id, data) {
    await delay();
    const index = manufacturingJobs.findIndex((j) => j.id === id);
    if (index === -1) notFoundError("ManufacturingJob", id);

    const assignee = data.assignedTo
      ? initialUsers.find((u) => u.id === data.assignedTo)
      : undefined;

    manufacturingJobs[index] = {
      ...manufacturingJobs[index],
      ...data,
      assignedTo: assignee?.id ?? manufacturingJobs[index].assignedTo,
      assignedToName: assignee?.displayName ?? manufacturingJobs[index].assignedToName,
      operations: data.operations ?? manufacturingJobs[index].operations,
      updatedAt: nowIso(),
    };
    return manufacturingJobs[index];
  },

  async delete(id) {
    await delay();
    const index = manufacturingJobs.findIndex((j) => j.id === id);
    if (index === -1) notFoundError("ManufacturingJob", id);
    if (manufacturingJobs[index].status !== "draft") {
      throw { code: "INVALID_STATE", message: "Only draft jobs can be deleted." };
    }
    manufacturingJobs.splice(index, 1);
  },

  async reserveMaterials(id) {
    await delay();
    const index = manufacturingJobs.findIndex((j) => j.id === id);
    if (index === -1) notFoundError("ManufacturingJob", id);

    const job = manufacturingJobs[index];
    const updatedRequirements = job.materialRequirements.map((mr) => ({
      ...mr,
      reservedQuantity: mr.requiredQuantity,
      status: "reserved" as const,
    }));

    manufacturingJobs[index] = {
      ...job,
      materialRequirements: updatedRequirements,
      status: job.status === "materials_pending" ? "ready_to_start" : job.status,
      updatedAt: nowIso(),
    };
    return manufacturingJobs[index];
  },

  async startJob(id) {
    await delay();
    const index = manufacturingJobs.findIndex((j) => j.id === id);
    if (index === -1) notFoundError("ManufacturingJob", id);

    manufacturingJobs[index] = {
      ...manufacturingJobs[index],
      status: "in_progress",
      actualStartDate: nowIso(),
      updatedAt: nowIso(),
    };
    return manufacturingJobs[index];
  },

  async completeJob(id) {
    await delay();
    const index = manufacturingJobs.findIndex((j) => j.id === id);
    if (index === -1) notFoundError("ManufacturingJob", id);

    manufacturingJobs[index] = {
      ...manufacturingJobs[index],
      status: "completed",
      actualEndDate: nowIso(),
      updatedAt: nowIso(),
    };
    return manufacturingJobs[index];
  },
};
