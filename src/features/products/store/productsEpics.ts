import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { productsActions } from "@/features/products/store/productsSlice";
import { productService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: productsActions.fetchListRequest,
  success: productsActions.fetchListSuccess,
  failure: productsActions.fetchListFailure,
  handler: (filters) => productService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: productsActions.fetchDetailRequest,
  success: productsActions.fetchDetailSuccess,
  failure: productsActions.fetchDetailFailure,
  handler: (id) => productService.getById(id),
});

const createEpic = createAsyncEpic({
  request: productsActions.createRequest,
  success: productsActions.createSuccess,
  failure: productsActions.createFailure,
  handler: (data) => productService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: productsActions.updateRequest,
  success: productsActions.updateSuccess,
  failure: productsActions.updateFailure,
  handler: ({ id, data }) => productService.update(id, data),
  mode: "merge",
});

const deleteEpic = createAsyncEpic({
  request: productsActions.deleteRequest,
  success: productsActions.deleteSuccess,
  failure: productsActions.deleteFailure,
  handler: async (id) => {
    await productService.delete(id);
    return id;
  },
  mode: "merge",
});

export const productsEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
