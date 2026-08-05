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
import type { ProductionTrackingFilters } from "@/services";
import type {
  ProductionJob,
  ProductionTrackingSnapshot,
} from "@/types/production-tracking";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<ProductionJob>;
type UpdateStageArg = { id: string; comment?: string };
type HoldArg = { id: string; reason?: string };

export type ProductionTrackingState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<ProductionJob>>;
  snapshot: Record<string, AsyncEntry<ProductionTrackingSnapshot>>;
  start: MutationEntry;
  updateStage: MutationEntry;
  hold: MutationEntry;
  releaseToQc: MutationEntry;
};

const initialState: ProductionTrackingState = {
  lists: emptyCache(),
  details: emptyCache(),
  snapshot: emptyCache(),
  start: createMutationEntry(),
  updateStage: createMutationEntry(),
  hold: createMutationEntry(),
  releaseToQc: createMutationEntry(),
};

function upsertDetail(
  state: ProductionTrackingState,
  job: ProductionJob,
): void {
  state.details[job.id] = {
    data: job,
    status: "succeeded",
    error: null,
  };
}

function invalidateAllCaches(state: ProductionTrackingState): void {
  invalidateEntries(state.lists);
  invalidateEntries(state.details);
  invalidateEntries(state.snapshot);
}

const productionTrackingSlice = createSlice({
  name: "productionTracking",
  initialState,
  reducers: {
    fetchSnapshotRequest(state, action: PayloadAction<RequestPayload<null>>) {
      if (action.payload.key) setEntryLoading(state.snapshot, action.payload.key);
    },
    fetchSnapshotSuccess(
      state,
      action: PayloadAction<SuccessPayload<ProductionTrackingSnapshot>>,
    ) {
      setEntrySuccess(state.snapshot, action);
    },
    fetchSnapshotFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.snapshot, action);
    },

    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<ProductionTrackingFilters>>,
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<ProductionJob>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    startRequest(state, _action: PayloadAction<RequestPayload<string[]>>) {
      setMutationLoading(state.start);
    },
    startSuccess(state, _action: PayloadAction<SuccessPayload<void>>) {
      setMutationSuccess(state.start);
      invalidateAllCaches(state);
    },
    startFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.start, action);
    },

    updateStageRequest(state, _action: PayloadAction<RequestPayload<UpdateStageArg>>) {
      setMutationLoading(state.updateStage);
    },
    updateStageSuccess(state, action: PayloadAction<SuccessPayload<ProductionJob>>) {
      setMutationSuccess(state.updateStage);
      upsertDetail(state, action.payload.data);
      invalidateAllCaches(state);
    },
    updateStageFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.updateStage, action);
    },

    holdRequest(state, _action: PayloadAction<RequestPayload<HoldArg>>) {
      setMutationLoading(state.hold);
    },
    holdSuccess(state, action: PayloadAction<SuccessPayload<ProductionJob>>) {
      setMutationSuccess(state.hold);
      upsertDetail(state, action.payload.data);
      invalidateAllCaches(state);
    },
    holdFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.hold, action);
    },

    releaseToQcRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.releaseToQc);
    },
    releaseToQcSuccess(state, action: PayloadAction<SuccessPayload<ProductionJob>>) {
      setMutationSuccess(state.releaseToQc);
      upsertDetail(state, action.payload.data);
      invalidateAllCaches(state);
    },
    releaseToQcFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.releaseToQc, action);
    },

    invalidateAll(state) {
      invalidateAllCaches(state);
    },
  },
});

export const productionTrackingActions = productionTrackingSlice.actions;
export default productionTrackingSlice.reducer;
