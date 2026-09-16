import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { auditLogsActions } from "@/features/admin/store/auditLogsSlice";
import { auditService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: auditLogsActions.fetchListRequest,
  success: auditLogsActions.fetchListSuccess,
  failure: auditLogsActions.fetchListFailure,
  handler: (filters) => auditService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: auditLogsActions.fetchDetailRequest,
  success: auditLogsActions.fetchDetailSuccess,
  failure: auditLogsActions.fetchDetailFailure,
  handler: (id) => auditService.getById(id),
});

const fetchSummaryEpic = createAsyncEpic({
  request: auditLogsActions.fetchSummaryRequest,
  success: auditLogsActions.fetchSummarySuccess,
  failure: auditLogsActions.fetchSummaryFailure,
  handler: (filters) => auditService.summary(filters),
});

export const auditLogsEpic = combineEpics(fetchListEpic, fetchDetailEpic, fetchSummaryEpic);
