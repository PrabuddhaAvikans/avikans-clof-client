import { cn } from "@/lib/utils";
import type { TimelineBlock } from "@/types/production-tracking";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);
const DAY_START = 7;
const DAY_SPAN = 11;

export type ProductionTimelineProps = {
  blocks: TimelineBlock[];
  lines: string[];
  selectedJobId?: string | null;
  onSelectJob?: (jobId: string) => void;
  className?: string;
};

export function ProductionTimeline({
  blocks,
  lines,
  selectedJobId,
  onSelectJob,
  className,
}: ProductionTimelineProps) {
  const nowHour = 13.5;
  const nowLeft = ((nowHour - DAY_START) / DAY_SPAN) * 100;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Daily timeline
        </p>
        <p className="text-[10px] text-muted-foreground">07:00–18:00</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px] space-y-1.5">
          <div className="grid grid-cols-[64px_1fr] gap-2">
            <div />
            <div className="relative grid grid-cols-12 text-[9px] tabular-nums text-muted-foreground">
              {HOURS.map((hour) => (
                <span key={hour} className="text-center">
                  {String(hour).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>

          {lines.map((line) => {
            const lineBlocks = blocks.filter((block) => block.line === line);
            return (
              <div key={line} className="grid grid-cols-[64px_1fr] items-center gap-2">
                <p className="truncate text-[11px] font-medium text-foreground">{line}</p>
                <div className="relative h-8 border-y border-border bg-[linear-gradient(to_right,transparent_calc(100%/12-1px),var(--border)_calc(100%/12-1px),var(--border)_calc(100%/12),transparent_calc(100%/12))] bg-[length:calc(100%/12)_100%]">
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground"
                    style={{ left: `${nowLeft}%` }}
                    aria-hidden
                  />
                  {lineBlocks.map((block) => {
                    const left = ((block.startHour - DAY_START) / DAY_SPAN) * 100;
                    const width = ((block.endHour - block.startHour) / DAY_SPAN) * 100;
                    const selected = selectedJobId === block.jobId;
                    return (
                      <button
                        key={block.id}
                        type="button"
                        title={`${block.jobNumber} · ${block.label}`}
                        onClick={() => onSelectJob?.(block.jobId)}
                        className={cn(
                          "absolute top-1 flex h-6 items-center overflow-hidden px-1.5 text-left",
                          selected
                            ? "bg-foreground text-background"
                            : "bg-neutral-800 text-white hover:bg-neutral-700",
                        )}
                        style={{ left: `${left}%`, width: `${Math.max(width, 3.5)}%` }}
                      >
                        <span className="truncate text-[9px] font-medium leading-none">
                          {block.jobNumber.replace("JOB-", "")} {block.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
