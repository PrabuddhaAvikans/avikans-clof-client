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
import type { ApplyCreditNoteInput, CreditNoteListFilters } from "@/services";
import type { CreditNote } from "@/types/credit-note";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<CreditNote>;
type ApplyArg = { id: string; data: ApplyCreditNoteInput };

export type CreditNotesState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<CreditNote>>;
  apply: MutationEntry;
};

const initialState: CreditNotesState = {
  lists: emptyCache(),
  details: emptyCache(),
  apply: createMutationEntry(),
};

function upsertDetail(state: CreditNotesState, creditNote: CreditNote): void {
  state.details[creditNote.id] = {
    data: creditNote,
    status: "succeeded",
    error: null,
  };
}

const creditNotesSlice = createSlice({
  name: "creditNotes",
  initialState,
  reducers: {
    fetchListRequest(
      state,
      action: PayloadAction<RequestPayload<CreditNoteListFilters>>,
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<CreditNote>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    applyRequest(state, _action: PayloadAction<RequestPayload<ApplyArg>>) {
      setMutationLoading(state.apply);
    },
    applySuccess(state, action: PayloadAction<SuccessPayload<CreditNote>>) {
      setMutationSuccess(state.apply);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    applyFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.apply, action);
    },
  },
});

export const creditNotesActions = creditNotesSlice.actions;
export default creditNotesSlice.reducer;
