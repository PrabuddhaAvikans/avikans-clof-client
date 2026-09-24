import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Factory } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductionDailySnapshot } from "@/types/period-close";

function rowTone(snap: ProductionDailySnapshot): "completed" | "partial" | "open" {
  if (snap.jobStatus === "completed" || snap.progressPercentage >= 100) return "completed";
  if (snap.partialQty > 0 || (snap.progressPercentage > 0 && snap.progressPercentage < 100)) {
    return "partial";
  }
  return "open";
}

function statusLabel(snap: ProductionDailySnapshot): string {
  if (snap.jobStatus === "completed") return "Completed";
  if (snap.taskStatus === "completed" || snap.progressPercentage >= 100) return "Done";
  if (snap.taskStatus === "in_progress") return "In progress";
  if (snap.taskStatus === "ready" || snap.taskStatus === "on_hold") return "Paused";
  return snap.taskStatus ?? snap.jobStatus ?? "Open";
}

export function DayProductionPanel({
  snapshots,
  className,
}: {
  snapshots: ProductionDailySnapshot[];
  isOpenDay?: boolean;
  activeSessionCount?: number;
  className?: string;
}) {
  if (snapshots.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border px-4 py-10 text-center",
          className,
        )}
      >
        <Factory className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">No production activity</p>
        <Link
          to={ROUTES.manufacturing.jobs}
          className="mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
        >
          Open production jobs
        </Link>
      </div>
    );
  }

  const completed = snapshots.filter((s) => rowTone(s) === "completed");
  const inProgress = snapshots.filter((s) => rowTone(s) !== "completed");

  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      <Section title="Completed" count={completed.length} empty="None yet.">
        {completed.map((snap) => (
          <ProductionRow key={snap.id} snap={snap} />
        ))}
      </Section>
      <Section title="In progress" count={inProgress.length} empty="All work finished.">
        {inProgress.map((snap) => (
          <ProductionRow key={snap.id} snap={snap} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">{children}</ul>
      )}
    </section>
  );
}

function ProductionRow({ snap }: { snap: ProductionDailySnapshot }) {
  const tone = rowTone(snap);
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            to={ROUTES.manufacturing.jobDetail(snap.productionOrderId)}
            className="font-medium tabular-nums underline-offset-2 hover:underline"
          >
            {snap.productionOrderNumber}
          </Link>
          <span className="text-muted-foreground">{snap.operationName}</span>
          {snap.workerName && (
            <span className="text-xs text-muted-foreground">· {snap.workerName}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {snap.completedQty}/{snap.totalQty} · {formatPercent(snap.progressPercentage)}
        </p>
      </div>
      <StatusBadge
        variant={
          tone === "completed" ? "success" : tone === "partial" ? "warning" : "info"
        }
        dot
      >
        {statusLabel(snap)}
      </StatusBadge>
    </li>
  );
}
