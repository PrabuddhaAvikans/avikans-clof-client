import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { categoriesActions } from "@/features/products/store/categoriesSlice";
import { categoryService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: categoriesActions.fetchListRequest,
  success: categoriesActions.fetchListSuccess,
  failure: categoriesActions.fetchListFailure,
  handler: (filters) => categoryService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: categoriesActions.fetchDetailRequest,
  success: categoriesActions.fetchDetailSuccess,
  failure: categoriesActions.fetchDetailFailure,
  handler: (id) => categoryService.getById(id),
});

const fetchTreeEpic = createAsyncEpic({
  request: categoriesActions.fetchTreeRequest,
  success: categoriesActions.fetchTreeSuccess,
  failure: categoriesActions.fetchTreeFailure,
  handler: () => categoryService.getTree(),
});

const createEpic = createAsyncEpic({
  request: categoriesActions.createRequest,
  success: categoriesActions.createSuccess,
  failure: categoriesActions.createFailure,
  handler: (data) => categoryService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: categoriesActions.updateRequest,
  success: categoriesActions.updateSuccess,
  failure: categoriesActions.updateFailure,
  handler: ({ id, data }) => categoryService.update(id, data),
  mode: "merge",
});

const deleteEpic = createAsyncEpic({
  request: categoriesActions.deleteRequest,
  success: categoriesActions.deleteSuccess,
  failure: categoriesActions.deleteFailure,
  handler: async (id) => {
    await categoryService.delete(id);
    return id;
  },
  mode: "merge",
});

export const categoriesEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchTreeEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
