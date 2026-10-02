import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { inventoryActions as actions } from "@/features/inventory/store/inventorySlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import {
  mapItem,
  mapMovement,
  mapPriceHistory,
} from "@/services/mappers/inventoryMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/inventory${buildQuery(filters)}`),
      mapItem,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) => mapItem(asRecord(await http.get(`/api/inventory/${id}`))),
});

const fetchPriceHistoryEpic = createApiEpic({
  request: actions.fetchPriceHistoryRequest,
  success: actions.fetchPriceHistorySuccess,
  failure: actions.fetchPriceHistoryFailure,
  execute: async (id) => {
    const raw = await http.get<unknown[]>(`/api/inventory/${id}/price-history`);
    return (raw ?? []).map((item) => mapPriceHistory(item as Record<string, unknown>));
  },
});

const fetchLowStockEpic = createApiEpic({
  request: actions.fetchLowStockRequest,
  success: actions.fetchLowStockSuccess,
  failure: actions.fetchLowStockFailure,
  execute: async () => {
    const raw = await http.get<unknown[]>("/api/inventory/low-stock");
    return (raw ?? []).map((item) => mapItem(item as Record<string, unknown>));
  },
});

const fetchMovementsEpic = createApiEpic({
  request: actions.fetchMovementsRequest,
  success: actions.fetchMovementsSuccess,
  failure: actions.fetchMovementsFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/inventory/movements${buildQuery(filters)}`,
      ),
      mapMovement,
    ),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) => mapItem(asRecord(await http.post("/api/inventory", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapItem(asRecord(await http.put(`/api/inventory/${id}`, data))),
});

const recordMovementEpic = createApiEpic({
  request: actions.recordMovementRequest,
  success: actions.recordMovementSuccess,
  failure: actions.recordMovementFailure,
  concurrency: "merge",
  execute: async ({ inventoryItemId, type, quantity, reference }) =>
    mapMovement(
      asRecord(
        await http.post(`/api/inventory/${inventoryItemId}/movements`, {
          type,
          quantity,
          referenceType: reference?.referenceType,
          referenceId: reference?.referenceId,
          notes: reference?.notes,
          trace: reference?.trace,
        }),
      ),
    ),
});

export const inventoryEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchPriceHistoryEpic,
  fetchLowStockEpic,
  fetchMovementsEpic,
  createEpic,
  updateEpic,
  recordMovementEpic,
);
