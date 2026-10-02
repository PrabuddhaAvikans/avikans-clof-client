import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { warehousesActions as actions } from "@/features/inventory/store/warehousesSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapWarehouse } from "@/services/mappers/warehouseMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/warehouses${buildQuery(filters)}`),
      mapWarehouse,
    ),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapWarehouse(asRecord(await http.post("/api/warehouses", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapWarehouse(asRecord(await http.put(`/api/warehouses/${id}`, data))),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/warehouses/${id}`);
    return id;
  },
});

export const warehousesEpic = combineEpics(
  fetchListEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
