import { useMemo } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  Layers,
  Pencil,
  Receipt,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import {
  buildSalesOrderFlowSteps,
  canConfirmSalesOrder,
  getConfirmBlockReason,
} from "@/features/sales/lib/salesOrderFlow";
import type { CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";

export function getManufacturingProgress(order: SalesOrder): number {
  if (["ready_for_delivery", "delivered", "completed"].includes(order.status)) {
    return 100;
  }
  if (
    ["draft", "pending_review", "submitted", "confirmed", "cancelled"].includes(
      order.status,
    )
  ) {
    return order.manufacturingJobIds.length > 0 ? 5 : 0;
  }

  const total = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  if (total <= 0) return 0;

  const delivered = order.lineItems.reduce(
    (sum, item) => sum + item.quantityDelivered,
    0,
  );
  const inMfg = order.lineItems.reduce(
    (sum, item) => sum + item.quantityInManufacturing,
    0,
  );

  const percent = ((delivered + inMfg * 0.5) / total) * 100;
  return Math.min(99, Math.max(0, Math.round(percent)));
}

function ManufacturingProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full max-w-[11rem]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Progress</span>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">
          {percent}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Manufacturing progress"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function withManufacturingProgress(steps: StepItem[], order: SalesOrder): StepItem[] {
  const percent = getManufacturingProgress(order);
  const show =
    order.status === "in_manufacturing" ||
    ["ready_for_delivery", "delivered", "completed"].includes(order.status) ||
    percent > 0;

  return steps.map((step) =>
    step.id === "in_manufacturing" && show
      ? { ...step, content: <ManufacturingProgressBar percent={percent} /> }
      : step,
  );
}

export type SalesOrderWorkflowPanelProps = {
  order: SalesOrder | null;
  costing?: CostingRequest | null;
  onEdit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReview?: () => void;
  onApplyCreditNote?: () => void;
  canApplyCreditNote?: boolean;
  isConfirming?: boolean;
  isCancelling?: boolean;
  className?: string;
};

export function SalesOrderWorkflowPanel({
  order,
  costing = null,
  onEdit,
  onCancel,
  onConfirm,
  onReview,
  onApplyCreditNote,
  canApplyCreditNote = false,
  isConfirming,
  isCancelling,
  className,
}: SalesOrderWorkflowPanelProps) {
  const steps = useMemo(
    () => (order ? withManufacturingProgress(buildSalesOrderFlowSteps(order, costing), order) : []),
    [order, costing],
  );

  if (!order) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select an order to view workflow.</p>
      </div>
    );
  }

  const canEdit = order.status === "draft" || order.status === "pending_review";
  const canCancel = !["cancelled", "completed", "delivered"].includes(order.status);
  const canConfirm = canConfirmSalesOrder(order, costing);
  const confirmBlockReason = getConfirmBlockReason(order, costing);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Order Workflow</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quotation → Sales Order → Product Estimation → Approval → Confirm
        </p>
      </div>

      <div className={workspacePanelBody}>
        <Stepper steps={steps} orientation="vertical" />

        {order.quotationId && order.quotationNumber && (
          <section className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Related Quotation
            </p>
            <Link
              to={ROUTES.quotations.detail(order.quotationId)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              {order.quotationNumber}
            </Link>
          </section>
        )}

        {confirmBlockReason && (
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            {confirmBlockReason}
          </p>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </h3>
          <div className="space-y-1.5">
            <Link to={ROUTES.salesOrders.detail(order.id)} className="block">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Open Order Page
              </Button>
            </Link>
            <Link to={ROUTES.estimation.forOrder(order.id)} className="block">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Layers className="h-4 w-4" />}
              >
                Product Estimation
              </Button>
            </Link>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={onEdit}
              >
                Edit Order
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start"
                leftIcon={<X className="h-4 w-4" />}
                loading={isCancelling}
                onClick={onCancel}
              >
                Cancel Order
              </Button>
            )}
            {order.status === "pending_review" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Check className="h-4 w-4" />}
                onClick={onReview}
              >
                Review Order
              </Button>
            )}
            {["draft", "pending_review", "submitted"].includes(order.status) && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Check className="h-4 w-4" />}
                loading={isConfirming}
                disabled={!canConfirm}
                onClick={onConfirm}
              >
                Confirm Order
              </Button>
            )}
            {order.status === "ready_for_delivery" && (
              <Link to={ROUTES.deliveries.new} className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  leftIcon={<Truck className="h-4 w-4" />}
                >
                  Schedule Delivery
                </Button>
              </Link>
            )}
            {onApplyCreditNote && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Receipt className="h-4 w-4" />}
                disabled={!canApplyCreditNote}
              >
                Apply Credit Note
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
