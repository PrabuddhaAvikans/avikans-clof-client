import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { manufacturingActions } from "@/features/manufacturing/store/manufacturingSlice";
import { productionTrackingActions as actions } from "@/features/manufacturing/store/productionTrackingSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import {
  mapProductionJob,
  mapSnapshot,
} from "@/services/mappers/productionTrackingMappers";

const fetchSnapshotEpic = createApiEpic({
  request: actions.fetchSnapshotRequest,
  success: actions.fetchSnapshotSuccess,
  failure: actions.fetchSnapshotFailure,
  execute: async () =>
    mapSnapshot(
      asRecord(await http.get("/api/manufacturing/production-tracking/snapshot")),
    ),
});

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/manufacturing/production-tracking/jobs${buildQuery(filters)}`,
      ),
      mapProductionJob,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapProductionJob(
      asRecord(await http.get(`/api/manufacturing/production-tracking/jobs/${id}`)),
    ),
});

const startEpic = createApiEpic({
  request: actions.startRequest,
  success: actions.startSuccess,
  failure: actions.startFailure,
  concurrency: "merge",
  execute: async (ids) => {
    await http.post("/api/manufacturing/production-tracking/start", { ids });
    return undefined;
  },
  onSuccess: () => [manufacturingActions.invalidateAll()],
});

const updateStageEpic = createApiEpic({
  request: actions.updateStageRequest,
  success: actions.updateStageSuccess,
  failure: actions.updateStageFailure,
  concurrency: "merge",
  execute: async ({ id, comment }) =>
    mapProductionJob(
      asRecord(
        await http.post(
          `/api/manufacturing/production-tracking/jobs/${id}/update-stage`,
          { comment },
        ),
      ),
    ),
  onSuccess: () => [manufacturingActions.invalidateAll()],
});

const holdEpic = createApiEpic({
  request: actions.holdRequest,
  success: actions.holdSuccess,
  failure: actions.holdFailure,
  concurrency: "merge",
  execute: async ({ id, reason }) =>
    mapProductionJob(
      asRecord(
        await http.post(
          `/api/manufacturing/production-tracking/jobs/${id}/hold`,
          { reason },
        ),
      ),
    ),
  onSuccess: () => [manufacturingActions.invalidateAll()],
});

const releaseToQcEpic = createApiEpic({
  request: actions.releaseToQcRequest,
  success: actions.releaseToQcSuccess,
  failure: actions.releaseToQcFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapProductionJob(
      asRecord(
        await http.post(
          `/api/manufacturing/production-tracking/jobs/${id}/release-to-qc`,
        ),
      ),
    ),
  onSuccess: () => [manufacturingActions.invalidateAll()],
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
