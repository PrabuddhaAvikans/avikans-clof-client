import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Check,
  ExternalLink,
  Layers,
  Calculator,
  Pencil,
  Receipt,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { Stepper, type StepItem } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import { workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
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
    <div
      className="h-1 w-full max-w-[7.5rem] overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Manufacturing progress"
    >
      <div
        className="h-full rounded-full bg-foreground transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
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
      ? {
          ...step,
          description: `${percent}%`,
          content: <ManufacturingProgressBar percent={percent} />,
        }
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentStepId = steps.find((step) => step.status === "current" || step.status === "error")?.id;

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !currentStepId) return;

    const current = scroller.querySelector<HTMLElement>(
      '[data-status="current"], [data-status="error"]',
    );
    if (!current) return;

    const top = current.offsetTop - 8;
    const bottom = current.offsetTop + current.offsetHeight + 8;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;

    if (top < viewTop || bottom > viewBottom) {
      scroller.scrollTo({ top: Math.max(0, top) });
    }
  }, [currentStepId, order?.id]);

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
    <div className={cn(workspacePanelShell, "min-h-0 overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <h2 className="text-sm font-semibold text-foreground" title="Order Workflow">
          Order Workflow
        </h2>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {steps.filter((step) => step.status === "completed").length}/{steps.length}
        </span>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3"
      >
        <Stepper steps={steps} orientation="vertical" />

        {confirmBlockReason && (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            {confirmBlockReason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1.5 border-t border-border px-3.5 py-2.5 text-[12px]">
          <Link
            to={ROUTES.salesOrders.detail(order.id)}
            className="inline-flex items-center gap-1 text-foreground hover:underline"
            title="Open order page"
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden />
            Order page
          </Link>
          <Link
            to={ROUTES.costing.forOrder(order.id)}
            className="inline-flex items-center gap-1 text-foreground hover:underline"
            title="Costing approval"
          >
            <Calculator className="h-3 w-3 text-muted-foreground" aria-hidden />
            Approval
          </Link>
          <Link
            to={ROUTES.estimation.forOrder(order.id)}
            className="inline-flex items-center gap-1 text-foreground hover:underline"
            title="Product estimation"
          >
            <Layers className="h-3 w-3 text-muted-foreground" aria-hidden />
            Estimation
          </Link>
          {canEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-foreground hover:underline"
              title="Edit order"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3 text-muted-foreground" aria-hidden />
              Edit
            </button>
          )}
          {order.status === "pending_review" && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-foreground hover:underline"
              title="Review order"
              onClick={onReview}
            >
              <Check className="h-3 w-3 text-muted-foreground" aria-hidden />
              Review
            </button>
          )}
          {["draft", "pending_review", "submitted"].includes(order.status) && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline"
              title="Confirm order"
              disabled={!canConfirm || isConfirming}
              onClick={onConfirm}
            >
              Confirm
            </button>
          )}
          {order.status === "ready_for_delivery" && (
            <Link
              to={ROUTES.deliveries.new}
              className="inline-flex items-center gap-1 text-foreground hover:underline"
              title="Schedule delivery"
            >
              <Truck className="h-3 w-3 text-muted-foreground" aria-hidden />
              Delivery
            </Link>
          )}
          {onApplyCreditNote && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline"
              title="Apply credit note"
              disabled={!canApplyCreditNote}
            >
              <Receipt className="h-3 w-3 text-muted-foreground" aria-hidden />
              Credit note
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
              title="Cancel order"
              disabled={isCancelling}
              onClick={onCancel}
            >
              <X className="h-3 w-3" aria-hidden />
              Cancel
            </button>
          )}
      </div>
    </div>
  );
}
