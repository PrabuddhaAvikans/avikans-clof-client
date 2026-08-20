import { Link } from "react-router-dom";
import { Calculator, Layers, Plus } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import {
  canConfirmSalesOrder,
  getConfirmBlockReason,
} from "@/features/sales/lib/salesOrderFlow";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import { CoatingStatus, CostingRequestStatus } from "@/types/status";

export type SalesOrderCostingPanelProps = {
  order: SalesOrder | null;
  costing: CostingRequest | null;
  onCreateCosting?: () => void;
  isCreating?: boolean;
  className?: string;
};

export function SalesOrderCostingPanel({
  order,
  costing,
  onCreateCosting,
  isCreating,
  className,
}: SalesOrderCostingPanelProps) {
  if (!order) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select an order to view costing.</p>
      </div>
    );
  }

  const coatingTotal = costing?.coatingItems.reduce((sum, item) => sum + item.lineTotal, 0) ?? 0;
  const confirmReady = canConfirmSalesOrder(order, costing);
  const blockReason = getConfirmBlockReason(order, costing);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Estimation & Costing</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Required before order confirmation
        </p>
      </div>

      <div className={workspacePanelBody}>
        {!costing ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This sales order has no estimation or costing request yet.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              loading={isCreating}
              onClick={onCreateCosting}
            >
              Create estimation request
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">1. Estimation</p>
                <div className="mt-1">
                  <MappedStatusBadge statusMap={CoatingStatus} value={costing.coatingStatus} dot />
                </div>
                <p className="mt-2 text-sm tabular-nums font-medium">
                  {formatCurrency(coatingTotal, costing.currency)}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">2. Approval</p>
                <div className="mt-1">
                  <MappedStatusBadge statusMap={CostingRequestStatus} value={costing.status} dot />
                </div>
                <p className="mt-2 text-sm tabular-nums font-medium">
                  {formatCurrency(costing.totalEstimate, costing.currency)}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">3. Confirm</p>
                <p className="mt-2 text-sm font-medium">
                  {confirmReady ? "Ready" : "Locked"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {confirmReady ? "Costing approved" : "Awaiting approval"}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{costing.requestNumber}</p>

            {blockReason && (
              <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                {blockReason}
              </p>
            )}
            {confirmReady && (
              <p className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                Costing approved. This order can be confirmed.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link to={ROUTES.estimation.forOrder(order.id)}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Layers className="h-4 w-4" />}
                >
                  Open estimation
                </Button>
              </Link>
              <Link to={ROUTES.costing.forOrder(order.id)}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Calculator className="h-4 w-4" />}
                  disabled={costing.coatingStatus === "pending"}
                >
                  Open approval
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
