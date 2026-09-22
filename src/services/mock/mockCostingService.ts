import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type {
  CoatingSubmitData,
  CostingService,
} from "@/services/interfaces/costingService";
import {
  applyCoatingItems,
  applyEstimationMaterials,
  buildCostingFromSalesOrder,
  normalizeCostingRequest,
} from "@/services/mock/costingFactory";
import { resolveSalesOrderLineContexts } from "@/lib/costingFromQuotationLine";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCostingRequests } from "@/services/mock/data/costing";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import { initialSalesOrderCostingRequests } from "@/services/mock/data/sales-order-costing";
import type { CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import {
  applyWorkflowInstanceToCosting,
  ensureCostingWorkflow,
} from "@/lib/workflow/costing";
import {
  approveWorkflowStep,
  rejectWorkflowStep,
  requestWorkflowChanges,
} from "@/lib/workflow/engine";

let costingRequests = cloneData([
  ...initialCostingRequests.map((item) => normalizeCostingRequest(item as CostingRequest)),
  ...initialSalesOrderCostingRequests,
]);

function findRequest(id: string): CostingRequest {
  const request = costingRequests.find((item) => item.id === id);
  if (!request) notFoundError("CostingRequest", id);
  return request;
}

function nextRequestNumber(): string {
  const year = new Date().getFullYear();
  return `CR-${year}-${String(costingRequests.length + 1).padStart(4, "0")}`;
}

function isOpenSalesOrder(order: SalesOrder): boolean {
  return ["draft", "pending_review", "submitted"].includes(order.status);
}

function upsertCostingRequest(request: CostingRequest): CostingRequest {
  const index = costingRequests.findIndex((item) => item.id === request.id);
  if (index >= 0) {
    costingRequests[index] = request;
  } else {
    costingRequests.unshift(request);
  }
  return request;
}

async function buildBomCostingFromOrder(
  order: SalesOrder,
  existing?: CostingRequest,
): Promise<CostingRequest> {
  const lineContexts = await resolveSalesOrderLineContexts(order);
  const autoSubmit =
    !existing ||
    (isOpenSalesOrder(order) &&
      existing.status !== "rejected" &&
      existing.status !== "approved" &&
      existing.status !== "changes_requested" &&
      (existing.coatingStatus === "pending" || existing.estimationProductLines.length === 0));

  const request = buildCostingFromSalesOrder(order, {
    requestNumber: existing?.requestNumber ?? nextRequestNumber(),
    coatingStatus: autoSubmit ? "submitted" : existing?.coatingStatus ?? "submitted",
    status: autoSubmit ? "in_review" : existing?.status ?? "in_review",
    lineContexts,
    autoSubmitted: autoSubmit,
  });

  if (existing) {
    request.id = existing.id;
    request.workflowDefinitionId = existing.workflowDefinitionId;
    request.workflowVersionId = existing.workflowVersionId;
    request.workflowInstanceId = existing.workflowInstanceId;
    request.workflowVersionNumber = existing.workflowVersionNumber;
    request.workflowName = existing.workflowName;
    request.approvalLevels = existing.approvalLevels;
    if (!autoSubmit) {
      request.history = existing.history;
      request.status = existing.status;
      request.coatingStatus = existing.coatingStatus;
    }
  }

  return ensureCostingWorkflow(request, {
    order,
    startFirstStep:
      request.status === "approved" ||
      (request.status !== "pending" && request.coatingStatus !== "pending"),
    allApproved: request.status === "approved",
  });
}

let seedHydration: Promise<void> | null = null;

async function hydrateSeedEstimations(): Promise<void> {
  const ordersById = new Map(initialSalesOrders.map((order) => [order.id, order]));
  for (let index = 0; index < costingRequests.length; index += 1) {
    const request = costingRequests[index];
    if (!request.salesOrderId || request.estimationProductLines.length > 0) continue;
    const order = ordersById.get(request.salesOrderId);
    if (!order) continue;
    costingRequests[index] = await buildBomCostingFromOrder(order, request);
  }
}

function ensureSeedHydrated(): Promise<void> {
  if (!seedHydration) {
    seedHydration = hydrateSeedEstimations();
  }
  return seedHydration;
}

function advanceApprovalLevels(request: CostingRequest, action: "approved" | "rejected"): void {
  const pendingIndex = request.approvalLevels.findIndex((level) => level.status === "pending");
  if (pendingIndex >= 0) {
    request.approvalLevels[pendingIndex].status = action;
    const nextIndex = pendingIndex + 1;
    if (action === "approved" && nextIndex < request.approvalLevels.length) {
      const nextLevel = request.approvalLevels[nextIndex];
      if (nextLevel.status === "waiting") {
        nextLevel.status = "pending";
      }
    }
  } else {
    const waitingIndex = request.approvalLevels.findIndex((level) => level.status === "waiting");
    if (waitingIndex >= 0) {
      request.approvalLevels[waitingIndex].status = action === "approved" ? "pending" : "rejected";
    }
  }
}

function addHistoryEntry(
  request: CostingRequest,
  action: string,
  userName: string,
  comment?: string,
): void {
  request.history.unshift({
    id: generateId("hist"),
    action,
    userName,
    timestamp: nowIso(),
    comment,
  });
}

export const mockCostingService: CostingService = {
  async list(filters) {
    await ensureSeedHydrated();
    await delay();
    return applyListQuery(
      costingRequests,
      filters,
      ["requestNumber", "customerName", "projectName", "requestType", "salesOrderNumber", "quotationNumber"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.coatingStatus && item.coatingStatus !== filters.coatingStatus) return false;
        if (filters.salesOrderId && item.salesOrderId !== filters.salesOrderId) return false;
        if (filters.linkedToSalesOrder && !item.salesOrderId) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await ensureSeedHydrated();
    await delay();
    return findRequest(id);
  },

  async getBySalesOrderId(salesOrderId) {
    await ensureSeedHydrated();
    await delay();
    return costingRequests.find((item) => item.salesOrderId === salesOrderId) ?? null;
  },

  async createFromSalesOrder(order: SalesOrder) {
    await ensureSeedHydrated();
    await delay();
    const existing = costingRequests.find((item) => item.salesOrderId === order.id);
    if (existing && existing.status === "approved") return existing;
    if (existing && existing.estimationProductLines.length > 0 && existing.coatingStatus !== "pending") {
      return existing;
    }

    const request = await buildBomCostingFromOrder(order, existing);
    return upsertCostingRequest(request);
  },

  async syncFromSalesOrder(order: SalesOrder) {
    await ensureSeedHydrated();
    const existing = costingRequests.find((item) => item.salesOrderId === order.id);
    if (existing && (existing.status === "approved" || existing.status === "rejected")) {
      return existing;
    }
    const request = await buildBomCostingFromOrder(order, existing);
    return upsertCostingRequest(request);
  },

  async submitCoating(id, data: CoatingSubmitData) {
    await ensureSeedHydrated();
    await delay();
    const index = costingRequests.findIndex((item) => item.id === id);
    if (index === -1) notFoundError("CostingRequest", id);

    const existing = costingRequests[index];
    let updated = applyCoatingItems(existing, data.items);
    if (data.materials && data.materials.length > 0) {
      updated = applyEstimationMaterials(updated, data.materials);
    }
    updated.coatingStatus = "submitted";
    if (updated.status === "pending" || updated.status === "changes_requested") {
      updated.status = "in_review";
    }
    if (updated.approvalLevels.every((level) => level.status === "waiting") && !updated.workflowInstanceId) {
      const order = updated.salesOrderId
        ? initialSalesOrders.find((item) => item.id === updated.salesOrderId)
        : undefined;
      Object.assign(
        updated,
        ensureCostingWorkflow(updated, {
          order,
          startFirstStep: true,
        }),
      );
    } else if (updated.workflowInstanceId) {
      const started = ensureCostingWorkflow(updated, { startFirstStep: true });
      Object.assign(updated, started);
    }
    if (
      updated.approvalLevels.length > 0 &&
      updated.approvalLevels.every((level) => level.status === "approved")
    ) {
      updated.status = "approved";
    }
    if (data.notes) {
      updated.notes = data.notes;
    }
    addHistoryEntry(updated, "Coating submitted", "Current User");
    costingRequests[index] = updated;
    return updated;
  },

  async approve(id, comment) {
    await ensureSeedHydrated();
    await delay();
    const request = findRequest(id);
    if (request.coatingStatus === "pending") {
      throw {
        code: "INVALID_STATE",
        message: "Coating must be submitted before costing can be approved.",
      };
    }
    if (request.workflowInstanceId) {
      const instance = approveWorkflowStep(request.workflowInstanceId, {
        comment,
        userName: "Current User",
      });
      Object.assign(request, applyWorkflowInstanceToCosting(request, instance));
      request.status = instance.status === "approved" ? "approved" : "in_review";
      if (instance.status === "approved") {
        request.slaRemaining = "Completed";
      }
      addHistoryEntry(
        request,
        instance.status === "approved" ? "Approved" : "Partial approval",
        "Current User",
        comment,
      );
      return request;
    }

    advanceApprovalLevels(request, "approved");

    const allApproved = request.approvalLevels.every((level) => level.status === "approved");
    request.status = allApproved ? "approved" : "in_review";
    if (allApproved) {
      request.slaRemaining = "Completed";
    }

    addHistoryEntry(request, allApproved ? "Approved" : "Partial approval", "Current User", comment);
    return request;
  },

  async reject(id, comment) {
    await ensureSeedHydrated();
    await delay();
    const request = findRequest(id);
    if (request.workflowInstanceId) {
      const instance = rejectWorkflowStep(request.workflowInstanceId, {
        comment,
        userName: "Current User",
      });
      Object.assign(request, applyWorkflowInstanceToCosting(request, instance));
      request.status = "rejected";
      request.slaRemaining = "Completed";
      addHistoryEntry(request, "Rejected", "Current User", comment);
      return request;
    }

    advanceApprovalLevels(request, "rejected");
    request.status = "rejected";
    request.slaRemaining = "Completed";
    addHistoryEntry(request, "Rejected", "Current User", comment);
    return request;
  },

  async requestChanges(id, comment) {
    await ensureSeedHydrated();
    await delay();
    const request = findRequest(id);
    if (request.workflowInstanceId) {
      requestWorkflowChanges(request.workflowInstanceId, {
        comment,
        userName: "Current User",
      });
    }
    request.status = "changes_requested";
    request.coatingStatus = "pending";
    addHistoryEntry(request, "Changes requested", "Current User", comment);
    return request;
  },

  async updateNotes(id, notes) {
    await delay();
    const request = findRequest(id);
    request.notes = notes;
    return request;
  },

  async addComment(id, comment) {
    await delay();
    const request = findRequest(id);
    addHistoryEntry(request, "Comment added", "Current User", comment);
    return request;
  },
};
