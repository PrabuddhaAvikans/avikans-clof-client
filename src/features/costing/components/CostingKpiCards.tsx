import {
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  TrendingUp,
} from "lucide-react";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { formatCurrency, formatPercent } from "@/lib/format";
import { resolveStatus } from "@/lib/status-badge";
import type { CostingRequest } from "@/types/costing";
import { CostingRiskFlag } from "@/types/status";

export type CostingKpiCardsProps = {
  request: CostingRequest | null;
  className?: string;
};

export function CostingKpiCards({ request, className }: CostingKpiCardsProps) {
  const currency = request?.currency ?? "LKR";

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          title="Estimated Cost"
          value={request ? formatCurrency(request.totalEstimate, currency) : "—"}
          icon={<DollarSign className="h-4 w-4" />}
          description={request ? request.requestNumber : "Select a request"}
        />
        <SummaryCard
          title="Proposed Price"
          value={request ? formatCurrency(request.proposedPrice, currency) : "—"}
          icon={<TrendingUp className="h-4 w-4" />}
          description={
            request
              ? `Target margin ${formatPercent(request.targetMargin)}`
              : undefined
          }
        />
        <SummaryCard
          title="Margin %"
          value={request ? formatPercent(request.marginPercent) : "—"}
          icon={<Percent className="h-4 w-4" />}
          description={
            request && request.marginPercent >= request.targetMargin
              ? "Above target"
              : request
                ? "Below target"
                : undefined
          }
        />
        <SummaryCard
          title="Risk Flag"
          value={
            request
              ? resolveStatus(CostingRiskFlag, request.riskFlag).label
              : "—"
          }
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <SummaryCard
          title="SLA Timer"
          value={request?.slaRemaining ?? "—"}
          icon={<Clock className="h-4 w-4" />}
          description={
            request?.slaRemaining.includes("Overdue")
              ? "Action required"
              : request?.slaRemaining === "Completed"
                ? "SLA met"
                : undefined
          }
        />
      </div>
    </div>
  );
}
