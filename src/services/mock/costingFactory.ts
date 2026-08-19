import { generateId, nowIso } from "@/services/http";
import type {
  CoatingLineItem,
  CostingLineItem,
  CostingRequest,
} from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import type { CoatingStatusValue, CostingRequestStatusValue } from "@/types/status";

const DEFAULT_APPROVERS = [
  { role: "Cost Engineer", assigneeName: "Ruwan Bandara" },
  { role: "Sales Manager", assigneeName: "Nadeesha Fernando" },
  { role: "Finance Director", assigneeName: "Asanka Perera" },
];

export type CoatingItemInput = Omit<CoatingLineItem, "id" | "lineTotal"> & {
  id?: string;
  lineTotal?: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function recomputeCostingTotals(request: CostingRequest): CostingRequest {
  const totalEstimate = round2(
    request.lineItems.reduce((sum, item) => sum + item.baseCost, 0),
  );
  const lineItems = request.lineItems.map((item) => ({
    ...item,
    percentOfCost: totalEstimate > 0 ? round2((item.baseCost / totalEstimate) * 100) : 0,
  }));
  const marginPercent =
    request.proposedPrice > 0
      ? round2(((request.proposedPrice - totalEstimate) / request.proposedPrice) * 100)
      : 0;

  return {
    ...request,
    lineItems,
    totalEstimate,
    marginPercent,
  };
}

export function normalizeCostingRequest(request: CostingRequest): CostingRequest {
  return {
    ...request,
    coatingStatus: request.coatingStatus ?? "submitted",
    coatingItems: request.coatingItems ?? [],
  };
}

export function buildCoatingItemsFromOrder(order: SalesOrder): CoatingLineItem[] {
  return order.lineItems.map((item, index) => ({
    id: `coat-${order.id}-${index + 1}`,
    productId: item.productId,
    productName: item.productName,
    finish: "Powder Coating",
    process: "Batch spray",
    quantity: item.quantity,
    unitCost: 0,
    lineTotal: 0,
  }));
}

export function applyCoatingItems(
  request: CostingRequest,
  items: CoatingItemInput[],
): CostingRequest {
  const coatingItems: CoatingLineItem[] = items.map((item, index) => {
    const unitCost = Number(item.unitCost) || 0;
    const quantity = Number(item.quantity) || 0;
    return {
      id: item.id ?? `coat-${index + 1}`,
      productId: item.productId,
      productName: item.productName,
      finish: item.finish,
      process: item.process,
      quantity,
      unitCost,
      lineTotal: round2(unitCost * quantity),
    };
  });

  const coatingTotal = coatingItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const withoutCoating = request.lineItems.filter((item) => item.category !== "Coating");
  const lineItems: CostingLineItem[] = [
    ...withoutCoating,
    {
      id: generateId("cli"),
      description: "Powder coating & surface finish",
      category: "Coating",
      baseCost: coatingTotal,
      percentOfCost: 0,
    },
  ];

  return recomputeCostingTotals({
    ...request,
    coatingItems,
    lineItems,
  });
}

export function buildCostingFromSalesOrder(
  order: SalesOrder,
  options?: {
    requestNumber?: string;
    coatingStatus?: CoatingStatusValue;
    status?: CostingRequestStatusValue;
    coatingUnitCost?: number;
  },
): CostingRequest {
  const coatingStatus = options?.coatingStatus ?? "pending";
  const status = options?.status ?? "pending";
  const coatingUnitCost = options?.coatingUnitCost ?? (coatingStatus === "pending" ? 0 : 1850);

  const materialItems: CostingLineItem[] = order.lineItems.map((item, index) => ({
    id: `cli-${order.id}-${index + 1}`,
    description: `${item.productName} × ${item.quantity}`,
    category: "Materials",
    baseCost: round2(item.unitPrice * item.quantity * 0.62),
    percentOfCost: 0,
  }));

  const allApproved = status === "approved";
  const approvalLevels = DEFAULT_APPROVERS.map((level, index) => ({
    id: `al-${order.id}-${index + 1}`,
    role: level.role,
    assigneeName: level.assigneeName,
    status: (allApproved
      ? "approved"
      : index === 0
        ? status === "pending" && coatingStatus === "pending"
          ? "waiting"
          : "pending"
        : "waiting") as CostingRequest["approvalLevels"][number]["status"],
  }));

  let request: CostingRequest = {
    id: `cr-${order.id}`,
    requestNumber: options?.requestNumber ?? `CR-${order.orderNumber.replace("SO-", "")}`,
    customerName: order.customerName,
    projectName: `${order.orderNumber} coating & costing`,
    requestType: "Sales Order Costing",
    requestedDate: order.createdAt,
    totalEstimate: 0,
    proposedPrice: order.totalAmount,
    marginPercent: 0,
    targetMargin: 22,
    riskFlag: order.priority === "urgent" || order.priority === "high" ? "medium" : "low",
    slaRemaining: allApproved ? "Completed" : "24h 00m",
    status,
    coatingStatus,
    currency: order.currency,
    paymentTerms: "As per sales order",
    lineItems: materialItems,
    coatingItems: [],
    attachments: [],
    notes:
      coatingStatus === "pending"
        ? "Enter coating finish, process, and unit cost before submitting for costing approval."
        : "Coating submitted from sales order workflow.",
    requester: {
      name: order.createdByName,
      title: "Sales",
      email: "",
      avatarInitials: order.createdByName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    },
    approvalLevels,
    history: [
      {
        id: `h-${order.id}-1`,
        action: "Created from sales order",
        userName: order.createdByName,
        timestamp: order.createdAt,
      },
    ],
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,
    quotationId: order.quotationId,
    quotationNumber: order.quotationNumber,
  };

  const coatingInputs = buildCoatingItemsFromOrder(order).map((item) => ({
    ...item,
    unitCost: coatingUnitCost,
  }));

  request = applyCoatingItems(request, coatingInputs);

  if (coatingStatus === "pending") {
    request.coatingItems = request.coatingItems.map((item) => ({
      ...item,
      unitCost: 0,
      lineTotal: 0,
    }));
    request.lineItems = request.lineItems.filter((item) => item.category !== "Coating");
    request = recomputeCostingTotals(request);
  } else {
    request.history = [
      {
        id: `h-${order.id}-2`,
        action: "Coating submitted",
        userName: order.createdByName,
        timestamp: order.createdAt,
      },
      ...request.history,
    ];
  }

  if (allApproved) {
    request.history = [
      {
        id: `h-${order.id}-3`,
        action: "Approved",
        userName: "Asanka Perera",
        timestamp: order.confirmedAt ?? nowIso(),
        comment: "Margin accepted. Proceed to confirm the sales order.",
      },
      ...request.history,
    ];
  }

  return request;
}
