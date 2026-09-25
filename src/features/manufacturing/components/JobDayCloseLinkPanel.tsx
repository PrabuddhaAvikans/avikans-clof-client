import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock3, ExternalLink } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCurrentDayClose } from "@/features/period-close/hooks/usePeriodClose";
import { formatWorkedDuration } from "@/lib/employee-work";
import { ensureTaskUnits, workerProgressFromUnits } from "@/lib/taskUnits";
import { cn } from "@/lib/utils";
import { EmployeeDayStatus } from "@/types/employee-work";
import type { ManufacturingJob } from "@/types/manufacturing";

/**
 * Links this production job to Employee Day Close hours.
 * Job progress % and daily worked hours are separate concepts.
 */
export function JobDayCloseLinkPanel({
  job,
  className,
}: {
  job: ManufacturingJob;
  className?: string;
}) {
  const { data: dayClose } = useCurrentDayClose();

  const workerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of job.tasks) {
      const workers = workerProgressFromUnits(ensureTaskUnits(task));
      for (const worker of workers) ids.add(worker.userId);
      if (task.operatorId) ids.add(task.operatorId);
      if (task.assignedTo) ids.add(task.assignedTo);
    }
    return ids;
  }, [job.tasks]);

  const rows = useMemo(() => {
    const summaries = dayClose?.employeeDaySummaries ?? [];
    return summaries
      .filter((summary) => {
        if (workerIds.has(summary.employeeId)) return true;
        return summary.sessions.some((session) => session.productionOrderId === job.id);
      })
      .map((summary) => {
        const jobSessions = summary.sessions.filter(
          (session) => session.productionOrderId === job.id,
        );
        const jobMinutes = jobSessions.reduce((sum, session) => sum + session.workedMinutes, 0);
        return { summary, jobSessions, jobMinutes };
      });
  }, [dayClose?.employeeDaySummaries, job.id, workerIds]);

  const businessDate = dayClose?.period.businessDate;
  const requiredMinutes = dayClose?.requiredDailyWorkMinutes ?? 480;

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold">Employee day hours</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Worked time for Day Close ({formatWorkedDuration(requiredMinutes)} required). Separate
            from task progress — closing this job does not close the employee day.
            {businessDate ? ` · ${businessDate}` : ""}
          </p>
        </div>
        <Link
          to={ROUTES.periodClose.day}
          className="inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline"
        >
          Open Day Close
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No day-close sessions for workers on this job yet. Start or resume a task to record
          productive time.
        </p>
      ) : (
        <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {rows.map(({ summary, jobMinutes }) => {
            const isComplete = summary.dayStatus === EmployeeDayStatus.completed;
            const pct = Math.min(
              100,
              Math.round(
                (summary.workedMinutes / Math.max(1, summary.requiredMinutes)) * 100,
              ),
            );
            return (
              <li
                key={summary.employeeId}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{summary.employeeName}</p>
                    <StatusBadge variant={isComplete ? "success" : "warning"} size="sm" dot>
                      {isComplete ? "Day done" : "Day open"}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 max-w-[8rem] flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isComplete ? "bg-emerald-500" : "bg-amber-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      Job {formatWorkedDuration(jobMinutes)} · Today{" "}
                      {formatWorkedDuration(summary.workedMinutes)}/
                      {formatWorkedDuration(summary.requiredMinutes)}
                      {summary.overtimeMinutes > 0
                        ? ` · OT ${formatWorkedDuration(summary.overtimeMinutes)}`
                        : ""}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
