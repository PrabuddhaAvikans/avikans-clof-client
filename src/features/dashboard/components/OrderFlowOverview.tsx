import { ArrowDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/app/config/routes";
import {
  OrderFlowStageCard,
  OrderFlowStageCardSkeleton,
} from "@/features/dashboard/components/OrderFlowStageCard";
import { useOrderFlowOverview } from "@/features/dashboard/hooks/useDashboard";
import { useBreakpoints } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { OrderFlowOverview, OrderFlowStage, OrderFlowStageKey } from "@/types/dashboard";

const STAGE_HREFS: Record<OrderFlowStageKey, string | undefined> = {
  quotation: ROUTES.quotations.list,
  sales_order: ROUTES.salesOrders.list,
  estimation: ROUTES.estimation.workspace,
  costing: ROUTES.costing.workspace,
  production: ROUTES.manufacturing.jobs,
  delivery: ROUTES.deliveries.list,
  completed: ROUTES.salesOrders.list,
};

function stageList(data: OrderFlowOverview): OrderFlowStage[] {
  return [
    data.quotation,
    data.salesOrder,
    data.estimation,
    data.costing,
    data.production,
    data.delivery,
    data.completed,
  ];
}

function HorizontalConnector({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex w-5 shrink-0 items-center self-center sm:w-7", className)}
      aria-hidden
    >
      <div className="flex w-full items-center">
        <span className="h-0 flex-1 border-t-2 border-dashed border-foreground/45" />
        <ChevronRight className="-ml-0.5 h-4 w-4 shrink-0 text-foreground/70" strokeWidth={2.5} />
      </div>
    </div>
  );
}

function VerticalConnector({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-7 w-full flex-col items-center justify-center", className)}
      aria-hidden
    >
      <span className="w-0 flex-1 border-l-2 border-dashed border-foreground/45" />
      <ArrowDown className="-mt-0.5 h-4 w-4 text-foreground/70" strokeWidth={2.5} />
    </div>
  );
}

function WrapConnector() {
  return (
    <div className="relative my-1 h-12 w-full" aria-hidden>
      <svg
        className="h-full w-full overflow-visible text-foreground/55"
        viewBox="0 0 100 48"
        preserveAspectRatio="none"
      >
        <path
          d="M87.5 2 V16 H12.5 V34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <ArrowDown
        className="absolute bottom-0 left-[12.5%] h-4 w-4 -translate-x-1/2 text-foreground/70"
        strokeWidth={2.5}
      />
    </div>
  );
}

function StageRow({
  stages,
  className,
}: {
  stages: OrderFlowStage[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-stretch", className)}>
      {stages.map((stage, index) => (
        <div key={stage.stageKey} className="contents">
          <div className="min-w-0 flex-1">
            <OrderFlowStageCard stage={stage} href={STAGE_HREFS[stage.stageKey]} />
          </div>
          {index < stages.length - 1 ? <HorizontalConnector /> : null}
        </div>
      ))}
    </div>
  );
}

function DesktopFlow({ data }: { data: OrderFlowOverview }) {
  const top = [data.quotation, data.salesOrder, data.estimation, data.costing];
  const bottom = [data.production, data.delivery, data.completed];

  return (
    <div>
      <StageRow stages={top} />
      <WrapConnector />
      <div className="flex items-stretch">
        <div className="min-w-0 flex-[3]">
          <StageRow stages={bottom} />
        </div>
        <div className="min-w-0 flex-1" aria-hidden />
      </div>
    </div>
  );
}

function TabletFlow({ data }: { data: OrderFlowOverview }) {
  const stages = stageList(data);
  const rows = [
    stages.slice(0, 3),
    stages.slice(3, 5),
    stages.slice(5, 7),
  ];

  return (
    <div className="flex flex-col">
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`}>
          <StageRow stages={row} />
          {rowIndex < rows.length - 1 ? <VerticalConnector /> : null}
        </div>
      ))}
    </div>
  );
}

function MobileFlow({ data }: { data: OrderFlowOverview }) {
  const stages = stageList(data);

  return (
    <ol className="relative m-0 list-none space-y-0 p-0 pl-1">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        return (
          <li key={stage.stageKey} className="relative flex gap-3">
            <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden>
              <span
                className={cn(
                  "mt-4 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-foreground/70 bg-card",
                  stage.attentionCount > 0 &&
                    (stage.attentionSeverity === "critical"
                      ? "border-destructive bg-destructive"
                      : "border-warning bg-warning"),
                  stage.stageKey === "completed" && "border-success bg-success",
                )}
              />
              {!isLast ? (
                <span className="mt-1 w-0 flex-1 border-l-2 border-dashed border-foreground/45" />
              ) : null}
            </div>
            <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
              <OrderFlowStageCard stage={stage} href={STAGE_HREFS[stage.stageKey]} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OrderFlowSkeleton({ mode }: { mode: "mobile" | "tablet" | "desktop" }) {
  if (mode === "mobile") {
    return (
      <div className="space-y-3" aria-busy aria-label="Loading order flow">
        {Array.from({ length: 3 }).map((_, index) => (
          <OrderFlowStageCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (mode === "tablet") {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy aria-label="Loading order flow">
        {Array.from({ length: 4 }).map((_, index) => (
          <OrderFlowStageCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-busy aria-label="Loading order flow">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <OrderFlowStageCardSkeleton key={`top-${index}`} />
        ))}
      </div>
      <div className="grid w-3/4 grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <OrderFlowStageCardSkeleton key={`bottom-${index}`} />
        ))}
      </div>
    </div>
  );
}

export function OrderFlowOverview() {
  const { data, isLoading, isError, refetch } = useOrderFlowOverview();
  const { isMobile, isTablet, isDesktop } = useBreakpoints();

  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Order / Sales Process Flow</h2>
          <p className="text-xs text-muted-foreground">
            Live operational map of the order lifecycle
          </p>
        </div>
        {data ? (
          <p className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>

      {isLoading && !data ? (
        <OrderFlowSkeleton
          mode={isMobile ? "mobile" : isTablet ? "tablet" : "desktop"}
        />
      ) : null}

      {isError && !data ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm text-destructive">Could not load process flow.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {data && isDesktop ? <DesktopFlow data={data} /> : null}
      {data && isTablet ? <TabletFlow data={data} /> : null}
      {data && isMobile ? <MobileFlow data={data} /> : null}
    </section>
  );
}
