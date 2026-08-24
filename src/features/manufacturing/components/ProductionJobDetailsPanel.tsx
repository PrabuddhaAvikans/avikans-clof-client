import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductionJob } from "@/types/production-tracking";

export type ProductionJobDetailsPanelProps = {
  job: ProductionJob | null;
  onUpdateStage?: () => void;
  updating?: boolean;
  className?: string;
};

function statusVariantForJob(status: ProductionJob["status"]) {
  if (status === "on_hold") return "danger" as const;
  if (status === "completed") return "success" as const;
  if (status === "quality_check" || status === "rework") return "warning" as const;
  return "default" as const;
}

export function ProductionJobDetailsPanel({
  job,
  onUpdateStage,
  updating = false,
  className,
}: ProductionJobDetailsPanelProps) {
  if (!job) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center p-4 text-center text-[12px] text-muted-foreground",
          className,
        )}
      >
        Select a job
      </div>
    );
  }

  const variance = job.materialIssued - job.materialConsumed;
  const materialPct =
    job.materialIssued > 0
      ? Math.round((job.materialConsumed / job.materialIssued) * 100)
      : 0;
  const timeTotal = job.elapsedHours + job.remainingHours || 1;
  const timePct = Math.round((job.elapsedHours / timeTotal) * 100);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Job detail
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{job.jobNumber}</p>
        </div>
        <StatusBadge variant={statusVariantForJob(job.status)} size="sm">
          {job.statusLabel}
        </StatusBadge>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3 text-[12px]">
        <div className="flex gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{job.productName}</p>
            <p className="text-[10px] text-muted-foreground">{job.productSku}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
              <Meta label="Qty" value={String(job.quantity)} />
              <Meta label="Line" value={job.line.replace("Line ", "L")} />
              <Meta label="Lead" value={job.supervisorName} />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="uppercase tracking-wider text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">{job.completionPercent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground"
              style={{ width: `${job.completionPercent}%` }}
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Tasks
          </p>
          <ol className="space-y-1">
            {job.stages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2">
                {stage.status === "completed" ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-foreground" />
                ) : stage.status === "in_progress" || stage.status === "ready" ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-foreground" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[11px]",
                    stage.status === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {stage.name}
                </span>
                <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                  {stage.completedQuantity}/{stage.plannedQuantity}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border">
          <Stat
            title="Material"
            primary={`${materialPct}% used`}
            secondary={`Iss ${job.materialIssued} · Con ${job.materialConsumed} · Var ${variance > 0 ? "+" : ""}${variance}`}
            bar={materialPct}
          />
          <Stat
            title="Time"
            primary={`${timePct}% elapsed`}
            secondary={
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {job.elapsedHours}h / {job.remainingHours}h left
              </span>
            }
            bar={timePct}
          />
          <Stat
            title="Labor"
            primary={`${job.laborHours}h`}
            secondary={formatCurrency(job.laborCost, "LKR")}
          />
          <Stat
            title="Quality"
            primary={`${job.qualityOpen} open`}
            secondary={`${job.qualityClosed} closed`}
          />
        </div>

        {job.blockers.length > 0 && (
          <div className="space-y-1 border border-amber-200 bg-amber-50 p-2 text-amber-900">
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
              Blockers
            </p>
            {job.blockers.map((blocker) => (
              <p key={blocker} className="flex items-start gap-1.5 text-[11px]">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                {blocker}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={onUpdateStage}
          loading={updating}
          disabled={job.status === "completed" || job.status === "cancelled"}
        >
          Open Tasks
        </Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function Stat({
  title,
  primary,
  secondary,
  bar,
}: {
  title: string;
  primary: string;
  secondary: ReactNode;
  bar?: number;
}) {
  return (
    <div className="bg-card p-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold text-foreground">{primary}</p>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{secondary}</div>
      {bar !== undefined && (
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-foreground" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
