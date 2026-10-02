import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { reportsActions as actions } from "@/features/reports/store/reportsSlice";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapDataset } from "@/services/mappers/reportMappers";

const fetchReportEpic = createApiEpic({
  request: actions.fetchReportRequest,
  success: actions.fetchReportSuccess,
  failure: actions.fetchReportFailure,
  execute: async (reportId) =>
    mapDataset(asRecord(await http.get(`/api/reports/${reportId}`))),
});

export const reportsEpic = combineEpics(fetchReportEpic);
