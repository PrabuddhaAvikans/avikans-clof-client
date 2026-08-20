import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
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
import type { ProductListFilters } from "@/services";
import type {
  Product,
  ProductFormData,
  ProductHeaderFormData,
  ProductVersionFormData,
} from "@/types/product";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Product>;
type UpdateArg = { id: string; data: Partial<ProductFormData> };
type UpdateVersionArg = {
  productId: string;
  versionId: string;
  data: ProductVersionFormData;
};
type ReviseVersionArg = {
  productId: string;
  sourceVersionId: string;
  revisionNotes?: string;
};
type UpdateHeaderArg = { productId: string; data: ProductHeaderFormData };

export type ProductsState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Product>>;
  create: MutationEntry;
  update: MutationEntry;
  updateVersion: MutationEntry;
  reviseVersion: MutationEntry;
  updateHeader: MutationEntry;
  remove: MutationEntry;
};

const initialState: ProductsState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  updateVersion: createMutationEntry(),
  reviseVersion: createMutationEntry(),
  updateHeader: createMutationEntry(),
  remove: createMutationEntry(),
};

function upsertDetail(state: ProductsState, product: Product): void {
  state.details[product.id] = {
    data: product,
    status: "succeeded",
    error: null,
  };
}

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<ProductListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<ProductFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setMutationSuccess(state.create);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    updateRequest(state, _action: PayloadAction<RequestPayload<UpdateArg>>) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    updateVersionRequest(state, _action: PayloadAction<RequestPayload<UpdateVersionArg>>) {
      setMutationLoading(state.updateVersion);
    },
    updateVersionSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setMutationSuccess(state.updateVersion);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateVersionFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.updateVersion, action);
    },

    reviseVersionRequest(state, _action: PayloadAction<RequestPayload<ReviseVersionArg>>) {
      setMutationLoading(state.reviseVersion);
    },
    reviseVersionSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setMutationSuccess(state.reviseVersion);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    reviseVersionFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reviseVersion, action);
    },

    updateHeaderRequest(state, _action: PayloadAction<RequestPayload<UpdateHeaderArg>>) {
      setMutationLoading(state.updateHeader);
    },
    updateHeaderSuccess(state, action: PayloadAction<SuccessPayload<Product>>) {
      setMutationSuccess(state.updateHeader);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateHeaderFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.updateHeader, action);
    },

    deleteRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.remove);
    },
    deleteSuccess(state, action: PayloadAction<SuccessPayload<string>>) {
      setMutationSuccess(state.remove);
      delete state.details[action.payload.data];
      invalidateEntries(state.lists);
    },
    deleteFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.remove, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const productsActions = productsSlice.actions;
export default productsSlice.reducer;
