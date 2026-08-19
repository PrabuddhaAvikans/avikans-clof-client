import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { costingActions } from "@/features/costing/store/costingSlice";
import type { CostingListFilters, CoatingSubmitData } from "@/services";
import type { CostingRequest } from "@/types/costing";
import type { PaginatedResponse } from "@/types/common";
import type { SalesOrder } from "@/types/sales-order";

export function useCostingRequests(filters: CostingListFilters, enabled = true) {
  return useEpicQuery<CostingListFilters, PaginatedResponse<CostingRequest>>({
    arg: filters,
    enabled,
    request: costingActions.fetchListRequest,
    selectEntry: (state, key) => state.costing.lists[key],
  });
}

export function useCostingRequest(id: string) {
  return useEpicQuery<string, CostingRequest>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: costingActions.fetchDetailRequest,
    selectEntry: (state, key) => state.costing.details[key],
  });
}

export function useApproveCostingRequest() {
  return useEpicMutation<{ id: string; comment?: string }, CostingRequest>({
    request: costingActions.approveRequest,
    selectMutation: (state: RootState) => state.costing.approve,
  });
}

export function useRejectCostingRequest() {
  return useEpicMutation<{ id: string; comment: string }, CostingRequest>({
    request: costingActions.rejectRequest,
    selectMutation: (state: RootState) => state.costing.reject,
  });
}

export function useRequestCostingChanges() {
  return useEpicMutation<{ id: string; comment: string }, CostingRequest>({
    request: costingActions.requestChangesRequest,
    selectMutation: (state: RootState) => state.costing.requestChanges,
  });
}

export function useUpdateCostingNotes() {
  return useEpicMutation<{ id: string; notes: string }, CostingRequest>({
    request: costingActions.updateNotesRequest,
    selectMutation: (state: RootState) => state.costing.updateNotes,
  });
}

export function useAddCostingComment() {
  return useEpicMutation<{ id: string; comment: string }, CostingRequest>({
    request: costingActions.addCommentRequest,
    selectMutation: (state: RootState) => state.costing.addComment,
  });
}

export function useCostingBySalesOrder(salesOrderId: string) {
  return useEpicQuery<string, CostingRequest | null>({
    arg: salesOrderId,
    enabled: Boolean(salesOrderId),
    getKey: (value) => value,
    request: costingActions.fetchBySalesOrderRequest,
    selectEntry: (state, key) => state.costing.bySalesOrder[key],
  });
}

export function useSubmitCoating() {
  return useEpicMutation<{ id: string; data: CoatingSubmitData }, CostingRequest>({
    request: costingActions.submitCoatingRequest,
    selectMutation: (state: RootState) => state.costing.submitCoating,
  });
}

export function useCreateCostingFromSalesOrder() {
  return useEpicMutation<SalesOrder, CostingRequest>({
    request: costingActions.createFromSalesOrderRequest,
    selectMutation: (state: RootState) => state.costing.createFromSalesOrder,
  });
}
