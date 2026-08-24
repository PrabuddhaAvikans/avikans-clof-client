import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  remainingQuantity,
} from "@/lib/manufacturingTasks";
import type { ManufacturingTask, ManufacturingTaskAction } from "@/types/manufacturing";

export type TaskDialogMode = "start" | "complete" | "hold" | "notes" | "rework" | null;

type UserOption = { id: string; name: string };

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
  const [assignedTo, setAssignedTo] = useState("");
  const [machineName, setMachineName] = useState("");
  const [quantityStarted, setQuantityStarted] = useState(remaining);
  const [completedQuantity, setCompletedQuantity] = useState(remaining);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [actualHours, setActualHours] = useState("");
  const [reworkQuantity, setReworkQuantity] = useState(remaining || 1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!task || !mode) return;
    setAssignedTo(task.assignedTo ?? "");
    setMachineName(task.machineName ?? "");
    setQuantityStarted(remainingQuantity(task));
    setCompletedQuantity(remainingQuantity(task));
    setRejectedQuantity(0);
    setWasteQuantity(0);
    setActualHours(task.actualHours != null ? String(task.actualHours) : "");
    setReworkQuantity(Math.max(1, remainingQuantity(task) || task.plannedQuantity));
    setReason("");
    setNotes(task.notes ?? "");
  }, [task, mode]);

  if (!task || !mode) return null;

  const selectedUser = users.find((user) => user.id === assignedTo);

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
      onSubmit({
        type: "start",
        taskId: task.id,
        assignedTo: assignedTo || undefined,
        assignedToName: selectedUser?.name,
        operatorId: assignedTo || undefined,
        operatorName: selectedUser?.name,
        machineName: machineName || undefined,
        quantityStarted,
        notes: notes || undefined,
      });
      return;
    }
    if (mode === "complete") {
      onSubmit({
        type: "complete",
        taskId: task.id,
        completedQuantity,
        rejectedQuantity,
        wasteQuantity,
        actualHours: actualHours ? Number(actualHours) : undefined,
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
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {task.taskNumber} · Planned {task.plannedQuantity} · Completed {task.completedQuantity} ·
          Remaining {remaining}
        </p>

        {mode === "start" && (
          <>
            <Select
              label="Assigned person (optional)"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              options={[{ value: "", label: "Unassigned" }, ...users.map((user) => ({ value: user.id, label: user.name }))]}
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

        {mode === "complete" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Completed quantity"
                type="number"
                min={0}
                max={remaining}
                value={completedQuantity}
                onChange={(event) => setCompletedQuantity(Number(event.target.value))}
              />
              <Input
                label="Rejected quantity"
                type="number"
                min={0}
                value={rejectedQuantity}
                onChange={(event) => setRejectedQuantity(Number(event.target.value))}
              />
              <Input
                label="Waste quantity"
                type="number"
                min={0}
                value={wasteQuantity}
                onChange={(event) => setWasteQuantity(Number(event.target.value))}
              />
              <Input
                label="Actual time (hours)"
                type="number"
                min={0}
                step={0.05}
                value={actualHours}
                onChange={(event) => setActualHours(event.target.value)}
                hint="Leave blank to calculate from start time"
              />
            </div>
          </>
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
          rows={3}
        />
      </div>
    </Modal>
  );
}
