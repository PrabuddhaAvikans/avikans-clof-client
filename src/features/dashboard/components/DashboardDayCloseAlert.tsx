import { Link } from "react-router-dom";
import { AlertTriangle, Check, Clock3, Lock, X } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useCurrentDayClose,
  useCurrentMonthClose,
} from "@/features/end-of-day-management/hooks/useEndOfDayManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/format";
import { formatWorkedDuration } from "@/lib/employee-work";
import { cn } from "@/lib/utils";
import { PeriodStatus } from "@/types/end-of-day-management";

type DayCloseTone = "ready" | "warning" | "danger" | "closed";

/**
 * Day-End Closing card for the Order Flow empty slot.
 * Interior is checklist-style — not the same stats layout as process-stage cards.
 */
export function DashboardDayCloseAlert({ className }: { className?: string }) {
  const { hasPermission } = usePermissions();
  const canView = hasPermission("period_close:view");

  const dayQuery = useCurrentDayClose();
  const monthQuery = useCurrentMonthClose();

  if (!canView) return null;

  const day = dayQuery.data;
  const month = monthQuery.data;
  const isLoading = dayQuery.isLoading && !day;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[11.5rem] flex-col rounded-xl border-2 border-dashed border-foreground/20 bg-card p-3 sm:min-h-[12rem]",
          className,
        )}
        aria-busy
        aria-label="Loading Day-End Closing"
      >
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!day) return null;

  const period = day.period;
  const isOpenLike =
    period.status === PeriodStatus.open || period.status === PeriodStatus.reopened;
  const blockers = day.validations.filter((item) => item.isBlocking);
  const incompleteCount = day.incompleteEmployeeCount ?? 0;
  const staffTotal = day.employeeDaySummaries?.length ?? 0;
  const staffReady = Math.max(0, staffTotal - incompleteCount);
  const activeSessions = day.activeSessionCount ?? 0;
  const overtimeCount = day.overtimeEmployeeCount ?? 0;
  const overtimeMinutes = day.totalOvertimeMinutes ?? 0;
  const openDayCount = month?.openDayCount ?? 0;
  const requiredHours = Math.round((day.requiredDailyWorkMinutes ?? 480) / 60);

  const staffOk = incompleteCount === 0;
  const sessionsOk = activeSessions === 0;
  const blockersOk = blockers.length === 0;
  const overtimeNote = overtimeCount > 0;

  let tone: DayCloseTone = "ready";
  if (!isOpenLike) tone = "closed";
  else if (!blockersOk) tone = "danger";
  else if (!staffOk || !sessionsOk || overtimeNote) tone = "warning";

  const borderClass =
    tone === "danger"
      ? "border-destructive/50 hover:border-destructive/70"
      : tone === "warning"
        ? "border-warning/50 hover:border-warning/70"
        : tone === "ready"
          ? "border-success/50 hover:border-success/70"
          : "border-foreground/20 hover:border-foreground/40";

  const statusBadge =
    tone === "danger" ? (
      <StatusBadge variant="danger" size="sm" dot>
        Blocked
      </StatusBadge>
    ) : tone === "warning" ? (
      <StatusBadge variant="warning" size="sm" dot>
        Review
      </StatusBadge>
    ) : tone === "ready" ? (
      <StatusBadge variant="success" size="sm" dot>
        Ready
      </StatusBadge>
    ) : (
      <StatusBadge variant="neutral" size="sm" dot>
        Closed
      </StatusBadge>
    );

  const topIssue = !isOpenLike
    ? period.closedByName
      ? `Closed by ${period.closedByName}`
      : "This business day is closed"
    : blockers[0]?.message ??
      (incompleteCount > 0
        ? `${incompleteCount} employee${incompleteCount === 1 ? "" : "s"} still under ${requiredHours}h`
        : activeSessions > 0
          ? `${activeSessions} work session${activeSessions === 1 ? "" : "s"} still running`
          : overtimeNote
            ? `Overtime recorded for ${overtimeCount} employee${overtimeCount === 1 ? "" : "s"}`
            : "All checks clear — safe to close the day");

  const checklist = [
    {
      id: "staff",
      ok: staffOk,
      label: staffOk
        ? `Staff hours complete (${staffReady}/${staffTotal || 0})`
        : `Staff hours incomplete (${staffReady}/${staffTotal || 0})`,
    },
    {
      id: "sessions",
      ok: sessionsOk,
      label: sessionsOk
        ? "No active work sessions"
        : `${activeSessions} active session${activeSessions === 1 ? "" : "s"} open`,
    },
    {
      id: "blockers",
      ok: blockersOk,
      label: blockersOk
        ? "No closing blockers"
        : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} to clear`,
    },
    {
      id: "ot",
      ok: !overtimeNote,
      warn: overtimeNote,
      label: overtimeNote
        ? `Overtime ${formatWorkedDuration(overtimeMinutes)} · ${overtimeCount} staff`
        : "No overtime today",
    },
  ];

  const body = (
    <div
      className={cn(
        "group relative flex h-full min-h-[11.5rem] flex-col rounded-xl border-2 border-dashed bg-card p-3 transition-colors sm:min-h-[12rem]",
        borderClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                tone === "danger"
                  ? "bg-destructive/10 text-destructive"
                  : tone === "warning"
                    ? "bg-warning/10 text-warning"
                    : tone === "ready"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {tone === "closed" ? (
                <Lock className="h-3.5 w-3.5" aria-hidden />
              ) : tone === "danger" || tone === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Clock3 className="h-3.5 w-3.5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">
                Day-End Closing
              </h3>
              <p className="truncate text-[11px] text-muted-foreground">
                {formatDate(period.businessDate, "EEEE, MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
        {statusBadge}
      </div>

      <ul className="mt-3 space-y-1.5">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-[12px] leading-4">
            <span
              className={cn(
                "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full",
                item.ok
                  ? "bg-success/15 text-success"
                  : item.warn
                    ? "bg-warning/15 text-warning"
                    : "bg-destructive/15 text-destructive",
              )}
              aria-hidden
            >
              {item.ok ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : (
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              )}
            </span>
            <span
              className={cn(
                "min-w-0 truncate",
                item.ok ? "text-muted-foreground" : "font-medium text-foreground",
              )}
              title={item.label}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-1.5 border-t border-border pt-2.5">
        <p
          className={cn(
            "line-clamp-2 text-[11px] leading-4",
            tone === "danger"
              ? "text-destructive"
              : tone === "warning"
                ? "text-warning"
                : "text-muted-foreground",
          )}
          title={topIssue}
        >
          {topIssue}
        </p>
        {openDayCount > 0 && month ? (
          <p className="text-[10px] text-muted-foreground">
            Month still has {openDayCount} open day{openDayCount === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">Open to review and close</p>
        )}
      </div>
    </div>
  );

  return (
    <Link
      to={ROUTES.endOfDayManagement.day}
      className="block h-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Day-End Closing"
    >
      {body}
    </Link>
  );
}
