import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import { manufacturingActions } from "@/features/manufacturing/store/manufacturingSlice";
import { manufacturingService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: manufacturingActions.fetchListRequest,
  success: manufacturingActions.fetchListSuccess,
  failure: manufacturingActions.fetchListFailure,
  handler: (filters) => manufacturingService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: manufacturingActions.fetchDetailRequest,
  success: manufacturingActions.fetchDetailSuccess,
  failure: manufacturingActions.fetchDetailFailure,
  handler: (id) => manufacturingService.getById(id),
});

const createEpic = createAsyncEpic({
  request: manufacturingActions.createRequest,
  success: manufacturingActions.createSuccess,
  failure: manufacturingActions.createFailure,
  handler: (data) => manufacturingService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: manufacturingActions.updateRequest,
  success: manufacturingActions.updateSuccess,
  failure: manufacturingActions.updateFailure,
  handler: ({ id, data }) => manufacturingService.update(id, data),
  mode: "merge",
});

const reserveMaterialsEpic = createAsyncEpic({
  request: manufacturingActions.reserveMaterialsRequest,
  success: manufacturingActions.reserveMaterialsSuccess,
  failure: manufacturingActions.reserveMaterialsFailure,
  handler: (id) => manufacturingService.reserveMaterials(id),
  mode: "merge",
  onSuccess: () => [inventoryActions.invalidateAll()],
});

const startEpic = createAsyncEpic({
  request: manufacturingActions.startRequest,
  success: manufacturingActions.startSuccess,
  failure: manufacturingActions.startFailure,
  handler: (id) => manufacturingService.startJob(id),
  mode: "merge",
});

const completeEpic = createAsyncEpic({
  request: manufacturingActions.completeRequest,
  success: manufacturingActions.completeSuccess,
  failure: manufacturingActions.completeFailure,
  handler: (id) => manufacturingService.completeJob(id),
  mode: "merge",
});

export const manufacturingEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  reserveMaterialsEpic,
  startEpic,
  completeEpic,
);
