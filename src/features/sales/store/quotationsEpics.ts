import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { quotationsActions } from "@/features/sales/store/quotationsSlice";
import { salesOrdersActions } from "@/features/sales/store/salesOrdersSlice";
import { quotationService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: quotationsActions.fetchListRequest,
  success: quotationsActions.fetchListSuccess,
  failure: quotationsActions.fetchListFailure,
  handler: (filters) => quotationService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: quotationsActions.fetchDetailRequest,
  success: quotationsActions.fetchDetailSuccess,
  failure: quotationsActions.fetchDetailFailure,
  handler: (id) => quotationService.getById(id),
});

const createEpic = createAsyncEpic({
  request: quotationsActions.createRequest,
  success: quotationsActions.createSuccess,
  failure: quotationsActions.createFailure,
  handler: (data) => quotationService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: quotationsActions.updateRequest,
  success: quotationsActions.updateSuccess,
  failure: quotationsActions.updateFailure,
  handler: ({ id, data }) => quotationService.update(id, data),
  mode: "merge",
});

const sendEpic = createAsyncEpic({
  request: quotationsActions.sendRequest,
  success: quotationsActions.sendSuccess,
  failure: quotationsActions.sendFailure,
  handler: (id) => quotationService.send(id),
  mode: "merge",
});

const convertEpic = createAsyncEpic({
  request: quotationsActions.convertRequest,
  success: quotationsActions.convertSuccess,
  failure: quotationsActions.convertFailure,
  handler: (id) => quotationService.convertToSalesOrder(id),
  mode: "merge",
  onSuccess: () => [salesOrdersActions.invalidateAll()],
});

const deleteEpic = createAsyncEpic({
  request: quotationsActions.deleteRequest,
  success: quotationsActions.deleteSuccess,
  failure: quotationsActions.deleteFailure,
  handler: async (id) => {
    await quotationService.delete(id);
    return id;
  },
  mode: "merge",
});

const addContactEpic = createAsyncEpic({
  request: quotationsActions.addContactRequest,
  success: quotationsActions.addContactSuccess,
  failure: quotationsActions.addContactFailure,
  handler: ({ id, data }) => quotationService.addContactEntry(id, data),
  mode: "merge",
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
);
