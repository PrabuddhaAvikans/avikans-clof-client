import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import { reprocessingActions as actions } from "@/features/reprocessing/store/reprocessingSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapBatch, mapScrapLot } from "@/services/mappers/reprocessingMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/reprocessing${buildQuery(filters)}`),
      mapBatch,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapBatch(asRecord(await http.get(`/api/reprocessing/${id}`))),
});

const fetchScrapLotsEpic = createApiEpic({
  request: actions.fetchScrapLotsRequest,
  success: actions.fetchScrapLotsSuccess,
  failure: actions.fetchScrapLotsFailure,
  execute: async () => {
    const raw = await http.get<unknown[]>("/api/reprocessing/scrap-lots");
    return (raw ?? []).map((item) => mapScrapLot(item as Record<string, unknown>));
  },
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapBatch(
      asRecord(
        await http.post("/api/reprocessing", {
          inputScrapLotId: data.inputScrapLotId,
          inputQuantity: data.inputQuantity,
          costs: data.costs,
          sourceProductionOrderId: data.sourceProductionOrderId,
          notes: data.notes,
        }),
      ),
    ),
});

const startEpic = createApiEpic({
  request: actions.startRequest,
  success: actions.startSuccess,
  failure: actions.startFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapBatch(asRecord(await http.post(`/api/reprocessing/${id}/start`))),
  onSuccess: () => [inventoryActions.invalidateAll()],
});

const completeEpic = createApiEpic({
  request: actions.completeRequest,
  success: actions.completeSuccess,
  failure: actions.completeFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapBatch(
      asRecord(
        await http.post(`/api/reprocessing/${id}/complete`, {
          recoveredQuantity: data.recoveredQuantity,
          processLossQuantity: data.processLossQuantity,
          costs: data.costs,
          notes: data.notes,
        }),
      ),
    ),
  onSuccess: () => [inventoryActions.invalidateAll()],
});

const cancelEpic = createApiEpic({
  request: actions.cancelRequest,
  success: actions.cancelSuccess,
  failure: actions.cancelFailure,
  concurrency: "merge",
  execute: async ({ id, reason }) =>
    mapBatch(
      asRecord(await http.post(`/api/reprocessing/${id}/cancel`, { reason })),
    ),
});

export const reprocessingEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchScrapLotsEpic,
  createEpic,
  startEpic,
  completeEpic,
  cancelEpic,
);
