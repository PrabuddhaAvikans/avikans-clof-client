import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import { reportsActions } from "@/features/reports/store/reportsSlice";
import type { ReportDataset, ReportId } from "@/types/report";

export function useReport(reportId: ReportId, enabled = true) {
  return useEpicQuery<ReportId, ReportDataset>({
    arg: reportId,
    enabled,
    getKey: (id) => id,
    request: reportsActions.fetchReportRequest,
    selectEntry: (state, key) => state.reports.datasets[key],
  });
}
