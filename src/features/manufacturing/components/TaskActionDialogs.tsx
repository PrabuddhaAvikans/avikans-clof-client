import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  TaskContributorsEditor,
  draftsFromInputs,
  draftsFromUsers,
  parsedContributorInputs,
  type ContributorDraft,
  type UserOption,
} from "@/features/manufacturing/components/TaskContributorsEditor";
import {
  availableQuantity,
  remainingEstimatedHours,
  remainingQuantity,
  taskQuantityProgressPercent,
} from "@/lib/manufacturingTasks";
import {
  CONTRIBUTION_TOTAL,
  defaultCompleteContributors,
  formatContributors,
  hasCompleteContribution,
  quantityTotal,
  resolveTaskContributors,
} from "@/lib/taskContributors";
import { ensureTaskUnits, overallUnitProgress } from "@/lib/taskUnits";
import { cn } from "@/lib/utils";
import type { ManufacturingTask, ManufacturingTaskAction } from "@/types/manufacturing";

export type TaskDialogMode = "start" | "complete" | "hold" | "notes" | "rework" | null;

type Props = {
  task: ManufacturingTask | null;
  mode: TaskDialogMode;
  users: UserOption[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (action: ManufacturingTaskAction) => void;
};

function previewOverallProgress(
  task: ManufacturingTask,
  inputs: ReturnType<typeof parsedContributorInputs>,
): number {
  const units = ensureTaskUnits(task).map((unit) => ({ ...unit }));
  if (!inputs.length) return overallUnitProgress(units);

  let cursor = 0;
  const incomplete = units.filter((unit) => unit.progressPercentage < 100);

  const shared = inputs.filter((person) => (person.unitNos?.length ?? 0) > 0);
  if (shared.length) {
    const progress = Math.max(...shared.map((person) => person.progressPercentage ?? 100));
    const nos = new Set(shared.flatMap((person) => person.unitNos ?? []));
    for (const unit of units) {
      if (nos.has(unit.unitNo)) unit.progressPercentage = progress;
    }
    return overallUnitProgress(units);
  }

  for (const person of inputs) {
    const qty = Math.max(0, Math.floor(person.quantity || 0));
    const progress = person.progressPercentage ?? CONTRIBUTION_TOTAL;
    for (let i = 0; i < qty && cursor < incomplete.length; i += 1) {
      incomplete[cursor].progressPercentage = progress;
      cursor += 1;
    }
  }
  return overallUnitProgress(units);
}

function effectiveQtyTotal(inputs: ReturnType<typeof parsedContributorInputs>): number {
  const shared = inputs.filter((person) => (person.unitNos?.length ?? 0) > 0);
  if (shared.length) {
    return Math.max(...shared.map((person) => person.unitNos?.length ?? person.quantity ?? 0), 0);
  }
  return quantityTotal(inputs);
}

export function TaskActionDialogs({
  task,
  mode,
  users,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const remaining = task ? remainingQuantity(task) : 0;
  const available = task ? availableQuantity(task) : 0;
  const remainingHours = task ? remainingEstimatedHours(task) : 0;
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [machineName, setMachineName] = useState("");
  const [quantityStarted, setQuantityStarted] = useState(available);
  const [contributors, setContributors] = useState<ContributorDraft[]>([]);
  const [reworkQuantity, setReworkQuantity] = useState(remaining || 1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!task || !mode) return;
    const existing = resolveTaskContributors(task);
    setAssignedIds(existing.map((person) => person.userId));
    setMachineName(task.machineName ?? "");
    setQuantityStarted(Math.max(1, availableQuantity(task) || remainingQuantity(task)));
    const actor =
      existing[0] ??
      (users[0]
        ? {
            userId: users[0].id,
            userName: users[0].name,
            contributionPercent: CONTRIBUTION_TOTAL,
            status: "assigned" as const,
          }
        : null);
    setContributors(
      actor
        ? draftsFromInputs(
            defaultCompleteContributors(existing, actor, {
              quantity: remainingQuantity(task),
              estimatedHours: remainingEstimatedHours(task),
            }).map((person) => ({
              ...person,
              contributionPercent: person.contributionPercent ?? CONTRIBUTION_TOTAL,
              progressPercentage: 100,
            })),
          )
        : [],
    );
    setReworkQuantity(Math.max(1, remainingQuantity(task) || task.plannedQuantity));
    setReason("");
    setNotes(task.notes ?? "");
  }, [task?.id, mode, users.length]);

  if (!task || !mode) return null;

  const openUnitNos = ensureTaskUnits(task)
    .filter((unit) => unit.progressPercentage < 100)
    .map((unit) => unit.unitNo);

  const contributionInputs = parsedContributorInputs(contributors);
  const qtyTotal = effectiveQtyTotal(contributionInputs);
  const currentProgress = taskQuantityProgressPercent(task);
  const nextProgress = previewOverallProgress(task, contributionInputs);
  const quantityOk = qtyTotal - remaining <= 0.05;
  const isShared = contributionInputs.some((person) => (person.unitNos?.length ?? 0) > 0);
  const sharesOk = !isShared || hasCompleteContribution(contributionInputs);
  const contributionOk = quantityOk;
  const willFinishTask =
    nextProgress >= 100 && qtyTotal >= remaining && remaining > 0 && sharesOk;

  const title = {
    start: `Start · ${task.name}`,
    complete: `Progress · ${task.name}`,
    hold: `Hold · ${task.name}`,
    notes: `Notes · ${task.name}`,
    rework: `Rework · ${task.name}`,
  }[mode];

  const handleSubmit = () => {
    if (mode === "start") {
      if (task.status === "on_hold" || task.status === "blocked") {
        onSubmit({ type: "resume", taskId: task.id, notes: notes || undefined });
        return;
      }
      const selected = assignedIds
        .map((id) => users.find((user) => user.id === id))
        .filter((user): user is UserOption => Boolean(user));
      const primary = selected[0];
      onSubmit({
        type: "start",
        taskId: task.id,
        assignedTo: primary?.id,
        assignedToName: primary?.name,
        operatorId: primary?.id,
        operatorName: primary?.name,
        machineName: machineName || undefined,
        quantityStarted,
        contributors: selected.map((user) => ({
          userId: user.id,
          userName: user.name,
          contributionPercent: CONTRIBUTION_TOTAL,
        })),
        notes: notes || undefined,
      });
      return;
    }
    if (mode === "complete") {
      if (!contributionOk) return;
      // Without share totals at 100%, keep as in-progress save (never complete).
      const submitInputs =
        isShared && !sharesOk
          ? contributionInputs.map((person) => ({
              ...person,
              progressPercentage: Math.min(person.progressPercentage ?? 0, 99),
            }))
          : contributionInputs;
      onSubmit({
        type: "complete",
        taskId: task.id,
        completedQuantity: qtyTotal,
        rejectedQuantity: submitInputs.reduce(
          (sum, person) => sum + (person.rejectedQuantity ?? 0),
          0,
        ),
        wasteQuantity: submitInputs.reduce(
          (sum, person) => sum + (person.wasteQuantity ?? 0),
          0,
        ),
        contributors: submitInputs,
        notes: notes || undefined,
      });
      return;
    }
    if (mode === "hold") {
      onSubmit({ type: "hold", taskId: task.id, notes: notes || undefined });
      return;
    }
    if (mode === "notes") {
      onSubmit({ type: "notes", taskId: task.id, notes });
      return;
    }
    if (mode === "rework") {
      onSubmit({
        type: "rework",
        taskId: task.id,
        reason: reason.trim() || "Rework required",
        quantity: reworkQuantity,
        notes: notes || undefined,
      });
    }
  };

  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
      title={title}
      size={mode === "complete" ? "xl" : "md"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={willFinishTask && mode === "complete" ? "success" : "primary"}
            loading={loading}
            disabled={
              (mode === "complete" && remaining > 0 && (!contributionOk || qtyTotal <= 0)) ||
              (mode === "start" &&
                task.status !== "on_hold" &&
                task.status !== "blocked" &&
                (quantityStarted <= 0 || quantityStarted > available))
            }
            onClick={handleSubmit}
          >
            {mode === "complete"
              ? willFinishTask
                ? "Complete task"
                : "Save progress"
              : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {mode === "complete" && (
          <>
            <div className="rounded-md border border-border bg-card">
              <div className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-4">
                <Metric label="Planned" value={String(task.plannedQuantity)} />
                <Metric label="Completed" value={String(task.completedQuantity)} />
                <Metric label="Remaining" value={String(remaining)} />
                <Metric
                  label="Progress"
                  value={`${currentProgress}%`}
                  hint={qtyTotal > 0 ? `→ ${nextProgress}%` : undefined}
                />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{task.taskNumber}</span>
                  <StatusBadge
                    variant={willFinishTask ? "success" : remaining === 0 ? "success" : "info"}
                    size="sm"
                  >
                    {willFinishTask
                      ? "Will complete"
                      : isShared && !sharesOk
                        ? "Save only"
                        : remaining === 0
                          ? "Complete"
                          : "In progress"}
                  </StatusBadge>
                </div>
                {isShared && !sharesOk && (
                  <p className="text-xs text-muted-foreground">
                    Share % must total 100% before you can complete. You can still save progress.
                  </p>
                )}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width]",
                      (qtyTotal > 0 ? nextProgress : currentProgress) >= 100
                        ? "bg-success"
                        : "bg-foreground",
                    )}
                    style={{
                      width: `${qtyTotal > 0 ? nextProgress : currentProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <TaskContributorsEditor
              users={users}
              value={contributors}
              onChange={setContributors}
              task={task}
              remainingQuantity={remaining}
              remainingHours={remainingHours}
              openUnitNos={openUnitNos}
              requireTotal={qtyTotal > 0}
              separateQuantities
            />
          </>
        )}

        {mode === "start" && (
          <>
            <p className="text-sm text-muted-foreground">
              Assign workers and start quantity. Free capacity:{" "}
              <span className="font-medium text-foreground">{available}</span> of{" "}
              <span className="font-medium text-foreground">{task.plannedQuantity}</span>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MultiSelect
                  label="Workers"
                  placeholder="Select workers"
                  value={assignedIds}
                  onChange={(ids) => {
                    setAssignedIds(ids);
                    setContributors(draftsFromUsers(ids, users, contributors));
                  }}
                  options={users.map((user) => ({ value: user.id, label: user.name }))}
                />
              </div>
              <Input
                label="Start quantity"
                type="number"
                min={1}
                max={Math.max(1, available)}
                value={quantityStarted}
                onChange={(event) => setQuantityStarted(Number(event.target.value))}
                hint={`${available} available`}
              />
              <Input
                label="Machine / resource"
                value={machineName}
                onChange={(event) => setMachineName(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </>
        )}

        {mode === "hold" && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {resolveTaskContributors(task).length > 0
              ? `This will hold work for ${formatContributors(resolveTaskContributors(task), false)}.`
              : "This task will be placed on hold."}
          </div>
        )}

        {mode === "rework" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Textarea
                label="Rework reason"
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
              />
            </div>
            <Input
              label="Rework quantity"
              type="number"
              min={1}
              max={task.plannedQuantity}
              value={reworkQuantity}
              onChange={(event) => setReworkQuantity(Number(event.target.value))}
            />
          </div>
        )}

        <Textarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional production notes"
        />
      </div>
    </Modal>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
        {hint ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </p>
    </div>
  );
}
