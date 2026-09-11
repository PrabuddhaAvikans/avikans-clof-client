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
import type { ReprocessingListFilters } from "@/services/interfaces/reprocessingService";
import type {
  CompleteReprocessingInput,
  CreateReprocessingBatchInput,
  ReprocessingBatch,
} from "@/types/reprocessing";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<ReprocessingBatch>;
type ScrapLot = {
  id: string;
  sku: string;
  name: string;
  quantityAvailable: number;
  unit: string;
  costPrice: number;
};
type CompleteArg = { id: string; data: CompleteReprocessingInput };

export type ReprocessingState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<ReprocessingBatch>>;
  scrapLots: Record<string, AsyncEntry<ScrapLot[]>>;
  create: MutationEntry;
  start: MutationEntry;
  complete: MutationEntry;
  cancel: MutationEntry;
};

const initialState: ReprocessingState = {
  lists: emptyCache(),
  details: emptyCache(),
  scrapLots: emptyCache(),
  create: createMutationEntry(),
  start: createMutationEntry(),
  complete: createMutationEntry(),
  cancel: createMutationEntry(),
};

function upsertDetail(state: ReprocessingState, batch: ReprocessingBatch): void {
  state.details[batch.id] = {
    data: batch,
    status: "succeeded",
    error: null,
  };
}

const reprocessingSlice = createSlice({
  name: "reprocessing",
  initialState,
  reducers: {
    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<ReprocessingListFilters>>,
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
      action: PayloadAction<SuccessPayload<ReprocessingBatch>>,
    ) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    fetchScrapLotsRequest(state, action: PayloadAction<RequestPayload<null>>) {
      if (action.payload.key) setEntryLoading(state.scrapLots, action.payload.key);
    },
    fetchScrapLotsSuccess(state, action: PayloadAction<SuccessPayload<ScrapLot[]>>) {
      setEntrySuccess(state.scrapLots, action);
    },
    fetchScrapLotsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.scrapLots, action);
    },

    createRequest(
      state,
      _action: PayloadAction<RequestPayload<CreateReprocessingBatchInput>>,
    ) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<ReprocessingBatch>>) {
      setMutationSuccess(state.create);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
      invalidateEntries(state.scrapLots);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    startRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.start);
    },
    startSuccess(state, action: PayloadAction<SuccessPayload<ReprocessingBatch>>) {
      setMutationSuccess(state.start);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
      invalidateEntries(state.scrapLots);
    },
    startFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.start, action);
    },

    completeRequest(state, _action: PayloadAction<RequestPayload<CompleteArg>>) {
      setMutationLoading(state.complete);
    },
    completeSuccess(state, action: PayloadAction<SuccessPayload<ReprocessingBatch>>) {
      setMutationSuccess(state.complete);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
      invalidateEntries(state.scrapLots);
    },
    completeFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.complete, action);
    },

    cancelRequest(
      state,
      _action: PayloadAction<RequestPayload<{ id: string; reason?: string }>>,
    ) {
      setMutationLoading(state.cancel);
    },
    cancelSuccess(state, action: PayloadAction<SuccessPayload<ReprocessingBatch>>) {
      setMutationSuccess(state.cancel);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    cancelFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.cancel, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
      invalidateEntries(state.scrapLots);
    },
  },
});

export const reprocessingActions = reprocessingSlice.actions;
export default reprocessingSlice.reducer;
