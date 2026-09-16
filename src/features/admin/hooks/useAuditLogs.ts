import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import { auditLogsActions } from "@/features/admin/store/auditLogsSlice";
import type { AuditLogListFilters } from "@/services";
import type { PaginatedResponse } from "@/types/common";
import type { AuditLogEntry, AuditLogSummary } from "@/types/audit";

export function useAuditLogs(filters: AuditLogListFilters) {
  return useEpicQuery<AuditLogListFilters, PaginatedResponse<AuditLogEntry>>({
    arg: filters,
    request: auditLogsActions.fetchListRequest,
    selectEntry: (state, key) => state.auditLogs.lists[key],
  });
}

export function useAuditLog(id: string) {
  return useEpicQuery<string, AuditLogEntry>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: auditLogsActions.fetchDetailRequest,
    selectEntry: (state, key) => state.auditLogs.details[key],
  });
}

export function useAuditLogSummary(
  filters: Omit<AuditLogListFilters, "page" | "pageSize">,
) {
  return useEpicQuery<Omit<AuditLogListFilters, "page" | "pageSize">, AuditLogSummary>({
    arg: filters,
    request: auditLogsActions.fetchSummaryRequest,
    selectEntry: (state, key) => state.auditLogs.summaries[key],
  });
}
