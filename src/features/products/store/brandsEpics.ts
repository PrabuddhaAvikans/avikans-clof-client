import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { brandsActions } from "@/features/products/store/brandsSlice";
import { brandService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: brandsActions.fetchListRequest,
  success: brandsActions.fetchListSuccess,
  failure: brandsActions.fetchListFailure,
  handler: (filters) => brandService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: brandsActions.fetchDetailRequest,
  success: brandsActions.fetchDetailSuccess,
  failure: brandsActions.fetchDetailFailure,
  handler: (id) => brandService.getById(id),
});

const createEpic = createAsyncEpic({
  request: brandsActions.createRequest,
  success: brandsActions.createSuccess,
  failure: brandsActions.createFailure,
  handler: (data) => brandService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: brandsActions.updateRequest,
  success: brandsActions.updateSuccess,
  failure: brandsActions.updateFailure,
  handler: ({ id, data }) => brandService.update(id, data),
  mode: "merge",
});

const deleteEpic = createAsyncEpic({
  request: brandsActions.deleteRequest,
  success: brandsActions.deleteSuccess,
  failure: brandsActions.deleteFailure,
  handler: async (id) => {
    await brandService.delete(id);
    return id;
  },
  mode: "merge",
});

export const brandsEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  deleteEpic,
);
