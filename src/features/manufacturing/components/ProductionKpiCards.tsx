import { cn } from "@/lib/utils";
import type { ProductionKpis } from "@/types/production-tracking";

export type ProductionKpiCardsProps = {
  kpis: ProductionKpis;
  className?: string;
};

const METRICS: {
  key: keyof ProductionKpis;
  trendKey: keyof ProductionKpis;
  label: string;
}[] = [
  { key: "jobsInProduction", trendKey: "jobsInProductionTrend", label: "In production" },
  { key: "onHold", trendKey: "onHoldTrend", label: "On hold" },
  { key: "inQualityCheck", trendKey: "inQualityCheckTrend", label: "In QC" },
  { key: "readyToShip", trendKey: "readyToShipTrend", label: "Ready to ship" },
];

export function ProductionKpiCards({ kpis, className }: ProductionKpiCardsProps) {
  const max = Math.max(
    kpis.jobsInProduction,
    kpis.onHold,
    kpis.inQualityCheck,
    kpis.readyToShip,
    1,
  );

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {METRICS.map((metric) => {
        const value = kpis[metric.key] as number;
        const trend = kpis[metric.trendKey] as number;
        const width = Math.round((value / max) * 100);
        return (
          <div
            key={metric.key}
            className="min-w-0 border border-border bg-card px-2.5 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </p>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {trend >= 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            </div>
            <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
