import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { auditLogsActions as actions } from "@/features/admin/store/auditLogsSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapAuditSummary, mapEntry } from "@/services/mappers/auditMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/audit-logs${buildQuery(filters)}`),
      mapEntry,
    ),
});

const fetchDetailEpic = createApiEpic({
  request: actions.fetchDetailRequest,
  success: actions.fetchDetailSuccess,
  failure: actions.fetchDetailFailure,
  execute: async (id) => mapEntry(asRecord(await http.get(`/api/audit-logs/${id}`))),
});

const fetchSummaryEpic = createApiEpic({
  request: actions.fetchSummaryRequest,
  success: actions.fetchSummarySuccess,
  failure: actions.fetchSummaryFailure,
  execute: async (filters) =>
    mapAuditSummary(
      await http.get(
        `/api/audit-logs/summary${buildQuery((filters ?? {}))}`,
      ),
    ),
});

export const auditLogsEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  fetchSummaryEpic,
);
