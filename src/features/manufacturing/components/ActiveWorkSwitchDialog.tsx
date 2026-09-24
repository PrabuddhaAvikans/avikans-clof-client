import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { formatWorkedDuration } from "@/lib/employee-work";
import { formatDateTime } from "@/lib/format";
import type { ActiveWorkConflict } from "@/types/employee-work";

type Props = {
  conflicts: ActiveWorkConflict[];
  nextOrderNumber: string;
  nextOperation: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (action: "pause" | "stop", reason?: string) => void;
};

function formatProgress(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function ActiveWorkSwitchDialog({
  conflicts,
  nextOrderNumber,
  nextOperation,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<"pause" | "stop" | null>(null);

  useEffect(() => {
    setReason("");
    setPendingAction(null);
  }, [conflicts]);

  const single = conflicts.length === 1;

  return (
    <Modal
      open={conflicts.length > 0}
      onClose={loading ? () => undefined : onCancel}
      title="Employee already working"
      size="lg"
      closeOnOverlayClick={!loading}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={loading || conflicts.length === 0}
            loading={loading && pendingAction === "stop"}
            onClick={() => {
              setPendingAction("stop");
              onConfirm("stop", reason);
            }}
          >
            Stop & Start New
          </Button>
          <Button
            variant="primary"
            disabled={loading || conflicts.length === 0}
            loading={loading && pendingAction === "pause"}
            onClick={() => {
              setPendingAction("pause");
              onConfirm("pause", reason);
            }}
          >
            Pause & Start New
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {conflicts.map((conflict) => (
          <div key={conflict.sessionId} className="space-y-2">
            <p className="text-foreground">
              {single
                ? `${conflict.employeeName} is currently working on another task.`
                : `${conflict.employeeName} is currently working on another task.`}
            </p>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 rounded-md border border-border bg-muted/40 px-3 py-2">
              <dt className="text-muted-foreground">Order</dt>
              <dd className="font-medium">{conflict.productionOrderNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Operation</dt>
              <dd className="font-medium">{conflict.operation}</dd>
              <dt className="text-muted-foreground">Started</dt>
              <dd>{formatDateTime(conflict.startedAt, "h:mm a")}</dd>
              <dt className="text-muted-foreground">Worked time</dt>
              <dd>{formatWorkedDuration(conflict.workedMinutes)}</dd>
              <dt className="text-muted-foreground">Progress</dt>
              <dd>{formatProgress(conflict.progressPercentage)}</dd>
            </dl>
          </div>
        ))}

        <p className="text-foreground">
          Would you like to pause the current task and start:
        </p>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Order</dt>
          <dd className="font-medium">{nextOrderNumber}</dd>
          <dt className="text-muted-foreground">Operation</dt>
          <dd className="font-medium">{nextOperation}?</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          Pause keeps the current work session so it can be resumed later. Stop closes that
          session. Either way, task progress stays as it is and the task is not completed or
          cancelled.
        </p>
        <Textarea
          label="Reason"
          rows={2}
          value={reason}
          placeholder="Optional. For example, high priority order"
          disabled={loading}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
}
