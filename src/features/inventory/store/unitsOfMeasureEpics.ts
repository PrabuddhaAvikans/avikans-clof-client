import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { unitsOfMeasureActions as actions } from "@/features/inventory/store/unitsOfMeasureSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapUnit } from "@/services/mappers/unitOfMeasureMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/units-of-measure${buildQuery(filters)}`,
      ),
      mapUnit,
    ),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapUnit(
      asRecord(
        await http.post("/api/units-of-measure", {
          code: data.code,
          name: data.name,
          status: data.status ?? "active",
        }),
      ),
    ),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapUnit(asRecord(await http.put(`/api/units-of-measure/${id}`, data))),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/units-of-measure/${id}`);
    return id;
  },
});

export const unitsOfMeasureEpic = combineEpics(
  fetchListEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
