import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { creditNotesActions as actions } from "@/features/finance/store/creditNotesSlice";
import { invoicesActions } from "@/features/finance/store/invoicesSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapCreditNote } from "@/services/mappers/creditNoteMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/credit-notes${buildQuery(filters)}`),
      mapCreditNote,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) =>
    mapCreditNote(asRecord(await http.get(`/api/credit-notes/${id}`))),
});

const applyEpic = createApiEpic({
  request: actions.applyRequest,
  success: actions.applySuccess,
  failure: actions.applyFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapCreditNote(
      asRecord(await http.post(`/api/credit-notes/${id}/apply`, data)),
    ),
  onSuccess: (_data, arg) => [
    invoicesActions.invalidateLists(),
    invoicesActions.fetchDetailRequest({
      arg: arg.data.invoiceId,
      key: arg.data.invoiceId,
    }),
  ],
});

export const creditNotesEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  applyEpic,
);
