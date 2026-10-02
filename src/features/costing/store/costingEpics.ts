import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async";
import { costingActions as actions } from "@/features/costing/store/costingSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapCosting } from "@/services/mappers/costingMappers";
import type { CoatingSubmitData, CostingListFilters } from "@/services";
import type { CostingRequest } from "@/types/costing";
import type { PaginatedResponse } from "@/types/common";
import type { SalesOrder } from "@/types/sales-order";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (
    filters: CostingListFilters,
  ): Promise<PaginatedResponse<CostingRequest>> =>
    mapPaginatedResponse(await http.get(`/api/costing${buildQuery(filters)}`), mapCosting),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id: string): Promise<CostingRequest> =>
    mapCosting(asRecord(await http.get(`/api/costing/${id}`))),
});

const fetchBySalesOrderEpic = createApiEpic({
  request: actions.fetchBySalesOrderRequest,
  success: actions.fetchBySalesOrderSuccess,
  failure: actions.fetchBySalesOrderFailure,
  execute: async (salesOrderId: string): Promise<CostingRequest | null> => {
    const raw = await http.get(`/api/costing/by-sales-order/${salesOrderId}`);
    return raw ? mapCosting(asRecord(raw)) : null;
  },
});

const submitCoatingEpic = createApiEpic({
  request: actions.submitCoatingRequest,
  success: actions.submitCoatingSuccess,
  failure: actions.submitCoatingFailure,
  concurrency: "merge",
  execute: async ({
    id,
    data,
  }: {
    id: string;
    data: CoatingSubmitData;
  }): Promise<CostingRequest> =>
    mapCosting(asRecord(await http.post(`/api/costing/${id}/submit-coating`, data))),
});

const createFromSalesOrderEpic = createApiEpic({
  request: actions.createFromSalesOrderRequest,
  success: actions.createFromSalesOrderSuccess,
  failure: actions.createFromSalesOrderFailure,
  concurrency: "merge",
  execute: async (order: SalesOrder): Promise<CostingRequest> =>
    mapCosting(
      asRecord(await http.post(`/api/costing/from-sales-order/${order.id}`)),
    ),
});

const approveEpic = createApiEpic({
  request: actions.approveRequest,
  success: actions.approveSuccess,
  failure: actions.approveFailure,
  concurrency: "merge",
  execute: async ({
    id,
    comment,
  }: {
    id: string;
    comment?: string;
  }): Promise<CostingRequest> =>
    mapCosting(
      asRecord(await http.post(`/api/costing/${id}/approve`, { comment })),
    ),
});

const rejectEpic = createApiEpic({
  request: actions.rejectRequest,
  success: actions.rejectSuccess,
  failure: actions.rejectFailure,
  concurrency: "merge",
  execute: async ({
    id,
    comment,
  }: {
    id: string;
    comment?: string;
  }): Promise<CostingRequest> =>
    mapCosting(
      asRecord(await http.post(`/api/costing/${id}/reject`, { comment })),
    ),
});

const requestChangesEpic = createApiEpic({
  request: actions.requestChangesRequest,
  success: actions.requestChangesSuccess,
  failure: actions.requestChangesFailure,
  concurrency: "merge",
  execute: async ({
    id,
    comment,
  }: {
    id: string;
    comment?: string;
  }): Promise<CostingRequest> =>
    mapCosting(
      asRecord(await http.post(`/api/costing/${id}/request-changes`, { comment })),
    ),
});

const updateNotesEpic = createApiEpic({
  request: actions.updateNotesRequest,
  success: actions.updateNotesSuccess,
  failure: actions.updateNotesFailure,
  concurrency: "merge",
  execute: async ({
    id,
    notes,
  }: {
    id: string;
    notes: string;
  }): Promise<CostingRequest> =>
    mapCosting(asRecord(await http.put(`/api/costing/${id}/notes`, { notes }))),
});

const addCommentEpic = createApiEpic({
  request: actions.addCommentRequest,
  success: actions.addCommentSuccess,
  failure: actions.addCommentFailure,
  concurrency: "merge",
  execute: async ({
    id,
    comment,
  }: {
    id: string;
    comment: string;
  }): Promise<CostingRequest> =>
    mapCosting(
      asRecord(await http.post(`/api/costing/${id}/comments`, { comment })),
    ),
});

export const costingEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchBySalesOrderEpic,
  approveEpic,
  rejectEpic,
  requestChangesEpic,
  updateNotesEpic,
  addCommentEpic,
  submitCoatingEpic,
  createFromSalesOrderEpic,
);
