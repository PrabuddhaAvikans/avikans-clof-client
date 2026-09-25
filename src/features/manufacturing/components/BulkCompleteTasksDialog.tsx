import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import type { UserOption } from "@/features/manufacturing/components/TaskContributorsEditor";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import {
  eligibleBulkCompleteTasks,
  incompleteBulkPrerequisites,
  isBulkCompleteSelectable,
  remainingEstimatedHours,
  remainingQuantity,
  taskQuantityProgressPercent,
} from "@/lib/manufacturingTasks";
import { allocateByShares, CONTRIBUTION_TOTAL, resolveTaskContributors } from "@/lib/taskContributors";
import { cn } from "@/lib/utils";
import { previewActiveWork } from "@/services/mock/guardedTaskAction";
import type { ActiveWorkConflict } from "@/types/employee-work";
import type { ManufacturingJob, TaskContributorInput } from "@/types/manufacturing";
import { ManufacturingTaskStatus } from "@/types/status";

export type BulkCompleteTaskLabor = {
  taskId: string;
  completedQuantity?: number;
  actualHours?: number;
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  contributors?: TaskContributorInput[];
  notes?: string;
};

export type BulkCompleteTasksSubmit = {
  tasks: BulkCompleteTaskLabor[];
  notes?: string;
};

type WorkerDraft = {
  userId: string;
  qty: string;
  hours: string;
  ot: string;
  dot: string;
};

type TaskDraft = {
  workers: WorkerDraft[];
};

type Props = {
  job: ManufacturingJob | null;
  open: boolean;
  users: UserOption[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: BulkCompleteTasksSubmit) => void;
};

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const number = Number(trimmed);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function defaultWorkerIds(task: ManufacturingJob["tasks"][number], users: UserOption[]): string[] {
  const existing = resolveTaskContributors(task).map((person) => person.userId);
  if (existing.length) return existing;
  return users[0] ? [users[0].id] : [];
}

function createWorkerRows(
  workerIds: string[],
  previous: WorkerDraft[],
  remaining: number,
  estimatedHours: number,
): WorkerDraft[] {
  const prevById = new Map(previous.map((row) => [row.userId, row]));
  const keeping = workerIds.filter((id) => prevById.has(id));
  const added = workerIds.filter((id) => !prevById.has(id));

  if (added.length === 0) {
    return workerIds.map((id) => prevById.get(id)!);
  }

  // New selection: split remaining qty/hours across all selected workers as a starting point.
  // User can then edit each person individually.
  const shares = workerIds.map(() => 1);
  const qtyParts = allocateByShares(Math.max(0, remaining), shares);
  const hourParts = allocateByShares(Math.max(0, estimatedHours), shares);

  return workerIds.map((id, index) => {
    const prev = prevById.get(id);
    if (prev && keeping.includes(id) && added.length === 0) return prev;
    // Prefer fresh split when the set of workers changes
    return {
      userId: id,
      qty: String(qtyParts[index] ?? 0),
      hours: hourParts[index] ? String(hourParts[index]) : "",
      ot: prev?.ot ?? "",
      dot: prev?.dot ?? "",
    };
  });
}

function initialWorkersForTask(
  task: ManufacturingJob["tasks"][number],
  users: UserOption[],
): WorkerDraft[] {
  const remaining = remainingQuantity(task);
  const estimated = remainingEstimatedHours(task);
  return createWorkerRows(defaultWorkerIds(task, users), [], remaining, estimated);
}

function workerName(users: UserOption[], userId: string): string {
  return users.find((user) => user.id === userId)?.name ?? userId;
}

export function BulkCompleteTasksDialog({
  job,
  open,
  users,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const tasks = useMemo(() => (job ? eligibleBulkCompleteTasks(job) : []), [job]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TaskDraft>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !job) return;
    const openTasks = eligibleBulkCompleteTasks(job);
    const ids = openTasks.map((task) => task.id);
    setSelectedIds(ids);
    // Default: only the first task expanded; others collapsed.
    setExpandedIds(ids[0] ? [ids[0]] : []);
    const next: Record<string, TaskDraft> = {};
    for (const task of openTasks) {
      next[task.id] = { workers: initialWorkersForTask(task, users) };
    }
    setDrafts(next);
    setNotes("");
  }, [open, job, users]);

  if (!job) return null;

  const selected = tasks.filter(
    (task) =>
      selectedIds.includes(task.id) && isBulkCompleteSelectable(task, job, selectedIds),
  );
  const selectableIds = tasks
    .filter((task) => isBulkCompleteSelectable(task, job, selectedIds))
    .map((task) => task.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const someSelected = selected.length > 0;

  const busyByEmployee = new Map<string, ActiveWorkConflict>();
  for (const task of selected) {
    for (const conflict of previewActiveWork({
      employees: users.map((user) => ({ employeeId: user.id, employeeName: user.name })),
      nextTaskId: task.id,
      operationName: task.name,
    })) {
      if (conflict.taskId && selectedIds.includes(conflict.taskId)) continue;
      busyByEmployee.set(conflict.employeeId, conflict);
    }
  }

  const validationErrors: string[] = [];
  let totalFinishItems = 0;
  const totalWorkers = new Set<string>();

  for (const task of selected) {
    const remaining = remainingQuantity(task);
    const workers = drafts[task.id]?.workers ?? [];
    if (workers.length === 0) {
      validationErrors.push(`${task.name}: select at least one worker`);
      continue;
    }
    let taskQty = 0;
    for (const worker of workers) {
      const qty = Math.floor(parseNumber(worker.qty) ?? 0);
      if (qty < 0) {
        validationErrors.push(`${task.name} / ${workerName(users, worker.userId)}: invalid qty`);
      }
      taskQty += qty;
      totalWorkers.add(worker.userId);
    }
    if (taskQty <= 0) {
      validationErrors.push(`${task.name}: enter finish items for at least one worker`);
      continue;
    }
    if (taskQty > remaining) {
      validationErrors.push(
        `${task.name}: worker items total ${taskQty} exceeds remaining ${remaining}`,
      );
      continue;
    }
    totalFinishItems += taskQty;
  }

  const selectedConflicts = [...busyByEmployee.values()].filter((conflict) =>
    selected.some((task) =>
      (drafts[task.id]?.workers ?? []).some((worker) => worker.userId === conflict.employeeId),
    ),
  );

  const canSubmit = someSelected && validationErrors.length === 0;

  const allExpanded =
    tasks.length > 0 && tasks.every((task) => expandedIds.includes(task.id));
  const someExpanded = expandedIds.some((id) => tasks.some((task) => task.id === id));

  const toggleExpanded = (taskId: string) => {
    setExpandedIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const expandAll = () => setExpandedIds(tasks.map((task) => task.id));
  const collapseAll = () => setExpandedIds([]);

  const selectTask = (taskId: string) => {
    const task = job.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const prereqs = incompleteBulkPrerequisites(task, job);
    const toSelect = [...prereqs, taskId];
    setSelectedIds((current) => [...new Set([...current, ...toSelect])]);
    setExpandedIds((current) => [...new Set([...current, ...toSelect])]);
  };

  const deselectTask = (taskId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      for (const other of tasks) {
        if (!next.has(other.id)) continue;
        if (other.prerequisiteTaskIds.includes(taskId)) next.delete(other.id);
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const other of tasks) {
          if (!next.has(other.id)) continue;
          if (!isBulkCompleteSelectable(other, job, [...next])) {
            next.delete(other.id);
            changed = true;
          }
        }
      }
      return [...next];
    });
  };

  const setWorkers = (taskId: string, workerIds: string[]) => {
    const task = job.tasks.find((item) => item.id === taskId);
    if (!task) return;
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        workers: createWorkerRows(
          workerIds,
          current[taskId]?.workers ?? [],
          remainingQuantity(task),
          remainingEstimatedHours(task),
        ),
      },
    }));
  };

  const updateWorker = (taskId: string, userId: string, patch: Partial<WorkerDraft>) => {
    setDrafts((current) => {
      const workers = current[taskId]?.workers ?? [];
      return {
        ...current,
        [taskId]: {
          workers: workers.map((worker) =>
            worker.userId === userId ? { ...worker, ...patch } : worker,
          ),
        },
      };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      notes: notes.trim() || undefined,
      tasks: selected.map((task) => {
        const workers = drafts[task.id]?.workers ?? [];
        const contributors: TaskContributorInput[] = workers
          .map((worker) => {
            const user = users.find((item) => item.id === worker.userId);
            if (!user) return null;
            const qty = Math.floor(parseNumber(worker.qty) ?? 0);
            if (qty <= 0) return null;
            const hours = parseNumber(worker.hours) ?? 0;
            const ot = parseNumber(worker.ot) ?? 0;
            const dot = parseNumber(worker.dot) ?? 0;
            return {
              userId: user.id,
              userName: user.name,
              contributionPercent: CONTRIBUTION_TOTAL,
              quantity: qty,
              progressPercentage: 100,
              actualHours: hours || undefined,
              normalOvertimeHours: ot || undefined,
              doubleOvertimeHours: dot || undefined,
              overtimeHours: ot + dot > 0 ? ot + dot : undefined,
            } satisfies TaskContributorInput;
          })
          .filter((person): person is TaskContributorInput => Boolean(person));

        const completedQuantity = contributors.reduce(
          (sum, person) => sum + (person.quantity ?? 0),
          0,
        );
        const actualHours = contributors.reduce(
          (sum, person) => sum + (person.actualHours ?? 0),
          0,
        );
        const normalOvertimeHours = contributors.reduce(
          (sum, person) => sum + (person.normalOvertimeHours ?? 0),
          0,
        );
        const doubleOvertimeHours = contributors.reduce(
          (sum, person) => sum + (person.doubleOvertimeHours ?? 0),
          0,
        );

        return {
          taskId: task.id,
          completedQuantity,
          actualHours: actualHours || undefined,
          normalOvertimeHours: normalOvertimeHours || undefined,
          doubleOvertimeHours: doubleOvertimeHours || undefined,
          contributors,
        };
      }),
    });
  };

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title={`Complete multiple tasks · ${job.jobNumber}`}
      size="xl"
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {someSelected ? (
              <>
                <span className="font-medium text-foreground">{selected.length}</span> task
                {selected.length === 1 ? "" : "s"} ·{" "}
                <span className="font-medium text-foreground">{totalFinishItems}</span> item
                {totalFinishItems === 1 ? "" : "s"} ·{" "}
                <span className="font-medium text-foreground">{totalWorkers.size}</span> worker
                {totalWorkers.size === 1 ? "" : "s"}
              </>
            ) : (
              "Select at least one task"
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={loading} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              loading={loading}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Complete selected
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Select workers for each task, then enter finish items, Hours, OT, and DOT for each person
          individually.
        </p>

        {tasks.length === 0 ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-3 text-muted-foreground">
            No open tasks left on this job.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/40 px-3 py-2.5">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                aria-label="Select all open tasks"
                onChange={(event) => {
                  if (event.target.checked) {
                    const ids = tasks.map((task) => task.id);
                    setSelectedIds(ids);
                    // Keep current expand state; do not force-expand all on select-all.
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
              <span className="min-w-0 flex-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tasks · Per-worker finish qty · Hours · OT · DOT
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={allExpanded}
                  onClick={expandAll}
                >
                  Expand all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!someExpanded}
                  onClick={collapseAll}
                >
                  Collapse all
                </Button>
              </div>
            </div>

            <ul className="divide-y divide-border">
              {tasks.map((task) => {
                const remaining = remainingQuantity(task);
                const progress = taskQuantityProgressPercent(task);
                const checked = selectedIds.includes(task.id);
                const canSelect = isBulkCompleteSelectable(
                  task,
                  job,
                  checked
                    ? selectedIds
                    : [...selectedIds, task.id, ...incompleteBulkPrerequisites(task, job)],
                );
                const draft = drafts[task.id] ?? { workers: [] };
                const workerIds = draft.workers.map((worker) => worker.userId);
                const finishQty = draft.workers.reduce(
                  (sum, worker) => sum + Math.floor(parseNumber(worker.qty) ?? 0),
                  0,
                );
                const willFinishTask = checked && finishQty >= remaining && remaining > 0;
                const qtyInvalid = checked && (finishQty <= 0 || finishQty > remaining);
                const expanded = expandedIds.includes(task.id);
                const prereqNames = task.prerequisiteTaskIds
                  .map((id) => job.tasks.find((item) => item.id === id))
                  .filter(
                    (item) => item && item.status !== "completed" && item.status !== "skipped",
                  )
                  .map((item) => item!.name);

                return (
                  <li
                    key={task.id}
                    className={cn(
                      "px-3 py-3 transition-colors",
                      checked ? "bg-card" : "bg-muted/10",
                      !canSelect && !checked && "opacity-55",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-1"
                        checked={checked}
                        disabled={!canSelect && !checked}
                        aria-label={`Select ${task.name}`}
                        onChange={(event) => {
                          if (event.target.checked) selectTask(task.id);
                          else deselectTask(task.id);
                        }}
                      />

                      <div className="min-w-0 flex-1 space-y-3">
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-2 text-left"
                          aria-expanded={expanded}
                          onClick={() => toggleExpanded(task.id)}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="font-medium text-foreground">
                                {task.taskNumber} {task.name}
                              </span>
                              <StatusBadge
                                variant={statusVariant(ManufacturingTaskStatus, task.status)}
                                size="sm"
                              >
                                {statusLabel(ManufacturingTaskStatus, task.status)}
                              </StatusBadge>
                              {checked && willFinishTask && (
                                <StatusBadge variant="success" size="sm">
                                  Will complete
                                </StatusBadge>
                              )}
                              {checked && !willFinishTask && finishQty > 0 && (
                                <StatusBadge variant="info" size="sm">
                                  Partial · {finishQty}/{remaining}
                                </StatusBadge>
                              )}
                              {qtyInvalid && (
                                <StatusBadge variant="danger" size="sm">
                                  Check item totals
                                </StatusBadge>
                              )}
                              {!expanded && checked && workerIds.length > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                  {workerIds.length} worker{workerIds.length === 1 ? "" : "s"} ·{" "}
                                  {finishQty} item{finishQty === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                              Done {task.completedQuantity}/{task.plannedQuantity} · remaining{" "}
                              {remaining}
                              {task.status === "pending" && prereqNames.length > 0
                                ? ` · needs ${prereqNames.join(", ")}`
                                : ""}
                            </p>
                          </div>
                          <div className="w-28 shrink-0">
                            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  willFinishTask ? "bg-success" : "bg-foreground/70",
                                )}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              />
                            </div>
                          </div>
                        </button>

                        {checked && expanded && (
                          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              Workforce allocation
                              <span className="font-normal text-muted-foreground">
                                · set items / hours / OT / DOT per person
                              </span>
                            </div>

                            <MultiSelect
                              label="Workers"
                              placeholder="Select workers"
                              hint={
                                workerIds.length === 0
                                  ? "Select who will finish this work"
                                  : undefined
                              }
                              value={workerIds}
                              disabled={loading}
                              onChange={(ids) => setWorkers(task.id, ids)}
                              options={users.map((user) => {
                                const busy = busyByEmployee.get(user.id);
                                return {
                                  value: user.id,
                                  label: busy
                                    ? `${user.name} (busy: ${busy.productionOrderNumber ?? "other"} / ${busy.operation})`
                                    : user.name,
                                };
                              })}
                            />

                            {draft.workers.length > 0 && (
                              <div className="overflow-x-auto rounded-md border border-border bg-card">
                                <table className="w-full min-w-[36rem] text-xs">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                                      <th className="px-2.5 py-2 font-medium">Worker</th>
                                      <th className="w-24 px-2 py-2 text-right font-medium">
                                        Items
                                      </th>
                                      <th className="w-24 px-2 py-2 text-right font-medium">
                                        Hours
                                      </th>
                                      <th className="w-20 px-2 py-2 text-right font-medium">OT</th>
                                      <th className="w-20 px-2 py-2 text-right font-medium">DOT</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {draft.workers.map((worker) => {
                                      const busy = busyByEmployee.get(worker.userId);
                                      return (
                                        <tr key={worker.userId}>
                                          <td className="px-2.5 py-2 align-top">
                                            <div className="font-medium text-foreground">
                                              {workerName(users, worker.userId)}
                                            </div>
                                            {busy && (
                                              <p className="mt-0.5 text-[10px] text-warning">
                                                Busy on {busy.productionOrderNumber} /{" "}
                                                {busy.operation}
                                              </p>
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 align-top">
                                            <Input
                                              aria-label={`${workerName(users, worker.userId)} items`}
                                              type="number"
                                              min={0}
                                              max={remaining}
                                              step={1}
                                              size="sm"
                                              value={worker.qty}
                                              disabled={loading}
                                              onChange={(event) =>
                                                updateWorker(task.id, worker.userId, {
                                                  qty: event.target.value,
                                                })
                                              }
                                            />
                                          </td>
                                          <td className="px-2 py-1.5 align-top">
                                            <Input
                                              aria-label={`${workerName(users, worker.userId)} hours`}
                                              type="number"
                                              min={0}
                                              step={0.25}
                                              size="sm"
                                              value={worker.hours}
                                              disabled={loading}
                                              onChange={(event) =>
                                                updateWorker(task.id, worker.userId, {
                                                  hours: event.target.value,
                                                })
                                              }
                                            />
                                          </td>
                                          <td className="px-2 py-1.5 align-top">
                                            <Input
                                              aria-label={`${workerName(users, worker.userId)} OT`}
                                              type="number"
                                              min={0}
                                              step={0.25}
                                              size="sm"
                                              value={worker.ot}
                                              disabled={loading}
                                              onChange={(event) =>
                                                updateWorker(task.id, worker.userId, {
                                                  ot: event.target.value,
                                                })
                                              }
                                            />
                                          </td>
                                          <td className="px-2 py-1.5 align-top">
                                            <Input
                                              aria-label={`${workerName(users, worker.userId)} DOT`}
                                              type="number"
                                              min={0}
                                              step={0.25}
                                              size="sm"
                                              value={worker.dot}
                                              disabled={loading}
                                              onChange={(event) =>
                                                updateWorker(task.id, worker.userId, {
                                                  dot: event.target.value,
                                                })
                                              }
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-border bg-muted/30 text-[11px]">
                                      <td className="px-2.5 py-2 text-muted-foreground">Total</td>
                                      <td
                                        className={cn(
                                          "px-2 py-2 text-right font-medium tabular-nums",
                                          qtyInvalid ? "text-danger" : "text-foreground",
                                        )}
                                      >
                                        {finishQty} / {remaining}
                                      </td>
                                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                                        {draft.workers.reduce(
                                          (sum, worker) =>
                                            sum + (parseNumber(worker.hours) ?? 0),
                                          0,
                                        )}
                                      </td>
                                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                                        {draft.workers.reduce(
                                          (sum, worker) => sum + (parseNumber(worker.ot) ?? 0),
                                          0,
                                        )}
                                      </td>
                                      <td className="px-2 py-2 text-right tabular-nums text-foreground">
                                        {draft.workers.reduce(
                                          (sum, worker) => sum + (parseNumber(worker.dot) ?? 0),
                                          0,
                                        )}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {selectedConflicts.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
            <p className="font-medium">Workers busy on other work</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {selectedConflicts.map((conflict) => (
                <li key={conflict.sessionId}>
                  {conflict.employeeName} — {conflict.productionOrderNumber} / {conflict.operation}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-muted-foreground">
              After you save, confirm Pause or Stop before these tasks are completed.
            </p>
          </div>
        )}

        {validationErrors.length > 0 && someSelected && (
          <ul className="space-y-1 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        <Textarea
          label="Shared notes (optional)"
          rows={2}
          value={notes}
          disabled={loading}
          placeholder="Applied to every selected task"
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Modal>
  );
}
