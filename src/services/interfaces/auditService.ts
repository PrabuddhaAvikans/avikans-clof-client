import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  AuditAction,
  AuditEntity,
  AuditLogEntry,
  AuditLogSummary,
  AuditSeverity,
} from "@/types/audit";

export interface AuditLogListFilters extends PaginatedRequest {
  entity?: AuditEntity;
  action?: AuditAction;
  severity?: AuditSeverity;
  userId?: string;
  from?: string;
  to?: string;
}

export interface AuditService {
  list(filters: AuditLogListFilters): Promise<PaginatedResponse<AuditLogEntry>>;
  getById(id: string): Promise<AuditLogEntry>;
  summary(filters?: Omit<AuditLogListFilters, "page" | "pageSize">): Promise<AuditLogSummary>;
}
