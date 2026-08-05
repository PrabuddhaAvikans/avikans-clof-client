import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { salesOrdersActions } from "@/features/sales/store/salesOrdersSlice";
import { salesOrderService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: salesOrdersActions.fetchListRequest,
  success: salesOrdersActions.fetchListSuccess,
  failure: salesOrdersActions.fetchListFailure,
  handler: (filters) => salesOrderService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: salesOrdersActions.fetchDetailRequest,
  success: salesOrdersActions.fetchDetailSuccess,
  failure: salesOrdersActions.fetchDetailFailure,
  handler: (id) => salesOrderService.getById(id),
});

const createEpic = createAsyncEpic({
  request: salesOrdersActions.createRequest,
  success: salesOrdersActions.createSuccess,
  failure: salesOrdersActions.createFailure,
  handler: (data) => salesOrderService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: salesOrdersActions.updateRequest,
  success: salesOrdersActions.updateSuccess,
  failure: salesOrdersActions.updateFailure,
  handler: ({ id, data }) => salesOrderService.update(id, data),
  mode: "merge",
});

const confirmEpic = createAsyncEpic({
  request: salesOrdersActions.confirmRequest,
  success: salesOrdersActions.confirmSuccess,
  failure: salesOrdersActions.confirmFailure,
  handler: (id) => salesOrderService.confirm(id),
  mode: "merge",
});

const cancelEpic = createAsyncEpic({
  request: salesOrdersActions.cancelRequest,
  success: salesOrdersActions.cancelSuccess,
  failure: salesOrdersActions.cancelFailure,
  handler: ({ id, reason }) => salesOrderService.cancel(id, reason),
  mode: "merge",
});

const deleteEpic = createAsyncEpic({
  request: salesOrdersActions.deleteRequest,
  success: salesOrdersActions.deleteSuccess,
  failure: salesOrdersActions.deleteFailure,
  handler: async (id) => {
    await salesOrderService.delete(id);
    return id;
  },
  mode: "merge",
});

const assignEpic = createAsyncEpic({
  request: salesOrdersActions.assignRequest,
  success: salesOrdersActions.assignSuccess,
  failure: salesOrdersActions.assignFailure,
  handler: ({ id, userId }) => salesOrderService.assign(id, userId),
  mode: "merge",
});

export const salesOrdersEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  confirmEpic,
  cancelEpic,
  deleteEpic,
  assignEpic,
);
