import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { customersActions as actions } from "@/features/customers/store/customersSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapCustomer } from "@/services/mappers/customerMappers";
import type { CustomerFormData, CustomerListFilters } from "@/services";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters: CustomerListFilters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/customers${buildQuery(filters)}`,
      ),
      mapCustomer,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) => mapCustomer(asRecord(await http.get(`/api/customers/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data: CustomerFormData) =>
    mapCustomer(asRecord(await http.post("/api/customers", data))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapCustomer(asRecord(await http.put(`/api/customers/${id}`, data))),
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/customers/${id}`);
    return id;
  },
});

export const customersEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
