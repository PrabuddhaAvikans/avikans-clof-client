import type { AuditLogEntry, AuditLogSummary, AuditAction, AuditEntity, AuditSeverity } from "@/types/audit";
import { asRecord } from "@/services/mappers/common";

export function mapEntry(raw: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(raw.id),
    timestamp: String(raw.timestamp),
    userId: String(raw.userId),
    userName: String(raw.userName),
    action: raw.action as AuditAction,
    entity: raw.entity as AuditEntity,
    entityId: String(raw.entityId),
    entityLabel: raw.entityLabel as string | undefined,
    details: String(raw.details ?? ""),
    severity: (raw.severity as AuditSeverity) ?? "info",
    ipAddress: raw.ipAddress as string | undefined,
    userAgent: raw.userAgent as string | undefined,
    changes: (raw.changes as AuditLogEntry["changes"]) ?? undefined,
  };
}

export function mapAuditSummary(raw: unknown): AuditLogSummary {
  const data = asRecord(raw);
  return {
    total: Number(data.total ?? 0),
    info: Number(data.info ?? 0),
    warning: Number(data.warning ?? 0),
    critical: Number(data.critical ?? 0),
    today: Number(data.today ?? 0),
  };
}
