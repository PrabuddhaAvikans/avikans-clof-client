import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  Calculator,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { OrderFlowSeverity, OrderFlowStage, OrderFlowStageKey } from "@/types/dashboard";
import { OrderFlowInfoTicker } from "@/features/dashboard/components/OrderFlowInfoTicker";

type StageVisual = {
  icon: LucideIcon;
  iconClass: string;
  completed?: boolean;
};

const STAGE_VISUALS: Record<OrderFlowStageKey, StageVisual> = {
  quotation: {
    icon: FileText,
    iconClass: "bg-info/10 text-info",
  },
  sales_order: {
    icon: ClipboardList,
    iconClass: "bg-teal/10 text-teal",
  },
  estimation: {
    icon: Box,
    iconClass: "bg-warning/15 text-warning",
  },
  costing: {
    icon: Calculator,
    iconClass: "bg-muted text-foreground",
  },
  production: {
    icon: Factory,
    iconClass: "bg-success/10 text-success",
  },
  delivery: {
    icon: Truck,
    iconClass: "bg-info/10 text-info",
  },
  completed: {
    icon: CheckCircle2,
    iconClass: "bg-success/15 text-success",
    completed: true,
  },
};

function severityTextClass(severity: OrderFlowSeverity): string {
  switch (severity) {
    case "critical":
      return "text-destructive";
    case "warning":
      return "text-warning";
    case "pending":
      return "text-warning";
    case "success":
      return "text-success";
    case "info":
      return "text-info";
    default:
      return "text-muted-foreground";
  }
}

function attentionBadgeClass(severity: OrderFlowSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "warning":
    case "pending":
      return "bg-warning/10 text-warning border-warning/25";
    case "info":
      return "bg-info/10 text-info border-info/20";
    case "success":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export type OrderFlowStageCardProps = {
  stage: OrderFlowStage;
  href?: string;
  className?: string;
};

export function OrderFlowStageCard({ stage, href, className }: OrderFlowStageCardProps) {
  const visual = STAGE_VISUALS[stage.stageKey];
  const Icon = visual.icon;
  const showAttention = stage.attentionCount > 0;

  const body = (
    <div
      className={cn(
        "group relative flex h-full min-h-[11.5rem] flex-col rounded-xl border-2 border-dashed bg-card p-3 transition-colors sm:min-h-[12rem]",
        visual.completed
          ? "border-success/50 hover:border-success/70"
          : "border-foreground/20 hover:border-foreground/40 hover:bg-muted/20",
        href && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            visual.iconClass,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {showAttention ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 h-2 w-2 rounded-full",
                stage.attentionSeverity === "critical" ? "bg-destructive" : "bg-warning",
              )}
              aria-hidden
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{stage.title}</h3>
              <p className="truncate text-[11px] text-muted-foreground">{stage.summaryText}</p>
            </div>
            <p className="shrink-0 text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
              {stage.total}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {stage.stats.map((stat) => (
          <div key={stat.key} className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className={cn("text-sm font-semibold tabular-nums", severityTextClass(stat.severity))}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-2 pt-3">
        {showAttention ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              attentionBadgeClass(stage.attentionSeverity),
            )}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {stage.attentionCount} need attention
          </span>
        ) : (
          <span className="inline-flex h-[22px] items-center text-[11px] text-muted-foreground">
            {stage.stageKey === "completed" ? "End of flow" : "No alerts"}
          </span>
        )}
        <OrderFlowInfoTicker messages={stage.messages} />
      </div>
    </div>
  );

  if (!href) return body;

  return (
    <Link to={href} className="block h-full min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring" title={stage.title}>
      {body}
    </Link>
  );
}

export function OrderFlowStageCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[11.5rem] flex-col rounded-xl border-2 border-dashed border-foreground/20 bg-card p-3",
        className,
      )}
      aria-busy
      aria-label="Loading stage"
    >
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-7 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-auto pt-3">
        <div className="h-6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
