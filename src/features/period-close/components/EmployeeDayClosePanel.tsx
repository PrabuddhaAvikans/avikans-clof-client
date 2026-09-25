import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Factory,
  Search,
  UserRound,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

const PAGE_SIZE = 25;

type StatusFilter = "incomplete" | "complete" | "all";

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
  const incompleteCount = summaries.filter(
    (item) => item.dayStatus === EmployeeDayStatus.incomplete,
  ).length;
  const completeCount = summaries.length - incompleteCount;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    incompleteCount > 0 ? "incomplete" : "all",
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return summaries.filter((employee) => {
      if (statusFilter === "incomplete" && employee.dayStatus !== EmployeeDayStatus.incomplete) {
        return false;
      }
      if (statusFilter === "complete" && employee.dayStatus !== EmployeeDayStatus.completed) {
        return false;
      }
      if (!needle) return true;
      if (employee.employeeName.toLowerCase().includes(needle)) return true;
      return employee.sessions.some(
        (session) =>
          session.productionOrderNumber?.toLowerCase().includes(needle) ||
          session.taskName?.toLowerCase().includes(needle),
      );
    });
  }, [summaries, query, statusFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

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
          Required {formatWorkedDuration(requiredMinutes)} · hours ≠ task progress
        </p>
        <Link
          to={ROUTES.manufacturing.jobs}
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"
        >
          <Factory className="h-3.5 w-3.5" aria-hidden />
          Manage jobs
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={statusFilter === "incomplete"}
          onClick={() => {
            setStatusFilter("incomplete");
            setVisibleCount(PAGE_SIZE);
            setExpandedId(null);
          }}
          label="Incomplete"
          count={incompleteCount}
          tone="warning"
        />
        <FilterChip
          active={statusFilter === "complete"}
          onClick={() => {
            setStatusFilter("complete");
            setVisibleCount(PAGE_SIZE);
            setExpandedId(null);
          }}
          label="Complete"
          count={completeCount}
          tone="success"
        />
        <FilterChip
          active={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            setVisibleCount(PAGE_SIZE);
            setExpandedId(null);
          }}
          label="All"
          count={summaries.length}
          tone="neutral"
        />
        <div className="ml-auto w-full min-w-[12rem] sm:w-56">
          <Input
            size="sm"
            value={query}
            placeholder="Search name or job…"
            leftAddon={<Search className="h-3.5 w-3.5" aria-hidden />}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
              setExpandedId(null);
            }}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Showing {visible.length} of {filtered.length}
        {filtered.length !== summaries.length ? ` (filtered from ${summaries.length})` : ""}
        · expand one employee to check allocations
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No employees match this filter.
        </div>
      ) : (
        <ul className="max-h-[28rem] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card shadow-xs">
          {visible.map((employee) => {
            const isComplete = employee.dayStatus === EmployeeDayStatus.completed;
            const isOpen = expandedId === employee.employeeId;
            const pct = Math.min(
              100,
              Math.round(
                (employee.workedMinutes / Math.max(1, employee.requiredMinutes)) * 100,
              ),
            );
            const jobs = uniqueJobs(employee);

            return (
              <li key={employee.employeeId} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
                  onClick={() => setExpandedId(isOpen ? null : employee.employeeId)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{employee.employeeName}</span>
                      <StatusBadge variant={isComplete ? "success" : "warning"} size="sm" dot>
                        {isComplete ? "Done" : "Open"}
                      </StatusBadge>
                      {employee.overtimeMinutes > 0 && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          OT {formatWorkedDuration(employee.overtimeMinutes)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isComplete ? "bg-emerald-500" : "bg-amber-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatWorkedDuration(employee.workedMinutes)}/
                        {formatWorkedDuration(employee.requiredMinutes)}
                        {jobs.length > 0 ? ` · ${jobs.length} job${jobs.length === 1 ? "" : "s"}` : ""}
                      </span>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-border bg-muted/15 px-3 py-2.5">
                    <dl className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
                      <Metric label="Regular" value={formatWorkedDuration(employee.regularMinutes)} />
                      <Metric
                        label="OT 1.5×"
                        value={formatWorkedDuration(employee.normalOvertimeMinutes)}
                      />
                      <Metric
                        label="DOT 2×"
                        value={formatWorkedDuration(employee.doubleOvertimeMinutes)}
                      />
                      <Metric label="Labour" value={formatCurrency(employee.laborCost)} />
                    </dl>

                    {jobs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {jobs.map((job) => (
                          <Link
                            key={job.id}
                            to={ROUTES.manufacturing.jobDetail(job.id)}
                            className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
                          >
                            {job.number}
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="overflow-x-auto rounded border border-border bg-card">
                      <table className="min-w-full text-left text-[11px]">
                        <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-2.5 py-1.5 font-medium">Task</th>
                            <th className="px-2.5 py-1.5 font-medium">Job</th>
                            <th className="px-2.5 py-1.5 font-medium">Worked</th>
                            <th className="px-2.5 py-1.5 font-medium">Status</th>
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
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Show more ({filtered.length - visibleCount} left)
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: "warning" | "success" | "neutral";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? tone === "warning"
            ? "border-amber-500/40 bg-amber-500/10 text-foreground"
            : tone === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
              : "border-foreground/20 bg-muted text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted/40",
      )}
    >
      {label}
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function SessionRow({ session }: { session: EmployeeWorkSession }) {
  return (
    <tr>
      <td className="px-2.5 py-1.5 font-medium">{session.taskName ?? "Work session"}</td>
      <td className="px-2.5 py-1.5">
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
      <td className="px-2.5 py-1.5 tabular-nums">
        {formatWorkedDuration(session.workedMinutes)}
      </td>
      <td className="px-2.5 py-1.5">
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
