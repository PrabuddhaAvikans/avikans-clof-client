import { cn } from "@/lib/utils";
import type { OverdueMilestone } from "@/types/production-tracking";
import { PRODUCTION_STAGE_LABELS } from "@/types/production-tracking";

export type OverdueMilestonesProps = {
  items: OverdueMilestone[];
  selectedId?: string | null;
  onSelect?: (jobId: string) => void;
  className?: string;
};

export function OverdueMilestones({
  items,
  selectedId,
  onSelect,
  className,
}: OverdueMilestonesProps) {
  const maxDays = Math.max(...items.map((item) => item.overdueDays), 1);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Overdue
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground">{items.length}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Clear</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item.jobId)}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] items-center gap-2 px-0 py-1 text-left transition-colors hover:bg-muted/50",
                  selectedId === item.jobId && "bg-muted/70",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground">
                      {item.jobNumber}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {PRODUCTION_STAGE_LABELS[item.stage]}
                    </span>
                  </div>
                  <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-red-100">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(item.overdueDays / maxDays) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-red-600">
                  {item.overdueDays}d
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
