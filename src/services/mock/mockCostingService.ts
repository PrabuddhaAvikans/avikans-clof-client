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
  buildCostingFromSalesOrder,
  normalizeCostingRequest,
} from "@/services/mock/costingFactory";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCostingRequests } from "@/services/mock/data/costing";
import { initialSalesOrderCostingRequests } from "@/services/mock/data/sales-order-costing";
import type { CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";

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
    await delay();
    return findRequest(id);
  },

  async getBySalesOrderId(salesOrderId) {
    await delay();
    return costingRequests.find((item) => item.salesOrderId === salesOrderId) ?? null;
  },

  async createFromSalesOrder(order: SalesOrder) {
    await delay();
    const existing = costingRequests.find((item) => item.salesOrderId === order.id);
    if (existing) return existing;

    const request = buildCostingFromSalesOrder(order, {
      requestNumber: nextRequestNumber(),
      coatingStatus: "pending",
      status: "pending",
    });
    costingRequests.unshift(request);
    return request;
  },

  async submitCoating(id, data: CoatingSubmitData) {
    await delay();
    const index = costingRequests.findIndex((item) => item.id === id);
    if (index === -1) notFoundError("CostingRequest", id);

    const existing = costingRequests[index];
    const updated = applyCoatingItems(existing, data.items);
    updated.coatingStatus = "submitted";
    if (updated.status === "pending" || updated.status === "changes_requested") {
      updated.status = "in_review";
    }
    if (updated.approvalLevels.every((level) => level.status === "waiting")) {
      updated.approvalLevels[0].status = "pending";
    }
    if (data.notes) {
      updated.notes = data.notes;
    }
    addHistoryEntry(updated, "Coating submitted", "Current User");
    costingRequests[index] = updated;
    return updated;
  },

  async approve(id, comment) {
    await delay();
    const request = findRequest(id);
    if (request.coatingStatus === "pending") {
      throw {
        code: "INVALID_STATE",
        message: "Coating must be submitted before costing can be approved.",
      };
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
    await delay();
    const request = findRequest(id);
    advanceApprovalLevels(request, "rejected");
    request.status = "rejected";
    request.slaRemaining = "Completed";
    addHistoryEntry(request, "Rejected", "Current User", comment);
    return request;
  },

  async requestChanges(id, comment) {
    await delay();
    const request = findRequest(id);
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
