import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { quotationsActions as actions } from "@/features/sales/store/quotationsSlice";
import { salesOrdersActions } from "@/features/sales/store/salesOrdersSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapProduct } from "@/services/mappers/productMappers";
import {
  mapQuotation,
  toApiQuotationPayload,
} from "@/services/mappers/quotationMappers";
import { mapSalesOrder } from "@/services/mappers/salesOrderMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/quotations${buildQuery(filters)}`),
      mapQuotation,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapQuotation(asRecord(await http.get(`/api/quotations/${id}`))),
});

const createEpic = createApiEpic({
  request: actions.createRequest,
  success: actions.createSuccess,
  failure: actions.createFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapQuotation(
      asRecord(await http.post("/api/quotations", toApiQuotationPayload(data))),
    ),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapQuotation(
      asRecord(
        await http.put(`/api/quotations/${id}`, {
          ...toApiQuotationPayload(data),
          id,
        }),
      ),
    ),
});

const sendEpic = createApiEpic({
  request: actions.sendRequest,
  success: actions.sendSuccess,
  failure: actions.sendFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapQuotation(asRecord(await http.post(`/api/quotations/${id}/send`))),
});

const convertEpic = createApiEpic({
  request: actions.convertRequest,
  success: actions.convertSuccess,
  failure: actions.convertFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapSalesOrder(
      asRecord(await http.post(`/api/quotations/${id}/convert-to-sales-order`)),
    ),
  onSuccess: () => [salesOrdersActions.invalidateAll()],
});

const deleteEpic = createApiEpic({
  request: actions.deleteRequest,
  success: actions.deleteSuccess,
  failure: actions.deleteFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/quotations/${id}`);
    return id;
  },
});

const addContactEpic = createApiEpic({
  request: actions.addContactRequest,
  success: actions.addContactSuccess,
  failure: actions.addContactFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapQuotation(asRecord(await http.post(`/api/quotations/${id}/contacts`, data))),
});

const approveCustomizationEpic = createApiEpic({
  request: actions.approveCustomizationRequest,
  success: actions.approveCustomizationSuccess,
  failure: actions.approveCustomizationFailure,
  concurrency: "merge",
  execute: async ({ quotationId, lineItemId, notes }) =>
    mapQuotation(
      asRecord(
        await http.post(
          `/api/quotations/${quotationId}/lines/${lineItemId}/approve-customization`,
          { notes },
        ),
      ),
    ),
});

const promoteCustomizationEpic = createApiEpic({
  request: actions.promoteCustomizationRequest,
  success: actions.promoteCustomizationSuccess,
  failure: actions.promoteCustomizationFailure,
  concurrency: "merge",
  execute: async ({ quotationId, lineItemId, notes }) => {
    const raw = asRecord(
      await http.post(
        `/api/quotations/${quotationId}/lines/${lineItemId}/promote-customization`,
        { revisionNotes: notes },
      ),
    );
    return {
      quotation: mapQuotation(asRecord(raw.quotation)),
      product: mapProduct(asRecord(raw.product)),
    };
  },
});

export const quotationsEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  sendEpic,
  convertEpic,
  deleteEpic,
  addContactEpic,
  approveCustomizationEpic,
  promoteCustomizationEpic,
);
