import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Textarea } from "@/components/ui/Textarea";
import {
  TaskContributorsEditor,
  draftsFromInputs,
  draftsFromUsers,
  parsedContributorInputs,
  type ContributorDraft,
  type UserOption,
} from "@/features/manufacturing/components/TaskContributorsEditor";
import { remainingEstimatedHours, remainingQuantity } from "@/lib/manufacturingTasks";
import {
  defaultCompleteContributors,
  formatContributors,
  hasCompleteContribution,
  hasCompleteQuantity,
  quantityTotal,
  resolveTaskContributors,
} from "@/lib/taskContributors";
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

export function TaskActionDialogs({
  task,
  mode,
  users,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const remaining = task ? remainingQuantity(task) : 0;
  const remainingHours = task ? remainingEstimatedHours(task) : 0;
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [machineName, setMachineName] = useState("");
  const [quantityStarted, setQuantityStarted] = useState(remaining);
  const [contributors, setContributors] = useState<ContributorDraft[]>([]);
  const [reworkQuantity, setReworkQuantity] = useState(remaining || 1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!task || !mode) return;
    const existing = resolveTaskContributors(task);
    setAssignedIds(existing.map((person) => person.userId));
    setMachineName(task.machineName ?? "");
    setQuantityStarted(remainingQuantity(task));
    const actor =
      existing[0] ??
      (users[0]
        ? { userId: users[0].id, userName: users[0].name, contributionPercent: 0, status: "assigned" as const }
        : null);
    setContributors(
      actor
        ? draftsFromInputs(
            defaultCompleteContributors(existing, actor, {
              quantity: remainingQuantity(task),
              estimatedHours: remainingEstimatedHours(task),
            }),
          )
        : [],
    );
    setReworkQuantity(Math.max(1, remainingQuantity(task) || task.plannedQuantity));
    setReason("");
    setNotes(task.notes ?? "");
  }, [task?.id, mode, users.length]);

  if (!task || !mode) return null;

  const contributionInputs = parsedContributorInputs(contributors);
  const qtyTotal = quantityTotal(contributionInputs);
  const finishingTask = qtyTotal >= remaining && remaining > 0;
  const contributionOk =
    !finishingTask ||
    (hasCompleteContribution(contributionInputs) && hasCompleteQuantity(contributionInputs, remaining));

  const title = {
    start: `Start ${task.name}`,
    complete: `Complete ${task.name}`,
    hold: `Hold ${task.name}`,
    notes: `Notes - ${task.name}`,
    rework: `Record rework - ${task.name}`,
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
          contributionPercent: 0,
        })),
        notes: notes || undefined,
      });
      return;
    }
    if (mode === "complete") {
      if (finishingTask && !contributionOk) return;
      onSubmit({
        type: "complete",
        taskId: task.id,
        completedQuantity: qtyTotal,
        rejectedQuantity: contributionInputs.reduce(
          (sum, person) => sum + (person.rejectedQuantity ?? 0),
          0,
        ),
        wasteQuantity: contributionInputs.reduce(
          (sum, person) => sum + (person.wasteQuantity ?? 0),
          0,
        ),
        contributors: contributionInputs,
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
      size={mode === "complete" ? "2xl" : "md"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={
              mode === "complete" &&
              remaining > 0 &&
              (qtyTotal > remaining || (finishingTask && !contributionOk))
            }
            onClick={handleSubmit}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {task.taskNumber} · Planned {task.plannedQuantity} · Completed {task.completedQuantity} ·
          Remaining {remaining}
        </p>

        {mode === "start" && (
          <>
            <MultiSelect
              label="Assigned people"
              hint="One or more people can work this task. Quantity, OT, and labour are recorded per person when it is completed."
              placeholder="Select people"
              value={assignedIds}
              onChange={(ids) => {
                setAssignedIds(ids);
                setContributors(draftsFromUsers(ids, users, contributors));
              }}
              options={users.map((user) => ({ value: user.id, label: user.name }))}
            />
            <Input
              label="Machine / resource (optional)"
              value={machineName}
              onChange={(event) => setMachineName(event.target.value)}
            />
            <Input
              label="Quantity started"
              type="number"
              min={1}
              max={task.plannedQuantity}
              value={quantityStarted}
              onChange={(event) => setQuantityStarted(Number(event.target.value))}
            />
          </>
        )}

        {mode === "hold" && resolveTaskContributors(task).length > 0 && (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Holding work for {formatContributors(resolveTaskContributors(task), false)}
          </p>
        )}

        {mode === "complete" && (
          <TaskContributorsEditor
            users={users}
            value={contributors}
            onChange={setContributors}
            task={task}
            remainingQuantity={remaining}
            remainingHours={remainingHours}
            requireTotal={finishingTask || qtyTotal > remaining}
          />
        )}

        {mode === "rework" && (
          <>
            <Textarea
              label="Reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
            />
            <Input
              label="Rework quantity"
              type="number"
              min={1}
              max={task.plannedQuantity}
              value={reworkQuantity}
              onChange={(event) => setReworkQuantity(Number(event.target.value))}
            />
          </>
        )}

        <Textarea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          textareaClassName="min-h-[56px] py-1.5"
        />
      </div>
    </Modal>
  );
}
