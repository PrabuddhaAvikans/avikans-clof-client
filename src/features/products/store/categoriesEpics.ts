import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { categoriesActions as actions } from "@/features/products/store/categoriesSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapCategory } from "@/services/mappers/categoryMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/categories${buildQuery(filters)}`),
      mapCategory,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapCategory(asRecord(await http.get(`/api/categories/${id}`))),
});

const fetchTreeEpic = createApiEpic({
  request: actions.fetchTreeRequest,
  success: actions.fetchTreeSuccess,
  failure: actions.fetchTreeFailure,
  execute: async () => {
    const raw = await http.get<unknown[]>("/api/categories/tree");
    return (raw ?? []).map((item) => mapCategory(item as Record<string, unknown>));
  },
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapCategory(asRecord(await http.post("/api/categories", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapCategory(
      asRecord(
        await http.put(`/api/categories/${id}`, {
          ...data,
          clearParent: data.parentId === null,
        }),
      ),
    ),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/categories/${id}`);
    return id;
  },
});

export const categoriesEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchTreeEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
