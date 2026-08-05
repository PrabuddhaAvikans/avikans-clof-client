import { useMemo } from "react";
import {
  Check,
  FileText,
  Pencil,
  Truck,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepItem, type StepStatus } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import type { SalesOrder } from "@/types/sales-order";
import type { SalesOrderStatusValue } from "@/types/status";

const WORKFLOW_ORDER: SalesOrderStatusValue[] = [
  "draft",
  "confirmed",
  "in_manufacturing",
  "ready_for_delivery",
  "delivered",
  "completed",
];

const WORKFLOW_LABELS: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  in_manufacturing: "Manufacturing",
  ready_for_delivery: "Ready to Ship",
  delivered: "Delivered",
  completed: "Completed",
};

function normalizeStatus(status: SalesOrderStatusValue): SalesOrderStatusValue {
  if (status === "pending_review" || status === "submitted") return "draft";
  if (status === "partially_delivered") return "delivered";
  return status;
}

/** Manufacturing progress 0–100, shown only under the Manufacturing step. */
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

  // Delivered units = complete; units still in manufacturing count as half-done.
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

function buildWorkflowSteps(order: SalesOrder): StepItem[] {
  const status = order.status;

  if (status === "cancelled") {
    return [
      { id: "draft", label: "Draft", status: "completed" },
      { id: "cancelled", label: "Cancelled", status: "error" },
      { id: "completed", label: "Completed", status: "pending" },
    ];
  }

  const normalized = normalizeStatus(status);
  const currentIndex = WORKFLOW_ORDER.indexOf(normalized);
  const manufacturingPercent = getManufacturingProgress(order);
  const showMfgProgress =
    normalized === "in_manufacturing" ||
    currentIndex > WORKFLOW_ORDER.indexOf("in_manufacturing") ||
    manufacturingPercent > 0;

  return WORKFLOW_ORDER.map((id, index) => {
    let stepStatus: StepStatus = "pending";
    if (currentIndex > index) stepStatus = "completed";
    else if (currentIndex === index) stepStatus = "current";

    return {
      id,
      label: WORKFLOW_LABELS[id],
      status: stepStatus,
      content:
        id === "in_manufacturing" && showMfgProgress ? (
          <ManufacturingProgressBar percent={manufacturingPercent} />
        ) : undefined,
    };
  });
}

export type SalesOrderWorkflowPanelProps = {
  order: SalesOrder | null;
  onEdit?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onReview?: () => void;
  isConfirming?: boolean;
  isCancelling?: boolean;
  className?: string;
};

export function SalesOrderWorkflowPanel({
  order,
  onEdit,
  onCancel,
  onConfirm,
  onReview,
  isConfirming,
  isCancelling,
  className,
}: SalesOrderWorkflowPanelProps) {
  const steps = useMemo(
    () => (order ? buildWorkflowSteps(order) : []),
    [order],
  );

  if (!order) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-lg border border-border bg-card p-8 shadow-xs",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">Select an order to view workflow.</p>
      </div>
    );
  }

  const canEdit = order.status === "draft" || order.status === "pending_review";
  const canCancel = !["cancelled", "completed", "delivered"].includes(order.status);
  const canConfirm =
    order.status === "draft" ||
    order.status === "pending_review" ||
    order.status === "submitted";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Order Workflow</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
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

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </h3>
          <div className="space-y-1.5">
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
            {canConfirm && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Check className="h-4 w-4" />}
                loading={isConfirming}
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
          </div>
        </section>
      </div>
    </div>
  );
}
