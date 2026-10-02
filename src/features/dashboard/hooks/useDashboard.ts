import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import { dashboardActions } from "@/features/dashboard/store/dashboardSlice";
import type { DashboardSummary, OrderFlowOverview } from "@/types/dashboard";

export function useDashboardSummary() {
  return useEpicQuery<null, DashboardSummary>({
    arg: null,
    getKey: () => "summary",
    request: dashboardActions.fetchSummaryRequest,
    selectEntry: (state) => state.dashboard.summary,
  });
}

export function useOrderFlowOverview() {
  return useEpicQuery<null, OrderFlowOverview>({
    arg: null,
    getKey: () => "order-flow",
    request: dashboardActions.fetchOrderFlowRequest,
    selectEntry: (state) => state.dashboard.orderFlow,
  });
}
