import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { dashboardActions as actions } from "@/features/dashboard/store/dashboardSlice";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapOrderFlow, mapSummary } from "@/services/mappers/dashboardMappers";

const fetchSummaryEpic = createApiEpic({
  request: actions.fetchSummaryRequest,
  success: actions.fetchSummarySuccess,
  failure: actions.fetchSummaryFailure,
  execute: async () => mapSummary(asRecord(await http.get("/api/dashboard/summary"))),
});

const fetchOrderFlowEpic = createApiEpic({
  request: actions.fetchOrderFlowRequest,
  success: actions.fetchOrderFlowSuccess,
  failure: actions.fetchOrderFlowFailure,
  execute: async () => mapOrderFlow(asRecord(await http.get("/api/dashboard/order-flow"))),
});

export const dashboardEpic = combineEpics(fetchSummaryEpic, fetchOrderFlowEpic);
