import { cn } from "@/lib/utils";
import type { PipelineStageCount } from "@/types/production-tracking";

export type ProductionPipelineProps = {
  stages: PipelineStageCount[];
  className?: string;
};

export function ProductionPipeline({ stages, className }: ProductionPipelineProps) {
  const max = Math.max(...stages.map((stage) => stage.count), 1);
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline · {total}
        </p>
        <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          {stages.map((stage, index) => (
            <div
              key={stage.stage}
              title={`${stage.label}: ${stage.count}`}
              className={cn("h-full", index % 2 === 0 ? "bg-foreground" : "bg-neutral-500")}
              style={{ width: `${(stage.count / total) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {stages.map((stage) => (
          <div key={stage.stage} className="min-w-0 border border-border bg-card px-1.5 py-1.5">
            <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {stage.label}
            </p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {stage.count}
              </span>
              <div className="mb-0.5 h-5 flex-1">
                <div
                  className="w-full rounded-sm bg-foreground/80"
                  style={{ height: `${Math.max(14, (stage.count / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
