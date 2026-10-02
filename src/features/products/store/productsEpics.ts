import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { productsActions as actions } from "@/features/products/store/productsSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapProduct } from "@/services/mappers/productMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) => {
    const params: Record<string, unknown> = { ...filters };
    if (filters.tags?.length) params.tags = filters.tags.join(",");
    return mapPaginatedResponse(await http.get(`/api/products${buildQuery(params)}`), mapProduct);
  },
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) => mapProduct(asRecord(await http.get(`/api/products/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) => mapProduct(asRecord(await http.post("/api/products", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapProduct(asRecord(await http.put(`/api/products/${id}`, data))),
});

const updateVersionEpic = createApiEpic({
  request: actions.updateVersionRequest,
  success: actions.updateVersionSuccess,
  failure: actions.updateVersionFailure,
  concurrency: "merge",
  execute: async ({ productId, versionId, data }) =>
    mapProduct(
      asRecord(
        await http.put(`/api/products/${productId}/versions/${versionId}`, data),
      ),
    ),
});

const reviseVersionEpic = createApiEpic({
  request: actions.reviseVersionRequest,
  success: actions.reviseVersionSuccess,
  failure: actions.reviseVersionFailure,
  concurrency: "merge",
  execute: async ({ productId, sourceVersionId, revisionNotes }) =>
    mapProduct(
      asRecord(
        await http.post(
          `/api/products/${productId}/versions/${sourceVersionId}/revise`,
          { revisionNotes },
        ),
      ),
    ),
});

const updateHeaderEpic = createApiEpic({
  request: actions.updateHeaderRequest,
  success: actions.updateHeaderSuccess,
  failure: actions.updateHeaderFailure,
  concurrency: "merge",
  execute: async ({ productId, data }) =>
    mapProduct(asRecord(await http.put(`/api/products/${productId}/header`, data))),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/products/${id}`);
    return id;
  },
});

export const productsEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  updateVersionEpic,
  reviseVersionEpic,
  updateHeaderEpic,
  deleteEpic,
);
