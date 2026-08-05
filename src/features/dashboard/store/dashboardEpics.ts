import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { dashboardActions } from "@/features/dashboard/store/dashboardSlice";
import { dashboardService } from "@/services";

const fetchSummaryEpic = createAsyncEpic({
  request: dashboardActions.fetchSummaryRequest,
  success: dashboardActions.fetchSummarySuccess,
  failure: dashboardActions.fetchSummaryFailure,
  handler: () => dashboardService.getSummary(),
});

export const dashboardEpic = combineEpics(fetchSummaryEpic);
