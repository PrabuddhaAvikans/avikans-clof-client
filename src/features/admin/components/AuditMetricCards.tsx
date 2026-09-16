import { AlertTriangle, CalendarDays, ScrollText, ShieldAlert } from "lucide-react";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { cn } from "@/lib/utils";
import type { AuditLogSummary } from "@/types/audit";

type MetricId = "all" | "today" | "warning" | "critical";

export function AuditMetricCards({
  summary,
  active,
  onSelect,
}: {
  summary?: AuditLogSummary;
  active: MetricId;
  onSelect: (id: MetricId) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <button type="button" className="text-left" onClick={() => onSelect("all")}>
        <SummaryCard
          className={cn(active === "all" && "border-foreground/25")}
          title="Events"
          value={summary?.total ?? 0}
          description="Matching current filters"
          icon={<ScrollText className="h-4 w-4" />}
        />
      </button>
      <button type="button" className="text-left" onClick={() => onSelect("today")}>
        <SummaryCard
          className={cn(active === "today" && "border-foreground/25")}
          title="Today"
          value={summary?.today ?? 0}
          description="Recorded today"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </button>
      <button type="button" className="text-left" onClick={() => onSelect("warning")}>
        <SummaryCard
          className={cn(active === "warning" && "border-foreground/25")}
          title="Warnings"
          value={summary?.warning ?? 0}
          description="Permission and data changes"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </button>
      <button type="button" className="text-left" onClick={() => onSelect("critical")}>
        <SummaryCard
          className={cn(active === "critical" && "border-foreground/25")}
          title="Critical"
          value={summary?.critical ?? 0}
          description="Security and failed access"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </button>
    </div>
  );
}
