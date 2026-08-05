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
import type {
  ManufacturingJobFormData,
  ManufacturingListFilters,
} from "@/services";
import type { ManufacturingJob } from "@/types/manufacturing";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<ManufacturingJob>;
type UpdateArg = { id: string; data: Partial<ManufacturingJobFormData> };

export type ManufacturingState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<ManufacturingJob>>;
  create: MutationEntry;
  update: MutationEntry;
  reserveMaterials: MutationEntry;
  start: MutationEntry;
  complete: MutationEntry;
};

const initialState: ManufacturingState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  reserveMaterials: createMutationEntry(),
  start: createMutationEntry(),
  complete: createMutationEntry(),
};

function upsertDetail(state: ManufacturingState, job: ManufacturingJob): void {
  state.details[job.id] = {
    data: job,
    status: "succeeded",
    error: null,
  };
}

const manufacturingSlice = createSlice({
  name: "manufacturing",
  initialState,
  reducers: {
    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<ManufacturingListFilters>>,
    ) {
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
    fetchDetailSuccess(
      state,
      action: PayloadAction<SuccessPayload<ManufacturingJob>>,
    ) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(
      state,
      _action: PayloadAction<RequestPayload<ManufacturingJobFormData>>,
    ) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<ManufacturingJob>>) {
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
    updateSuccess(state, action: PayloadAction<SuccessPayload<ManufacturingJob>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    reserveMaterialsRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.reserveMaterials);
    },
    reserveMaterialsSuccess(
      state,
      action: PayloadAction<SuccessPayload<ManufacturingJob>>,
    ) {
      setMutationSuccess(state.reserveMaterials);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    reserveMaterialsFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reserveMaterials, action);
    },

    startRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.start);
    },
    startSuccess(state, action: PayloadAction<SuccessPayload<ManufacturingJob>>) {
      setMutationSuccess(state.start);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    startFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.start, action);
    },

    completeRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.complete);
    },
    completeSuccess(state, action: PayloadAction<SuccessPayload<ManufacturingJob>>) {
      setMutationSuccess(state.complete);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    completeFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.complete, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const manufacturingActions = manufacturingSlice.actions;
export default manufacturingSlice.reducer;
