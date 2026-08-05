import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { customersActions } from "@/features/customers/store/customersSlice";
import { customerService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: customersActions.fetchListRequest,
  success: customersActions.fetchListSuccess,
  failure: customersActions.fetchListFailure,
  handler: (filters) => customerService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: customersActions.fetchDetailRequest,
  success: customersActions.fetchDetailSuccess,
  failure: customersActions.fetchDetailFailure,
  handler: (id) => customerService.getById(id),
});

const createEpic = createAsyncEpic({
  request: customersActions.createRequest,
  success: customersActions.createSuccess,
  failure: customersActions.createFailure,
  handler: (data) => customerService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: customersActions.updateRequest,
  success: customersActions.updateSuccess,
  failure: customersActions.updateFailure,
  handler: ({ id, data }) => customerService.update(id, data),
  mode: "merge",
});

const deleteEpic = createAsyncEpic({
  request: customersActions.deleteRequest,
  success: customersActions.deleteSuccess,
  failure: customersActions.deleteFailure,
  handler: async (id) => {
    await customerService.delete(id);
    return id;
  },
  mode: "merge",
});

export const customersEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
