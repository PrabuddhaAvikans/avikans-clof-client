import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ExternalLink, Factory, UserRound } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatWorkedDuration } from "@/lib/employee-work";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmployeeDayStatus, EmployeeWorkSessionStatus } from "@/types/employee-work";
import type {
  EmployeeDayWorkSummary,
  EmployeeWorkSession,
  EmployeeWorkSessionStatusValue,
} from "@/types/employee-work";

const SESSION_LABELS: Record<EmployeeWorkSessionStatusValue, string> = {
  started: "Started",
  working: "Working",
  paused: "Paused",
  on_hold: "On hold",
  completed: "Completed",
  stopped: "Stopped",
};

function sessionVariant(
  status: EmployeeWorkSessionStatusValue,
): "success" | "warning" | "info" | "neutral" {
  if (status === EmployeeWorkSessionStatus.completed) return "success";
  if (status === EmployeeWorkSessionStatus.working || status === EmployeeWorkSessionStatus.started) {
    return "info";
  }
  if (
    status === EmployeeWorkSessionStatus.paused ||
    status === EmployeeWorkSessionStatus.on_hold
  ) {
    return "warning";
  }
  return "neutral";
}

export function EmployeeDayClosePanel({
  summaries,
  requiredMinutes,
  className,
}: {
  summaries: EmployeeDayWorkSummary[];
  requiredMinutes: number;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    summaries.find((item) => item.dayStatus === EmployeeDayStatus.incomplete)?.employeeId ??
      summaries[0]?.employeeId ??
      null,
  );

  if (summaries.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border px-4 py-10 text-center",
          className,
        )}
      >
        <UserRound className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">No work sessions today</p>
        <Link
          to={ROUTES.manufacturing.jobs}
          className="mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
        >
          Open production jobs
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Required {formatWorkedDuration(requiredMinutes)} productive time · linked to production
          jobs (hours ≠ task progress)
        </p>
        <Link
          to={ROUTES.manufacturing.jobs}
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
        >
          <Factory className="h-3.5 w-3.5" aria-hidden />
          Manage jobs
        </Link>
      </div>

      <ul className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        {summaries.map((employee) => {
          const isComplete = employee.dayStatus === EmployeeDayStatus.completed;
          const isOpen = expandedId === employee.employeeId;
          const pct = Math.min(
            100,
            Math.round((employee.workedMinutes / Math.max(1, employee.requiredMinutes)) * 100),
          );
          const jobs = uniqueJobs(employee);

          return (
            <li key={employee.employeeId} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                onClick={() =>
                  setExpandedId(isOpen ? null : employee.employeeId)
                }
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{employee.employeeName}</span>
                    <StatusBadge variant={isComplete ? "success" : "warning"} size="sm" dot>
                      {isComplete ? "Completed" : "Incomplete"}
                    </StatusBadge>
                    {employee.overtimeMinutes > 0 && (
                      <StatusBadge variant="info" size="sm" dot>
                        OT {formatWorkedDuration(employee.overtimeMinutes)}
                      </StatusBadge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      Regular{" "}
                      <span className="font-medium text-foreground">
                        {formatWorkedDuration(employee.regularMinutes)}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      OT{" "}
                      <span className="font-medium text-foreground">
                        {formatWorkedDuration(employee.normalOvertimeMinutes)}
                      </span>
                    </span>
                    {employee.doubleOvertimeMinutes > 0 && (
                      <span className="tabular-nums">
                        DOT{" "}
                        <span className="font-medium text-foreground">
                          {formatWorkedDuration(employee.doubleOvertimeMinutes)}
                        </span>
                      </span>
                    )}
                    <span className="tabular-nums">
                      Remaining{" "}
                      <span className="font-medium text-foreground">
                        {isComplete
                          ? "—"
                          : formatWorkedDuration(employee.remainingMinutes)}
                      </span>
                    </span>
                    {jobs.length > 0 && (
                      <span>
                        {jobs.length} job{jobs.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isComplete ? "bg-emerald-500" : "bg-amber-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3">
                  <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-border bg-card px-3 py-2">
                      <dt className="text-muted-foreground">Regular</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatWorkedDuration(employee.regularMinutes)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2">
                      <dt className="text-muted-foreground">Overtime (1.5×)</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatWorkedDuration(employee.normalOvertimeMinutes)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2">
                      <dt className="text-muted-foreground">Double OT (2×)</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatWorkedDuration(employee.doubleOvertimeMinutes)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-card px-3 py-2">
                      <dt className="text-muted-foreground">Est. labour</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatCurrency(employee.laborCost)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {jobs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No production job linked on these sessions.
                      </span>
                    ) : (
                      jobs.map((job) => (
                        <Link
                          key={job.id}
                          to={ROUTES.manufacturing.jobDetail(job.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium shadow-xs hover:bg-muted"
                        >
                          {job.number}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-md border border-border bg-card">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Task / session</th>
                          <th className="px-3 py-2 font-medium">Job</th>
                          <th className="px-3 py-2 font-medium">Worked</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {employee.sessions.map((session) => (
                          <SessionRow key={session.id} session={session} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SessionRow({ session }: { session: EmployeeWorkSession }) {
  return (
    <tr>
      <td className="px-3 py-2 font-medium">{session.taskName ?? "Work session"}</td>
      <td className="px-3 py-2">
        {session.productionOrderId ? (
          <Link
            to={ROUTES.manufacturing.jobDetail(session.productionOrderId)}
            className="font-medium underline-offset-2 hover:underline"
          >
            {session.productionOrderNumber ?? session.productionOrderId}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2 tabular-nums">
        {formatWorkedDuration(session.workedMinutes)}
      </td>
      <td className="px-3 py-2">
        <StatusBadge variant={sessionVariant(session.status)} size="sm" dot>
          {SESSION_LABELS[session.status]}
        </StatusBadge>
      </td>
    </tr>
  );
}

function uniqueJobs(employee: EmployeeDayWorkSummary) {
  const map = new Map<string, { id: string; number: string }>();
  for (const session of employee.sessions) {
    if (!session.productionOrderId) continue;
    map.set(session.productionOrderId, {
      id: session.productionOrderId,
      number: session.productionOrderNumber ?? session.productionOrderId,
    });
  }
  for (const task of employee.taskBreakdown) {
    if (!task.productionOrderId) continue;
    map.set(task.productionOrderId, {
      id: task.productionOrderId,
      number: task.productionOrderNumber ?? task.productionOrderId,
    });
  }
  return [...map.values()];
}
