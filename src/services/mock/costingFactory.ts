import { generateId, nowIso } from "@/services/http";
import type {
  CoatingLineItem,
  CostingLineItem,
  CostingRequest,
  EstimationMaterial,
  EstimationProductLine,
} from "@/types/costing";
import type { EstimationMaterialInput } from "@/services/interfaces/costingService";
import type { EstimationLineContext } from "@/lib/costingFromQuotationLine";
import {
  buildEstimationNotes,
  contextsToCoatingItems,
  contextsToCostingLineItems,
  contextsToEstimationMaterials,
  contextsToEstimationProductLines,
} from "@/lib/costingFromQuotationLine";
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
    estimationMaterials: request.estimationMaterials ?? [],
    estimationProductLines: request.estimationProductLines ?? [],
  };
}

export function applyEstimationMaterials(
  request: CostingRequest,
  materials: EstimationMaterialInput[],
): CostingRequest {
  const estimationMaterials: EstimationMaterial[] = materials.map((mat, index) => {
    const quantity = Number(mat.quantity) || 0;
    const wastePercent = Number(mat.wastePercent) || 0;
    const requiredQuantity = round2(quantity * (1 + wastePercent / 100));
    const unitCost = Number(mat.unitCost) || 0;
    const totalCost = round2(requiredQuantity * unitCost);
    return {
      id: mat.id ?? generateId("emat"),
      inventoryItemId: mat.inventoryItemId,
      inventoryItemName: mat.inventoryItemName,
      sku: mat.sku,
      quantity,
      unit: mat.unit,
      wastePercent,
      requiredQuantity,
      unitCost,
      totalCost,
      isRequired: mat.isRequired ?? true,
      alternativeItemId: mat.alternativeItemId,
      alternativeItemName: mat.alternativeItemName,
      notes: mat.notes,
    };
  });

  const materialTotal = estimationMaterials.reduce((sum, m) => sum + m.totalCost, 0);
  const withoutMaterials = request.lineItems.filter((li) => li.category !== "Materials (Components)");
  const lineItems: CostingLineItem[] = [
    ...withoutMaterials,
    ...(materialTotal > 0
      ? [
          {
            id: generateId("cli"),
            description: "Estimation materials & components",
            category: "Materials (Components)",
            baseCost: materialTotal,
            percentOfCost: 0,
          },
        ]
      : []),
  ];

  return recomputeCostingTotals({
    ...request,
    estimationMaterials,
    lineItems,
  });
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
    lineContexts?: EstimationLineContext[];
  },
): CostingRequest {
  const coatingStatus = options?.coatingStatus ?? "pending";
  const status = options?.status ?? "pending";
  const coatingUnitCost = options?.coatingUnitCost ?? (coatingStatus === "pending" ? 0 : 1850);
  const lineContexts = options?.lineContexts;

  const materialItems: CostingLineItem[] = lineContexts
    ? contextsToCostingLineItems(lineContexts, order.id)
    : order.lineItems.map((item, index) => ({
        id: `cli-${order.id}-${index + 1}`,
        description: `${item.productName} × ${item.quantity}`,
        category: "Materials",
        baseCost: round2(item.unitPrice * item.quantity * 0.62),
        percentOfCost: 0,
      }));

  const estimationMaterials: EstimationMaterial[] = lineContexts
    ? contextsToEstimationMaterials(lineContexts)
    : [];

  const estimationProductLines: EstimationProductLine[] = lineContexts
    ? contextsToEstimationProductLines(lineContexts)
    : [];

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
    projectName: `${order.orderNumber} estimation & costing`,
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
    estimationMaterials,
    estimationProductLines,
    attachments: [],
    notes: lineContexts
      ? buildEstimationNotes(order, lineContexts)
      : coatingStatus === "pending"
        ? "Enter finish, process, and unit cost before submitting for costing approval."
        : "Estimation submitted from sales order workflow.",
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
        action: lineContexts
          ? "Created from quotation sales order (BOM & customization snapshot)"
          : "Created from sales order",
        userName: order.createdByName,
        timestamp: order.createdAt,
      },
    ],
    salesOrderId: order.id,
    salesOrderNumber: order.orderNumber,
    quotationId: order.quotationId,
    quotationNumber: order.quotationNumber,
  };

  const coatingInputs = (lineContexts
    ? contextsToCoatingItems(lineContexts, order.id)
    : buildCoatingItemsFromOrder(order)
  ).map((item) => ({
    ...item,
    unitCost: coatingUnitCost,
  }));

  request = applyCoatingItems(request, coatingInputs);

  if (lineContexts && estimationMaterials.length > 0) {
    request.estimationMaterials = estimationMaterials;
    request = recomputeCostingTotals(request);
  }

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
        action: "Estimation submitted",
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
