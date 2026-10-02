import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { salesOrdersActions as actions } from "@/features/sales/store/salesOrdersSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import {
  mapSalesOrder,
  toApiSalesOrderPayload,
} from "@/services/mappers/salesOrderMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/sales-orders${buildQuery(filters)}`),
      mapSalesOrder,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapSalesOrder(asRecord(await http.get(`/api/sales-orders/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapSalesOrder(
      asRecord(await http.post("/api/sales-orders", toApiSalesOrderPayload(data))),
    ),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapSalesOrder(
      asRecord(
        await http.put(`/api/sales-orders/${id}`, toApiSalesOrderPayload(data)),
      ),
    ),
});

const confirmEpic = createApiEpic({
  request: actions.confirmRequest,
  success: actions.confirmSuccess,
  failure: actions.confirmFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapSalesOrder(asRecord(await http.post(`/api/sales-orders/${id}/confirm`))),
});

const cancelEpic = createApiEpic({
  request: actions.cancelRequest,
  success: actions.cancelSuccess,
  failure: actions.cancelFailure,
  concurrency: "merge",
  execute: async ({ id, reason }) =>
    mapSalesOrder(
      asRecord(await http.post(`/api/sales-orders/${id}/cancel`, { reason })),
    ),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/sales-orders/${id}`);
    return id;
  },
});

const assignEpic = createApiEpic({
  request: actions.assignRequest,
  success: actions.assignSuccess,
  failure: actions.assignFailure,
  concurrency: "merge",
  execute: async ({ id, userId }) =>
    mapSalesOrder(
      asRecord(await http.post(`/api/sales-orders/${id}/assign`, { userId })),
    ),
});

export const salesOrdersEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  confirmEpic,
  cancelEpic,
  deleteEpic,
  assignEpic,
);
