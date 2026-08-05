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
import type { CostingListFilters } from "@/services";
import type { CostingRequest } from "@/types/costing";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<CostingRequest>;

type CommentArg = { id: string; comment: string };
type ApproveArg = { id: string; comment?: string };
type NotesArg = { id: string; notes: string };

export type CostingState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<CostingRequest>>;
  approve: MutationEntry;
  reject: MutationEntry;
  requestChanges: MutationEntry;
  updateNotes: MutationEntry;
  addComment: MutationEntry;
};

const initialState: CostingState = {
  lists: emptyCache(),
  details: emptyCache(),
  approve: createMutationEntry(),
  reject: createMutationEntry(),
  requestChanges: createMutationEntry(),
  updateNotes: createMutationEntry(),
  addComment: createMutationEntry(),
};

function upsertDetail(state: CostingState, request: CostingRequest): void {
  state.details[request.id] = {
    data: request,
    status: "succeeded",
    error: null,
  };
}

const costingSlice = createSlice({
  name: "costing",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<CostingListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    approveRequest(state, _action: PayloadAction<RequestPayload<ApproveArg>>) {
      setMutationLoading(state.approve);
    },
    approveSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setMutationSuccess(state.approve);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    approveFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.approve, action);
    },

    rejectRequest(state, _action: PayloadAction<RequestPayload<CommentArg>>) {
      setMutationLoading(state.reject);
    },
    rejectSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setMutationSuccess(state.reject);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    rejectFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reject, action);
    },

    requestChangesRequest(state, _action: PayloadAction<RequestPayload<CommentArg>>) {
      setMutationLoading(state.requestChanges);
    },
    requestChangesSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setMutationSuccess(state.requestChanges);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    requestChangesFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.requestChanges, action);
    },

    updateNotesRequest(state, _action: PayloadAction<RequestPayload<NotesArg>>) {
      setMutationLoading(state.updateNotes);
    },
    updateNotesSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setMutationSuccess(state.updateNotes);
      upsertDetail(state, action.payload.data);
    },
    updateNotesFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.updateNotes, action);
    },

    addCommentRequest(state, _action: PayloadAction<RequestPayload<CommentArg>>) {
      setMutationLoading(state.addComment);
    },
    addCommentSuccess(state, action: PayloadAction<SuccessPayload<CostingRequest>>) {
      setMutationSuccess(state.addComment);
      upsertDetail(state, action.payload.data);
    },
    addCommentFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.addComment, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const costingActions = costingSlice.actions;
export default costingSlice.reducer;
