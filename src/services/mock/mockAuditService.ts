import { delay, notFoundError } from "@/services/http";
import type { AuditLogListFilters, AuditService } from "@/services/interfaces/auditService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialAuditLogs } from "@/services/mock/data/audit-logs";
import type { AuditLogEntry } from "@/types/audit";

let logs = cloneData(initialAuditLogs);

function dayStart(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function dayEnd(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

function matchesFilters(
  log: AuditLogEntry,
  filters: Omit<AuditLogListFilters, "page" | "pageSize" | "search" | "sortBy" | "sortDirection"> & {
    search?: string;
  },
): boolean {
  if (filters.entity && log.entity !== filters.entity) return false;
  if (filters.action && log.action !== filters.action) return false;
  if (filters.severity && log.severity !== filters.severity) return false;
  if (filters.userId && log.userId !== filters.userId) return false;

  const timestamp = new Date(log.timestamp).getTime();
  if (filters.from && timestamp < dayStart(filters.from)) return false;
  if (filters.to && timestamp > dayEnd(filters.to)) return false;

  return true;
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export const mockAuditService: AuditService = {
  async list(filters) {
    await delay();
    const result = applyListQuery(
      logs,
      { ...filters, sortBy: filters.sortBy ?? "timestamp", sortDirection: filters.sortDirection ?? "desc" },
      ["userName", "details", "entityId", "entityLabel", "entity"],
      (log) => matchesFilters(log, filters),
    );
    return result;
  },

  async getById(id) {
    await delay();
    const log = logs.find((entry) => entry.id === id);
    if (!log) {
      notFoundError("Audit log", id);
    }
    return structuredClone(log);
  },

  async summary(filters = {}) {
    await delay();
    const filtered = logs.filter((log) => {
      if (!matchesFilters(log, filters)) return false;
      if (!filters.search) return true;
      const query = filters.search.toLowerCase();
      return (
        log.userName.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        (log.entityLabel ?? "").toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query)
      );
    });

    const today = todayKey();
    return {
      total: filtered.length,
      info: filtered.filter((log) => log.severity === "info").length,
      warning: filtered.filter((log) => log.severity === "warning").length,
      critical: filtered.filter((log) => log.severity === "critical").length,
      today: filtered.filter((log) => log.timestamp.slice(0, 10) === today).length,
    };
  },
};
