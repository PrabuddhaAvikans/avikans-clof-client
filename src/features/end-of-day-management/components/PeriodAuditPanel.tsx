import { ActivityLog } from "@/components/ui/ActivityLog";
import { PERIOD_AUDIT_ACTION_LABELS } from "@/features/end-of-day-management/lib/periodLabels";
import { formatDateTime } from "@/lib/format";
import type { PeriodAuditLog } from "@/types/end-of-day-management";

export function PeriodAuditPanel({ entries }: { entries: PeriodAuditLog[] }) {
  return (
    <ActivityLog
      emptyMessage="No period audit events yet."
      entries={entries.map((entry) => ({
        id: entry.id,
        user: entry.userName,
        action: PERIOD_AUDIT_ACTION_LABELS[entry.action] ?? entry.action,
        timestamp: formatDateTime(entry.performedAt),
        comment: entry.reason,
      }))}
    />
  );
}
