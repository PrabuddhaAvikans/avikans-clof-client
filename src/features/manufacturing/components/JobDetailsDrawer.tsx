import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { AttachmentIcon } from "@/components/ui/AttachmentIcon";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateJobProgress,
  isJobDelayed,
} from "@/features/manufacturing/utils/jobUtils";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { downloadAttachment, openAttachment } from "@/lib/attachment";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ManufacturingJob } from "@/types/manufacturing";
import { ManufacturingJobStatus, Priority } from "@/types/status";

export type JobDetailsDrawerProps = {
  job: ManufacturingJob | null;
  open: boolean;
  onClose: () => void;
};

export function JobDetailsDrawer({ job, open, onClose }: JobDetailsDrawerProps) {
  if (!job) {
    return null;
  }

  const progress = calculateJobProgress(job);
  const delayed = isJobDelayed(job);
  const materialsPending = job.materialRequirements.some(
    (mr) => mr.reservedQuantity < mr.requiredQuantity && mr.status !== "issued",
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Selected Job"
      size="md"
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Link to={ROUTES.manufacturing.jobDetail(job.id)} className="ml-auto">
            <Button variant="primary" size="sm">
              Open Full Details
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 text-[13px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Job ID
              </p>
              <p className="text-base font-semibold text-foreground">{job.jobNumber}</p>
            </div>
            <StatusBadge
              variant={statusVariant(ManufacturingJobStatus, job.status)}
              size="sm"
            >
              {statusLabel(ManufacturingJobStatus, job.status)}
            </StatusBadge>
          </div>

          <dl className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Linked Order</dt>
              <dd className="font-medium text-foreground">{job.salesOrderNumber}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium text-foreground">{job.customerName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Product</dt>
              <dd className="text-right font-medium text-foreground">{job.productName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Priority</dt>
              <dd>
                <StatusBadge variant={statusVariant(Priority, job.priority)} size="sm">
                  {statusLabel(Priority, job.priority)}
                </StatusBadge>
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Progress
            </p>
            <span className="text-[12px] font-semibold tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Process Tasks
          </p>
          <ol className="space-y-2">
          {job.tasks.map((op) => {
              const done = op.status === "completed" || op.status === "skipped";
              const current = op.status === "in_progress" || op.status === "ready";
              return (
                <li key={op.id} className="flex items-start gap-2">
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                  ) : current ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-foreground" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{op.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {op.workstation || op.machineName || "-"}
                      {op.completedAt ? ` · ${formatDate(op.completedAt)}` : ` · ${op.completedQuantity}/${op.plannedQuantity}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {job.materialRequirements.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Materials Required
            </p>
            <ul className="space-y-2">
              {job.materialRequirements.map((mr) => (
                <li
                  key={mr.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2"
                >
                  <span className="truncate text-foreground">{mr.inventoryItemName}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {mr.reservedQuantity.toFixed(1)}/{mr.requiredQuantity.toFixed(1)} {mr.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(delayed || materialsPending) && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-[12px]",
              materialsPending
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900",
            )}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  materialsPending ? "text-amber-600" : "text-red-600",
                )}
              />
              <div>
                <p className="font-medium">Blockers / Issues</p>
                <p className="mt-0.5">
                  {materialsPending
                    ? "Low stock or incomplete material reservation."
                    : "This job is past its due date."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Attachments
          </p>
          <div className="space-y-1.5">
            {[
              { id: "job-att-spec", name: "Spec Sheet.pdf", type: "pdf" },
              { id: "job-att-drawing", name: "Drawing.pdf", type: "pdf" },
            ].map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openAttachment(attachment)}
                  title={`Open ${attachment.name}`}
                >
                  <AttachmentIcon
                    type={attachment.type}
                    fileName={attachment.name}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                  <span className="cursor-pointer truncate text-foreground underline-offset-2 hover:underline">
                    {attachment.name}
                  </span>
                </button>
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Download className="h-3.5 w-3.5" />}
                  aria-label={`Download ${attachment.name}`}
                  onClick={() => downloadAttachment(attachment)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
