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
import type { BrandFormData, BrandListFilters } from "@/services";
import type { Brand } from "@/types/brand";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Brand>;
type UpdateArg = { id: string; data: Partial<BrandFormData> };

export type BrandsState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Brand>>;
  create: MutationEntry;
  update: MutationEntry;
  remove: MutationEntry;
};

const initialState: BrandsState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  remove: createMutationEntry(),
};

function upsertDetail(state: BrandsState, brand: Brand): void {
  state.details[brand.id] = {
    data: brand,
    status: "succeeded",
    error: null,
  };
}

const brandsSlice = createSlice({
  name: "brands",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<BrandListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Brand>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<BrandFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Brand>>) {
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
    updateSuccess(state, action: PayloadAction<SuccessPayload<Brand>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
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

export const brandsActions = brandsSlice.actions;
export default brandsSlice.reducer;
