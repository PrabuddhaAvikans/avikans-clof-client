import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import { createAsyncEntry } from "@/app/store/async/reducers";
import type { AsyncEntry } from "@/app/store/async/types";
import type { DashboardSummary, OrderFlowOverview } from "@/types/dashboard";

export type DashboardState = {
  summary: AsyncEntry<DashboardSummary>;
  orderFlow: AsyncEntry<OrderFlowOverview>;
};

const initialState: DashboardState = {
  summary: createAsyncEntry(),
  orderFlow: createAsyncEntry(),
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

    fetchOrderFlowRequest(state, _action: PayloadAction<RequestPayload<null>>) {
      state.orderFlow = {
        data: state.orderFlow.data,
        status: "loading",
        error: null,
      };
    },
    fetchOrderFlowSuccess(state, action: PayloadAction<SuccessPayload<OrderFlowOverview>>) {
      state.orderFlow = {
        data: action.payload.data,
        status: "succeeded",
        error: null,
      };
    },
    fetchOrderFlowFailure(state, action: PayloadAction<FailurePayload>) {
      state.orderFlow = {
        data: state.orderFlow.data,
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
      state.orderFlow = {
        data: state.orderFlow.data,
        status: "idle",
        error: null,
      };
    },
  },
});

export const dashboardActions = dashboardSlice.actions;
export default dashboardSlice.reducer;
