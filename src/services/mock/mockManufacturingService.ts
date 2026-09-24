import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { ManufacturingService } from "@/services/interfaces/manufacturingService";
import { applyListQuery } from "@/services/mock/helpers";
import {
  addManufacturingJob,
  findManufacturingJob,
  getManufacturingJobs,
  nextProductionJobNumber,
  removeManufacturingJob,
  replaceManufacturingJob,
} from "@/services/mock/manufacturingStore";
import {
  issueMaterialsForJob,
  postProductionMaterialOutcome,
} from "@/services/mock/manufacturingInventory";
import { mockInventoryService } from "@/services/mock/mockInventoryService";
import { initialProducts } from "@/services/mock/data/products";
import { migrateLegacyProduct } from "@/services/mock/productHelpers";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import { initialUsers } from "@/services/mock/data/users";
import type {
  ManufacturingJob,
  ProductionCompletionInput,
  TaskActionActor,
} from "@/types/manufacturing";
import { getApprovedManufacturingVersion } from "@/lib/productVersion";
import {
  applyHoldProductionJob,
  applyStartProductionJob,
  generateTasksFromOperations,
  isProductionJobCompletable,
  refreshJobDerivedFields,
} from "@/lib/manufacturingTasks";
import { commitGuardedTaskActionAsync } from "@/services/mock/guardedTaskAction";

export const MANUFACTURING_ACTOR: TaskActionActor = {
  userId: "usr-004",
  userName: "Nuwan Wickramasinghe",
};

function requireJob(id: string): ManufacturingJob {
  const job = findManufacturingJob(id);
  if (!job) notFoundError("ProductionJob", id);
  return job;
}

export const mockManufacturingService: ManufacturingService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      getManufacturingJobs(),
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
    return requireJob(id);
  },

  async create(data) {
    await delay();
    const salesOrder = initialSalesOrders.find((o) => o.id === data.salesOrderId);
    if (!salesOrder) notFoundError("SalesOrder", data.salesOrderId);
    const productSeed = initialProducts.find((p) => p.id === data.productId);
    if (!productSeed) notFoundError("Product", data.productId);
    const product = migrateLegacyProduct(productSeed);
    const version = data.productVersionId
      ? product.versions.find((item) => item.id === data.productVersionId) ??
        getApprovedManufacturingVersion(product)
      : getApprovedManufacturingVersion(product);

    const assignee = data.assignedTo
      ? initialUsers.find((u) => u.id === data.assignedTo)
      : undefined;

    const timestamp = nowIso();
    const id = generateId("mj");
    const actor = MANUFACTURING_ACTOR;
    const tasks = generateTasksFromOperations({
      jobId: id,
      quantity: data.quantity,
      operations: version.operations,
      actor,
      createdAt: timestamp,
    });

    const job: ManufacturingJob = refreshJobDerivedFields({
      id,
      jobNumber: nextProductionJobNumber(),
      salesOrderId: salesOrder.id,
      salesOrderNumber: salesOrder.orderNumber,
      customerId: salesOrder.customerId,
      customerName: salesOrder.customerName,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      productVersionId: version.id,
      productVersionLabel: version.label,
      quantity: data.quantity,
      status: "draft",
      priority: data.priority,
      tasks,
      reworks: [],
      materialRequirements: version.bom.map((bom) => ({
        id: generateId("mr"),
        inventoryItemId: bom.inventoryItemId,
        inventoryItemSku: bom.sku,
        inventoryItemName: bom.inventoryItemName,
        requiredQuantity: (bom.requiredQuantity ?? bom.quantity) * data.quantity,
        reservedQuantity: 0,
        issuedQuantity: 0,
        unit: bom.unit,
        status: "pending" as const,
      })),
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      progressPercent: 0,
      estimatedCost: 0,
      actualCost: 0,
      assignedTo: assignee?.id,
      assignedToName: assignee?.displayName,
      notes: data.notes,
      createdBy: actor.userId,
      createdByName: actor.userName,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    addManufacturingJob(job);
    return job;
  },

  async update(id, data) {
    await delay();
    const job = requireJob(id);
    const assignee = data.assignedTo
      ? initialUsers.find((u) => u.id === data.assignedTo)
      : undefined;

    const updated = refreshJobDerivedFields({
      ...job,
      ...data,
      assignedTo: assignee?.id ?? job.assignedTo,
      assignedToName: assignee?.displayName ?? job.assignedToName,
      tasks: data.tasks ?? job.tasks,
      qualityInspection: data.qualityInspection ?? job.qualityInspection,
      updatedAt: nowIso(),
    });
    return replaceManufacturingJob(updated);
  },

  async delete(id) {
    await delay();
    const job = requireJob(id);
    if (job.status !== "draft") {
      throw { code: "INVALID_STATE", message: "Only draft jobs can be deleted." };
    }
    removeManufacturingJob(id);
  },

  async reserveMaterials(id) {
    await delay();
    const job = requireJob(id);
    const updatedRequirements = [];

    for (const mr of job.materialRequirements) {
      if (mr.status === "issued" || mr.reservedQuantity >= mr.requiredQuantity) {
        updatedRequirements.push({
          ...mr,
          reservedQuantity: Math.max(mr.reservedQuantity, mr.requiredQuantity),
          status: mr.status === "issued" ? ("issued" as const) : ("reserved" as const),
        });
        continue;
      }

      const qty = Math.max(0, mr.requiredQuantity - mr.reservedQuantity);
      if (qty > 0) {
        await mockInventoryService.recordMovement(mr.inventoryItemId, "reservation", qty, {
          referenceType: "manufacturing_job",
          referenceId: job.id,
          notes: `Reserve for ${job.jobNumber}`,
          trace: {
            sourceProductionOrderId: job.id,
            sourceProductionBatchId: job.jobNumber,
            sourceMaterialLotId: mr.inventoryItemId,
          },
        });
      }

      updatedRequirements.push({
        ...mr,
        reservedQuantity: mr.requiredQuantity,
        status: "reserved" as const,
      });
    }

    const updated = refreshJobDerivedFields({
      ...job,
      materialRequirements: updatedRequirements,
      status:
        job.status === "materials_pending" || job.status === "draft" || job.status === "planned"
          ? "ready_to_start"
          : job.status,
    });
    return replaceManufacturingJob(updated);
  },

  async startJob(id) {
    await delay();
    let job = requireJob(id);
    job = await issueMaterialsForJob(job);
    const updated = applyStartProductionJob(job, MANUFACTURING_ACTOR);
    return replaceManufacturingJob(updated);
  },

  async completeJob(id, completion?: ProductionCompletionInput) {
    await delay();
    let job = requireJob(id);
    if (!isProductionJobCompletable(job)) {
      throw {
        code: "INVALID_STATE",
        message:
          "All required manufacturing tasks must be completed and QC must pass before the product can be completed.",
      };
    }

    if (job.status === "completed" && job.materialOutcome) {
      return job;
    }

    const needsIssue = job.materialRequirements.some(
      (mr) => mr.issuedQuantity < mr.requiredQuantity,
    );
    if (needsIssue) {
      job = await issueMaterialsForJob(job);
    }

    if (completion) {
      const posted = await postProductionMaterialOutcome(job, completion);
      job = posted.job;
    } else if (!job.materialOutcome && job.materialRequirements.some((mr) => mr.issuedQuantity > 0)) {
      const issuedQty = job.materialRequirements.reduce((sum, mr) => sum + mr.issuedQuantity, 0);
      const posted = await postProductionMaterialOutcome(job, {
        finishedMaterialQuantity: issuedQty,
        reusableScrapQuantity: 0,
        recoverableQuantity: 0,
        permanentWasteQuantity: 0,
      });
      job = posted.job;
    }

    const updated = refreshJobDerivedFields({
      ...job,
      status: "completed",
      actualEndDate: nowIso(),
      progressPercent: 100,
    });
    return replaceManufacturingJob(updated);
  },

  async holdJob(id, reason) {
    await delay();
    const updated = applyHoldProductionJob(requireJob(id), reason, MANUFACTURING_ACTOR);
    return replaceManufacturingJob(updated);
  },

  async applyTaskAction(id, action) {
    await delay();
    return commitGuardedTaskActionAsync(id, action, MANUFACTURING_ACTOR);
  },
};
