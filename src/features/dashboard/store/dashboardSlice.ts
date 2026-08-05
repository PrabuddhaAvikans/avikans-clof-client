import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import { createAsyncEntry } from "@/app/store/async/reducers";
import type { AsyncEntry } from "@/app/store/async/types";
import type { DashboardSummary } from "@/types/dashboard";

export type DashboardState = {
  summary: AsyncEntry<DashboardSummary>;
};

const initialState: DashboardState = {
  summary: createAsyncEntry(),
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    fetchSummaryRequest(state, _action: PayloadAction<RequestPayload<null>>) {
      state.summary = {
        data: state.summary.data,
        status: "loading",
        error: null,
      };
    },
    fetchSummarySuccess(state, action: PayloadAction<SuccessPayload<DashboardSummary>>) {
      state.summary = {
        data: action.payload.data,
        status: "succeeded",
        error: null,
      };
    },
    fetchSummaryFailure(state, action: PayloadAction<FailurePayload>) {
      state.summary = {
        data: state.summary.data,
        status: "failed",
        error: action.payload.error,
      };
    },

    invalidateAll(state) {
      state.summary = {
        data: state.summary.data,
        status: "idle",
        error: null,
      };
    },
  },
});

export const dashboardActions = dashboardSlice.actions;
export default dashboardSlice.reducer;
