import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { reportsActions } from "@/features/reports/store/reportsSlice";
import { reportService } from "@/services";
import type { ReportDataset, ReportId } from "@/types/report";

const fetchReportEpic = createAsyncEpic<ReportId, ReportDataset>({
  request: reportsActions.fetchReportRequest,
  success: reportsActions.fetchReportSuccess,
  failure: reportsActions.fetchReportFailure,
  handler: (reportId) => reportService.getReport(reportId),
});

export const reportsEpic = combineEpics(fetchReportEpic);
