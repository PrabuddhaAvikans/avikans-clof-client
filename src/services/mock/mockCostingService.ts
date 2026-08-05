import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { CostingService } from "@/services/interfaces/costingService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCostingRequests } from "@/services/mock/data/costing";
import type { CostingRequest } from "@/types/costing";

let costingRequests = cloneData(initialCostingRequests);

function findRequest(id: string): CostingRequest {
  const request = costingRequests.find((item) => item.id === id);
  if (!request) notFoundError("CostingRequest", id);
  return request;
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
      ["requestNumber", "customerName", "projectName", "requestType"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    return findRequest(id);
  },

  async approve(id, comment) {
    await delay();
    const request = findRequest(id);
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
