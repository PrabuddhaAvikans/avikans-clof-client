import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import { manufacturingActions as actions } from "@/features/manufacturing/store/manufacturingSlice";
import { productionTrackingActions } from "@/features/manufacturing/store/productionTrackingSlice";
import { endOfDayManagementActions } from "@/features/end-of-day-management/store/endOfDayManagementSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapManufacturingJob } from "@/services/mappers/manufacturingMappers";

const refreshEndOfDayManagement = () => [endOfDayManagementActions.invalidateAll()];

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/manufacturing/jobs${buildQuery(filters)}`,
      ),
      mapManufacturingJob,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapManufacturingJob(asRecord(await http.get(`/api/manufacturing/jobs/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapManufacturingJob(asRecord(await http.post("/api/manufacturing/jobs", data))),
  onSuccess: () => [...refreshEndOfDayManagement()],
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapManufacturingJob(
      asRecord(await http.put(`/api/manufacturing/jobs/${id}`, data)),
    ),
  onSuccess: () => [
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const reserveMaterialsEpic = createApiEpic({
  request: actions.reserveMaterialsRequest,
  success: actions.reserveMaterialsSuccess,
  failure: actions.reserveMaterialsFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapManufacturingJob(
      asRecord(await http.post(`/api/manufacturing/jobs/${id}/reserve-materials`)),
    ),
  onSuccess: () => [
    inventoryActions.invalidateAll(),
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const startEpic = createApiEpic({
  request: actions.startRequest,
  success: actions.startSuccess,
  failure: actions.startFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapManufacturingJob(
      asRecord(await http.post(`/api/manufacturing/jobs/${id}/start`)),
    ),
  onSuccess: () => [
    inventoryActions.invalidateAll(),
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const completeEpic = createApiEpic({
  request: actions.completeRequest,
  success: actions.completeSuccess,
  failure: actions.completeFailure,
  concurrency: "merge",
  execute: async ({ id, completion }) =>
    mapManufacturingJob(
      asRecord(
        await http.post(`/api/manufacturing/jobs/${id}/complete`, completion ?? {}),
      ),
    ),
  onSuccess: () => [
    inventoryActions.invalidateAll(),
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const holdEpic = createApiEpic({
  request: actions.holdRequest,
  success: actions.holdSuccess,
  failure: actions.holdFailure,
  concurrency: "merge",
  execute: async ({ id, reason }) =>
    mapManufacturingJob(
      asRecord(await http.post(`/api/manufacturing/jobs/${id}/hold`, { reason })),
    ),
  onSuccess: () => [
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const taskActionEpic = createApiEpic({
  request: actions.taskActionRequest,
  success: actions.taskActionSuccess,
  failure: actions.taskActionFailure,
  concurrency: "merge",
  execute: async ({ id, action }) =>
    mapManufacturingJob(
      asRecord(await http.post(`/api/manufacturing/jobs/${id}/task-actions`, action)),
    ),
  onSuccess: () => [
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const bulkCompleteEpic = createApiEpic({
  request: actions.bulkCompleteRequest,
  success: actions.bulkCompleteSuccess,
  failure: actions.bulkCompleteFailure,
  concurrency: "merge",
  execute: async ({ id, tasks, taskIds, notes, activeSessionSwitch }) =>
    mapManufacturingJob(
      asRecord(
        await http.post(`/api/manufacturing/jobs/${id}/complete-tasks`, {
          tasks,
          taskIds,
          notes,
          activeSessionSwitch,
        }),
      ),
    ),
  onSuccess: () => [
    productionTrackingActions.invalidateAll(),
    ...refreshEndOfDayManagement(),
  ],
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/manufacturing/jobs/${id}`);
    return id;
  },
  onSuccess: () => [productionTrackingActions.invalidateAll()],
});

export const manufacturingEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  reserveMaterialsEpic,
  startEpic,
  completeEpic,
  holdEpic,
  taskActionEpic,
  bulkCompleteEpic,
  deleteEpic,
);
