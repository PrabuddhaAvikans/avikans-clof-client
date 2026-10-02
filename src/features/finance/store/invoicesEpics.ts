import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { invoicesActions as actions } from "@/features/finance/store/invoicesSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapInvoice } from "@/services/mappers/invoiceMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/invoices${buildQuery(filters)}`),
      mapInvoice,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) => mapInvoice(asRecord(await http.get(`/api/invoices/${id}`))),
});

export const invoicesEpic = combineEpics(fetchListEpic, fetchDetailEpic);
