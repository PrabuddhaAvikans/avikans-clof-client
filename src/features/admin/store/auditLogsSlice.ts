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
import type { AuditLogListFilters } from "@/services";
import type { PaginatedResponse } from "@/types/common";
import type { AuditLogEntry, AuditLogSummary } from "@/types/audit";

type ListData = PaginatedResponse<AuditLogEntry>;
type SummaryFilters = Omit<AuditLogListFilters, "page" | "pageSize">;

export type AuditLogsState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<AuditLogEntry>>;
  summaries: Record<string, AsyncEntry<AuditLogSummary>>;
};

const initialState: AuditLogsState = {
  lists: emptyCache(),
  details: emptyCache(),
  summaries: emptyCache(),
};

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<AuditLogListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<AuditLogEntry>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    fetchSummaryRequest(state, action: PayloadAction<RequestPayload<SummaryFilters>>) {
      if (action.payload.key) setEntryLoading(state.summaries, action.payload.key);
    },
    fetchSummarySuccess(state, action: PayloadAction<SuccessPayload<AuditLogSummary>>) {
      setEntrySuccess(state.summaries, action);
    },
    fetchSummaryFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.summaries, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
      invalidateEntries(state.summaries);
    },
  },
});

export const auditLogsActions = auditLogsSlice.actions;
export default auditLogsSlice.reducer;
