import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  emptyCache,
  invalidateEntries,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry } from "@/app/store/async/types";
import type { InvoiceListFilters } from "@/services";
import type { Invoice } from "@/types/invoice";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Invoice>;

export type InvoicesState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Invoice>>;
};

const initialState: InvoicesState = {
  lists: emptyCache(),
  details: emptyCache(),
};

const invoicesSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<InvoiceListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Invoice>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    invalidateLists(state) {
      invalidateEntries(state.lists);
    },
  },
});

export const invoicesActions = invoicesSlice.actions;
export default invoicesSlice.reducer;
