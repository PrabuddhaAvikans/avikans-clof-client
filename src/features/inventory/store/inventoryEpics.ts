import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import { inventoryService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: inventoryActions.fetchListRequest,
  success: inventoryActions.fetchListSuccess,
  failure: inventoryActions.fetchListFailure,
  handler: (filters) => inventoryService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: inventoryActions.fetchDetailRequest,
  success: inventoryActions.fetchDetailSuccess,
  failure: inventoryActions.fetchDetailFailure,
  handler: (id) => inventoryService.getById(id),
});

const fetchPriceHistoryEpic = createAsyncEpic({
  request: inventoryActions.fetchPriceHistoryRequest,
  success: inventoryActions.fetchPriceHistorySuccess,
  failure: inventoryActions.fetchPriceHistoryFailure,
  handler: (id) => inventoryService.getPriceHistory(id),
});

const fetchLowStockEpic = createAsyncEpic({
  request: inventoryActions.fetchLowStockRequest,
  success: inventoryActions.fetchLowStockSuccess,
  failure: inventoryActions.fetchLowStockFailure,
  handler: () => inventoryService.getLowStock(),
});

const fetchMovementsEpic = createAsyncEpic({
  request: inventoryActions.fetchMovementsRequest,
  success: inventoryActions.fetchMovementsSuccess,
  failure: inventoryActions.fetchMovementsFailure,
  handler: (filters) => inventoryService.listMovements(filters),
});

const createEpic = createAsyncEpic({
  request: inventoryActions.createRequest,
  success: inventoryActions.createSuccess,
  failure: inventoryActions.createFailure,
  handler: (data) => inventoryService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: inventoryActions.updateRequest,
  success: inventoryActions.updateSuccess,
  failure: inventoryActions.updateFailure,
  handler: ({ id, data }) => inventoryService.update(id, data),
  mode: "merge",
});

const recordMovementEpic = createAsyncEpic({
  request: inventoryActions.recordMovementRequest,
  success: inventoryActions.recordMovementSuccess,
  failure: inventoryActions.recordMovementFailure,
  handler: ({ inventoryItemId, type, quantity, reference }) =>
    inventoryService.recordMovement(inventoryItemId, type, quantity, reference),
  mode: "merge",
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
