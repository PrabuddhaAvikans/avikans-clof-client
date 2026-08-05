import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { productionTrackingActions } from "@/features/manufacturing/store/productionTrackingSlice";
import { productionTrackingService } from "@/services";

const fetchSnapshotEpic = createAsyncEpic({
  request: productionTrackingActions.fetchSnapshotRequest,
  success: productionTrackingActions.fetchSnapshotSuccess,
  failure: productionTrackingActions.fetchSnapshotFailure,
  handler: () => productionTrackingService.getSnapshot(),
});

const fetchListEpic = createAsyncEpic({
  request: productionTrackingActions.fetchListRequest,
  success: productionTrackingActions.fetchListSuccess,
  failure: productionTrackingActions.fetchListFailure,
  handler: (filters) => productionTrackingService.listJobs(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: productionTrackingActions.fetchDetailRequest,
  success: productionTrackingActions.fetchDetailSuccess,
  failure: productionTrackingActions.fetchDetailFailure,
  handler: (id) => productionTrackingService.getJobById(id),
});

const startEpic = createAsyncEpic({
  request: productionTrackingActions.startRequest,
  success: productionTrackingActions.startSuccess,
  failure: productionTrackingActions.startFailure,
  handler: (ids) => productionTrackingService.startProduction(ids),
  mode: "merge",
});

const updateStageEpic = createAsyncEpic({
  request: productionTrackingActions.updateStageRequest,
  success: productionTrackingActions.updateStageSuccess,
  failure: productionTrackingActions.updateStageFailure,
  handler: ({ id, comment }) => productionTrackingService.updateStage(id, comment),
  mode: "merge",
});

const holdEpic = createAsyncEpic({
  request: productionTrackingActions.holdRequest,
  success: productionTrackingActions.holdSuccess,
  failure: productionTrackingActions.holdFailure,
  handler: ({ id, reason }) => productionTrackingService.holdJob(id, reason),
  mode: "merge",
});

const releaseToQcEpic = createAsyncEpic({
  request: productionTrackingActions.releaseToQcRequest,
  success: productionTrackingActions.releaseToQcSuccess,
  failure: productionTrackingActions.releaseToQcFailure,
  handler: (id) => productionTrackingService.releaseToQc(id),
  mode: "merge",
});

export const productionTrackingEpic = combineEpics(
  fetchSnapshotEpic,
  fetchListEpic,
  fetchDetailEpic,
  startEpic,
  updateStageEpic,
  holdEpic,
  releaseToQcEpic,
);
