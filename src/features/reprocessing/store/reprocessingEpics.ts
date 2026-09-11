import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import { reprocessingActions } from "@/features/reprocessing/store/reprocessingSlice";
import { reprocessingService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: reprocessingActions.fetchListRequest,
  success: reprocessingActions.fetchListSuccess,
  failure: reprocessingActions.fetchListFailure,
  handler: (filters) => reprocessingService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: reprocessingActions.fetchDetailRequest,
  success: reprocessingActions.fetchDetailSuccess,
  failure: reprocessingActions.fetchDetailFailure,
  handler: (id) => reprocessingService.getById(id),
});

const fetchScrapLotsEpic = createAsyncEpic({
  request: reprocessingActions.fetchScrapLotsRequest,
  success: reprocessingActions.fetchScrapLotsSuccess,
  failure: reprocessingActions.fetchScrapLotsFailure,
  handler: () => reprocessingService.listReusableScrapLots(),
});

const createEpic = createAsyncEpic({
  request: reprocessingActions.createRequest,
  success: reprocessingActions.createSuccess,
  failure: reprocessingActions.createFailure,
  handler: (data) => reprocessingService.create(data),
  mode: "merge",
});

const startEpic = createAsyncEpic({
  request: reprocessingActions.startRequest,
  success: reprocessingActions.startSuccess,
  failure: reprocessingActions.startFailure,
  handler: (id) => reprocessingService.start(id),
  mode: "merge",
  onSuccess: () => [inventoryActions.invalidateAll()],
});

const completeEpic = createAsyncEpic({
  request: reprocessingActions.completeRequest,
  success: reprocessingActions.completeSuccess,
  failure: reprocessingActions.completeFailure,
  handler: ({ id, data }) => reprocessingService.complete(id, data),
  mode: "merge",
  onSuccess: () => [inventoryActions.invalidateAll()],
});

const cancelEpic = createAsyncEpic({
  request: reprocessingActions.cancelRequest,
  success: reprocessingActions.cancelSuccess,
  failure: reprocessingActions.cancelFailure,
  handler: ({ id, reason }) => reprocessingService.cancel(id, reason),
  mode: "merge",
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
