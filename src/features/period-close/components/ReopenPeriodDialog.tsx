import { useState } from "react";
import { toast } from "@/components/feedback/toast";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Textarea } from "@/components/ui/Textarea";

export function ReopenPeriodDialog({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  description,
  originalClosedBy,
  originalClosedAt,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  title: string;
  description?: string;
  originalClosedBy?: string;
  originalClosedAt?: string;
}) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <ConfirmationDialog
      open={open}
      onClose={handleClose}
      onConfirm={() => {
        const trimmed = reason.trim();
        if (!trimmed) {
          toast.error("A reopen reason is required.");
          return;
        }
        onConfirm(trimmed);
      }}
      title={title}
      description={description}
      confirmLabel="Reopen period"
      loading={loading}
      variant="danger"
    >
      <div className="mt-3 space-y-3">
        {(originalClosedBy || originalClosedAt) && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {originalClosedBy && <p>Original close user: {originalClosedBy}</p>}
            {originalClosedAt && <p>Original close time: {originalClosedAt}</p>}
          </div>
        )}
        <Textarea
          label="Reopen reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder='e.g. "Incorrect payment entered for invoice INV-00425."'
        />
      </div>
    </ConfirmationDialog>
  );
}
