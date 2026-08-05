import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createAsyncEntry,
  createMutationEntry,
  emptyCache,
  invalidateEntries,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry, MutationEntry } from "@/app/store/async/types";
import type { CategoryFormData, CategoryListFilters } from "@/services";
import type { Category } from "@/types/category";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Category>;
type UpdateArg = { id: string; data: Partial<CategoryFormData> };
type TreeArg = null | Record<string, never>;

export type CategoriesState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Category>>;
  tree: AsyncEntry<Category[]>;
  create: MutationEntry;
  update: MutationEntry;
  remove: MutationEntry;
};

const initialState: CategoriesState = {
  lists: emptyCache(),
  details: emptyCache(),
  tree: createAsyncEntry(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  remove: createMutationEntry(),
};

function upsertDetail(state: CategoriesState, category: Category): void {
  state.details[category.id] = {
    data: category,
    status: "succeeded",
    error: null,
  };
}

function invalidateTree(state: CategoriesState): void {
  state.tree = {
    data: state.tree.data,
    status: "idle",
    error: null,
  };
}

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<CategoryListFilters>>) {
      if (action.payload.key) setEntryLoading(state.lists, action.payload.key);
    },
    fetchListSuccess(state, action: PayloadAction<SuccessPayload<ListData>>) {
      setEntrySuccess(state.lists, action);
    },
    fetchListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.lists, action);
    },

    fetchDetailRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.details, action.payload.key);
    },
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Category>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    fetchTreeRequest(state, _action: PayloadAction<RequestPayload<TreeArg>>) {
      state.tree = {
        data: state.tree.data,
        status: "loading",
        error: null,
      };
    },
    fetchTreeSuccess(state, action: PayloadAction<SuccessPayload<Category[]>>) {
      state.tree = {
        data: action.payload.data,
        status: "succeeded",
        error: null,
      };
    },
    fetchTreeFailure(state, action: PayloadAction<FailurePayload>) {
      state.tree = {
        data: state.tree.data,
        status: "failed",
        error: action.payload.error,
      };
    },

    createRequest(state, _action: PayloadAction<RequestPayload<CategoryFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Category>>) {
      setMutationSuccess(state.create);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
      invalidateTree(state);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    updateRequest(state, _action: PayloadAction<RequestPayload<UpdateArg>>) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, action: PayloadAction<SuccessPayload<Category>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
      invalidateTree(state);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    deleteRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.remove);
    },
    deleteSuccess(state, action: PayloadAction<SuccessPayload<string>>) {
      setMutationSuccess(state.remove);
      delete state.details[action.payload.data];
      invalidateEntries(state.lists);
      invalidateTree(state);
    },
    deleteFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.remove, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
      invalidateTree(state);
    },
  },
});

export const categoriesActions = categoriesSlice.actions;
export default categoriesSlice.reducer;
