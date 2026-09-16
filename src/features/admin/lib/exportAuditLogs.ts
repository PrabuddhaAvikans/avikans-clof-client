import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/types/audit";
import { AUDIT_ACTION_LABELS, AUDIT_SEVERITY_LABELS } from "@/features/admin/lib/auditLabels";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function downloadAuditLogsCsv(logs: AuditLogEntry[]): void {
  const header = [
    "Timestamp",
    "User",
    "Action",
    "Entity",
    "Entity ID",
    "Record",
    "Details",
    "Severity",
    "IP Address",
  ];

  const rows = logs.map((log) =>
    [
      formatDateTime(log.timestamp),
      log.userName,
      AUDIT_ACTION_LABELS[log.action],
      log.entity,
      log.entityId,
      log.entityLabel ?? "",
      log.details,
      AUDIT_SEVERITY_LABELS[log.severity],
      log.ipAddress ?? "",
    ].map(csvCell).join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `audit-logs-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
