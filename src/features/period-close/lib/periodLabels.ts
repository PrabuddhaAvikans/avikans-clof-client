import type { StatusBadgeVariant } from "@/components/ui/StatusBadge";
import {
  PeriodStatus,
  PeriodStatusLabels,
  WorkerSessionCloseRule,
  type PeriodAuditAction,
  type PeriodStatusValue,
  type WorkerSessionCloseRuleValue,
} from "@/types/period-close";

export function periodStatusLabel(status: PeriodStatusValue): string {
  return PeriodStatusLabels[status] ?? status;
}

export function periodStatusVariant(status: PeriodStatusValue): StatusBadgeVariant {
  switch (status) {
    case PeriodStatus.open:
      return "info";
    case PeriodStatus.closing:
      return "warning";
    case PeriodStatus.closed:
      return "success";
    case PeriodStatus.reopened:
      return "teal";
    default:
      return "neutral";
  }
}

export const PERIOD_AUDIT_ACTION_LABELS: Record<PeriodAuditAction, string> = {
  opened: "Opened",
  validation_run: "Validation run",
  closing_started: "Closing started",
  snapshots_generated: "Snapshots generated",
  sessions_checkpointed: "Sessions checkpointed",
  closed: "Closed",
  reopened: "Reopened",
  next_period_opened: "Next period opened",
  adjustment_posted: "Adjustment posted",
};

export const WORKER_SESSION_RULE_LABELS: Record<WorkerSessionCloseRuleValue, string> = {
  [WorkerSessionCloseRule.pause_and_checkpoint]:
    "Pause active sessions and create a Day Close checkpoint",
  [WorkerSessionCloseRule.allow_cross_date]: "Allow sessions to continue across dates",
  [WorkerSessionCloseRule.require_supervisor_confirm]:
    "Require supervisor confirmation before closing",
};

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
