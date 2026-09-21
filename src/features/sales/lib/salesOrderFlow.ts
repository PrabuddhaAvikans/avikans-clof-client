import type { StepItem, StepStatus } from "@/components/ui/Stepper";
import type { CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import type { SalesOrderStatusValue } from "@/types/status";

export const SALES_ORDER_FLOW = [
  { id: "quotation", label: "Quotation" },
  { id: "sales_order", label: "Sales Order" },
  { id: "coating", label: "Product Estimation" },
  { id: "costing_approval", label: "Costing Approval" },
  { id: "confirmed", label: "Confirmed" },
  { id: "in_manufacturing", label: "Manufacturing" },
  { id: "ready_for_delivery", label: "Ready to Ship" },
  { id: "delivered", label: "Delivered" },
  { id: "completed", label: "Completed" },
] as const;

const FULFILLMENT_ORDER: SalesOrderStatusValue[] = [
  "confirmed",
  "in_manufacturing",
  "ready_for_delivery",
  "delivered",
  "completed",
];

export function getSalesOrderOriginLabel(
  order: Pick<SalesOrder, "quotationId" | "quotationNumber"> | null | undefined,
): string {
  if (!order) return "Sales order";
  if (order.quotationNumber) return `From quotation ${order.quotationNumber}`;
  if (order.quotationId) return "From quotation";
  return "Direct sales order";
}

export function isCostingApproved(costing: CostingRequest | null | undefined): boolean {
  return costing?.status === "approved";
}

export function isCoatingSubmitted(costing: CostingRequest | null | undefined): boolean {
  return costing?.coatingStatus === "submitted" || costing?.coatingStatus === "skipped";
}

export function canConfirmSalesOrder(
  order: SalesOrder | null | undefined,
  costing: CostingRequest | null | undefined,
): boolean {
  if (!order) return false;
  if (!["draft", "pending_review", "submitted"].includes(order.status)) return false;
  return isCostingApproved(costing);
}

export function getConfirmBlockReason(
  order: SalesOrder | null | undefined,
  costing: CostingRequest | null | undefined,
): string | null {
  if (!order || !["draft", "pending_review", "submitted"].includes(order.status)) {
    return null;
  }
  if (!costing) {
    return "Create estimation and costing for this sales order first.";
  }
  if (costing.coatingStatus === "pending") {
    return "Product estimation is still pending. Submit it, or regenerate BOM from the sales order.";
  }
  if (costing.status !== "approved") {
    return "Costing must be approved before confirming this order.";
  }
  return null;
}

function normalizeFulfillmentStatus(status: SalesOrderStatusValue): SalesOrderStatusValue {
  if (status === "pending_review" || status === "submitted") return "draft";
  if (status === "partially_delivered") return "delivered";
  return status;
}

export function resolveSalesOrderFlowIndex(
  order: SalesOrder,
  costing: CostingRequest | null | undefined,
): number {
  const status = normalizeFulfillmentStatus(order.status);
  const fulfillmentIndex = FULFILLMENT_ORDER.indexOf(status);

  if (fulfillmentIndex >= 0) {
    return 4 + fulfillmentIndex;
  }

  if (isCostingApproved(costing)) return 4;
  if (isCoatingSubmitted(costing)) return 3;
  if (costing) return 2;
  return 1;
}

function flowStepStatus(
  index: number,
  currentIndex: number,
  isError: boolean,
): StepStatus {
  if (isError && index === currentIndex) return "error";
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "pending";
}

export function buildSalesOrderFlowSteps(
  order: SalesOrder,
  costing: CostingRequest | null | undefined,
): StepItem[] {
  if (order.status === "cancelled") {
    return [
      { id: "sales_order", label: "Sales Order", status: "completed" },
      { id: "cancelled", label: "Cancelled", status: "error" },
      { id: "completed", label: "Completed", status: "pending" },
    ];
  }

  const currentIndex = resolveSalesOrderFlowIndex(order, costing);
  const costingRejected = costing?.status === "rejected";
  const costingChanges = costing?.status === "changes_requested";

  return SALES_ORDER_FLOW.map((step, index) => {
    let description: string | undefined;
    let status = flowStepStatus(
      index,
      currentIndex,
      (step.id === "costing_approval" && costingRejected) ||
        (step.id === "coating" && costingChanges),
    );

    if (step.id === "quotation") {
      description = order.quotationNumber ?? "Direct (no quotation)";
      if (order.quotationId) status = index < currentIndex || currentIndex > 0 ? "completed" : status;
    }

    if (step.id === "sales_order") {
      description = order.orderNumber;
    }

    if (step.id === "coating") {
      if (!costing) description = "Not created";
      else if (costing.coatingStatus === "pending") description = "Awaiting estimation";
      else if (costing.coatingStatus === "skipped") description = "Not required";
      else if (costing.estimationProductLines.length > 0) {
        description = order.quotationId ? "BOM from quotation" : "BOM from product";
      }
      else description = "Submitted";
    }

    if (step.id === "costing_approval") {
      if (!costing) description = "Waiting for estimation";
      else if (costing.coatingStatus === "pending") description = "Waiting for estimation";
      else if (costing.status === "approved") description = costing.requestNumber;
      else if (costing.status === "rejected") description = "Rejected";
      else if (costing.status === "changes_requested") description = "Changes requested";
      else description = "In review";
    }

    return {
      id: step.id,
      label: step.label,
      description,
      status,
    };
  });
}
