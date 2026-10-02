import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { deliveriesActions as actions } from "@/features/delivery/store/deliveriesSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapDelivery } from "@/services/mappers/deliveryMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/deliveries${buildQuery(filters)}`),
      mapDelivery,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapDelivery(asRecord(await http.get(`/api/deliveries/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapDelivery(asRecord(await http.post("/api/deliveries", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapDelivery(asRecord(await http.put(`/api/deliveries/${id}`, data))),
});

const updateStatusEpic = createApiEpic({
  request: actions.updateStatusRequest,
  success: actions.updateStatusSuccess,
  failure: actions.updateStatusFailure,
  concurrency: "merge",
  execute: async ({ id, status }) =>
    mapDelivery(
      asRecord(await http.post(`/api/deliveries/${id}/status`, { status })),
    ),
});

const dispatchEpic = createApiEpic({
  request: actions.dispatchRequest,
  success: actions.dispatchSuccess,
  failure: actions.dispatchFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapDelivery(asRecord(await http.post(`/api/deliveries/${id}/dispatch`))),
});

const recordProofEpic = createApiEpic({
  request: actions.recordProofRequest,
  success: actions.recordProofSuccess,
  failure: actions.recordProofFailure,
  concurrency: "merge",
  execute: async ({ id, proof }) =>
    mapDelivery(
      asRecord(await http.post(`/api/deliveries/${id}/proof-of-delivery`, proof)),
    ),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/deliveries/${id}`);
    return id;
  },
});

export const deliveriesEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  updateStatusEpic,
  dispatchEpic,
  recordProofEpic,
  deleteEpic,
);
