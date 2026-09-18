import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import { emptyCache, setEntryFailure, setEntryLoading, setEntrySuccess } from "@/app/store/async/reducers";
import type { AsyncEntry } from "@/app/store/async/types";
import type { ReportDataset, ReportId } from "@/types/report";

export type ReportsState = {
  datasets: Record<string, AsyncEntry<ReportDataset>>;
};

const initialState: ReportsState = {
  datasets: emptyCache(),
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    fetchReportRequest(state, action: PayloadAction<RequestPayload<ReportId>>) {
      const key = action.payload.key;
      if (key) setEntryLoading(state.datasets, key);
    },
    fetchReportSuccess(state, action: PayloadAction<SuccessPayload<ReportDataset>>) {
      setEntrySuccess(state.datasets, action);
    },
    fetchReportFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.datasets, action);
    },
  },
});

export const reportsActions = reportsSlice.actions;
export default reportsSlice.reducer;
