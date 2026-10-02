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
import type { UnitOfMeasureFormData, UnitOfMeasureListFilters } from "@/services";
import type { UnitOfMeasure } from "@/lib/unitsOfMeasure";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<UnitOfMeasure>;
type UpdateArg = { id: string; data: Partial<UnitOfMeasureFormData> };

export type UnitsOfMeasureState = {
  lists: Record<string, AsyncEntry<ListData>>;
  create: MutationEntry;
  update: MutationEntry;
  remove: MutationEntry;
};

const initialState: UnitsOfMeasureState = {
  lists: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  remove: createMutationEntry(),
};

const unitsOfMeasureSlice = createSlice({
  name: "unitsOfMeasure",
  initialState,
  reducers: {
    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<UnitOfMeasureListFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.lists, action.payload.key);
    },
    fetchListSuccess(state, action: PayloadAction<SuccessPayload<ListData>>) {
      setEntrySuccess(state.lists, action);
    },
    fetchListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.lists, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<UnitOfMeasureFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, _action: PayloadAction<SuccessPayload<UnitOfMeasure>>) {
      setMutationSuccess(state.create);
      invalidateEntries(state.lists);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    updateRequest(state, _action: PayloadAction<RequestPayload<UpdateArg>>) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, _action: PayloadAction<SuccessPayload<UnitOfMeasure>>) {
      setMutationSuccess(state.update);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    deleteRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.remove);
    },
    deleteSuccess(state, _action: PayloadAction<SuccessPayload<string>>) {
      setMutationSuccess(state.remove);
      invalidateEntries(state.lists);
    },
    deleteFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.remove, action);
    },
  },
});

export const unitsOfMeasureActions = unitsOfMeasureSlice.actions;
export default unitsOfMeasureSlice.reducer;
