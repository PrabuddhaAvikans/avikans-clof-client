import { generateId } from "@/services/http";
import { computeStandardCosts, DEFAULT_COSTING_RATES } from "@/lib/costingRates";
import { estimateFromBomAndOperations } from "@/lib/quotationCustomization";
import { computeTotalCost, extraLinesTotal } from "@/types/product";
import { mockProductService } from "@/services/mock/mockProductService";
import type {
  CoatingLineItem,
  CostingLineItem,
  EstimationMaterial,
  EstimationProductLine,
} from "@/types/costing";
import type { EstimationMaterialInput } from "@/services/interfaces/costingService";
import type { BomItem, ProductOperation, ProductSpecifications } from "@/types/product";
import type { SalesOrder, SalesOrderLineItem } from "@/types/sales-order";

export type EstimationLineContext = {
  salesOrderLineItemId: string;
  productId: string;
  productSku: string;
  productName: string;
  productVersionId?: string;
  productVersionLabel?: string;
  quantity: number;
  unitPrice: number;
  sourceType: "standard" | "customized";
  specifications: ProductSpecifications;
  bom: BomItem[];
  operations: ProductOperation[];
  materialCost: number;
  labourCost: number;
  machineCost: number;
  coatingCost: number;
  overheadCost: number;
  totalCost: number;
  customizationId?: string;
  customizationStatus?: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveFinish(specs: ProductSpecifications): string {
  return specs.coatingFinish || specs.finish || "Powder Coating";
}

function resolveProcess(specs: ProductSpecifications): string {
  return specs.coatingProcess || "Batch spray";
}

function scaleBom(bom: BomItem[], orderQuantity: number): BomItem[] {
  return bom.map((item) => {
    const quantity = round2(item.quantity * orderQuantity);
    const requiredQuantity = round2(quantity * (1 + (item.wastePercent || 0) / 100));
    return {
      ...item,
      quantity,
      requiredQuantity,
      lineCost: round2(requiredQuantity * item.unitCost),
    };
  });
}

function scaleOperations(operations: ProductOperation[], orderQuantity: number): ProductOperation[] {
  return operations.map((op) => ({
    ...op,
    estimatedHours: round2(op.estimatedHours * orderQuantity),
    machineCost: op.machineCost != null ? round2(op.machineCost * orderQuantity) : op.machineCost,
  }));
}

function computeCostsFromBomAndOps(
  bom: BomItem[],
  operations: ProductOperation[],
  coatingCost = 0,
) {
  const costs = computeStandardCosts(bom, operations, {
    ...DEFAULT_COSTING_RATES,
    coatingCostPerUnit: coatingCost,
  });
  const totalCost = round2(
    costs.materialCost +
      costs.labourCost +
      costs.machineCost +
      costs.coatingFinishingCost +
      costs.overheadCost,
  );
  return { ...costs, totalCost };
}

export async function resolveSalesOrderLineContext(
  line: SalesOrderLineItem,
): Promise<EstimationLineContext> {
  if (line.isCustomized && line.customization) {
    const customization = line.customization;
    const bom = scaleBom(customization.customizedBom, line.quantity);
    const operations = scaleOperations(customization.customizedOperations, line.quantity);
    const costBreakdown = estimateFromBomAndOperations(
      bom,
      operations,
      customization.base.costBreakdown.coatingFinishingCost,
      customization.base.costBreakdown.overheadCost,
      customization.base.costBreakdown.otherCost,
      customization.base.costBreakdown.extraLines,
    );
    const extraCost = extraLinesTotal(costBreakdown);

    return {
      salesOrderLineItemId: line.id,
      productId: line.productId,
      productSku: line.productSku,
      productName: line.productName,
      productVersionId: customization.base.productVersionId,
      productVersionLabel: customization.base.productVersionLabel,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      sourceType: "customized",
      specifications: customization.customizedSpecifications,
      bom,
      operations,
      materialCost: costBreakdown.materialCost,
      labourCost: costBreakdown.labourCost,
      machineCost: costBreakdown.machineCost,
      coatingCost: costBreakdown.coatingFinishingCost,
      overheadCost: costBreakdown.overheadCost + costBreakdown.otherCost + extraCost,
      totalCost: round2(computeTotalCost(costBreakdown)),
      customizationId: customization.id,
      customizationStatus: customization.status,
    };
  }

  const product = await mockProductService.getById(line.productId);
  const version =
    product.versions.find((item) => item.id === line.productVersionId) ??
    product.versions.find((item) => item.id === product.currentVersionId) ??
    product.versions[product.versions.length - 1];

  const bom = scaleBom(version.bom, line.quantity);
  const operations = scaleOperations(version.operations, line.quantity);
  const costs = computeCostsFromBomAndOps(bom, operations);
  const extraCost = extraLinesTotal(version.costBreakdown) + (version.costBreakdown.otherCost || 0);

  return {
    salesOrderLineItemId: line.id,
    productId: line.productId,
    productSku: line.productSku,
    productName: line.productName,
    productVersionId: version.id,
    productVersionLabel: version.label,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    sourceType: "standard",
    specifications: version.specifications,
    bom,
    operations,
    materialCost: costs.materialCost,
    labourCost: costs.labourCost,
    machineCost: costs.machineCost,
    coatingCost: costs.coatingFinishingCost,
    overheadCost: costs.overheadCost + extraCost,
    totalCost: round2(costs.totalCost + extraCost),
  };
}

export async function resolveSalesOrderLineContexts(
  order: SalesOrder,
): Promise<EstimationLineContext[]> {
  return Promise.all(order.lineItems.map((line) => resolveSalesOrderLineContext(line)));
}

export function contextsToEstimationMaterials(
  contexts: EstimationLineContext[],
): EstimationMaterial[] {
  const materials: EstimationMaterial[] = [];

  for (const context of contexts) {
    for (const item of context.bom) {
      materials.push({
        id: generateId("emat"),
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItemName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        wastePercent: item.wastePercent,
        requiredQuantity: item.requiredQuantity,
        unitCost: item.unitCost,
        totalCost: item.lineCost,
        isRequired: item.isRequired,
        notes: `${context.productName}${context.sourceType === "customized" ? " (customized)" : ""}${item.notes ? ` - ${item.notes}` : ""}`,
        salesOrderLineItemId: context.salesOrderLineItemId,
        sourceType: context.sourceType,
        sourceProductName: context.productName,
        productVersionLabel: context.productVersionLabel,
      });
    }
  }

  return materials;
}

export function contextsToEstimationMaterialsInput(
  contexts: EstimationLineContext[],
): EstimationMaterialInput[] {
  return contextsToEstimationMaterials(contexts).map((item) => ({
    id: item.id,
    inventoryItemId: item.inventoryItemId,
    inventoryItemName: item.inventoryItemName,
    sku: item.sku,
    quantity: item.quantity,
    unit: item.unit,
    wastePercent: item.wastePercent,
    unitCost: item.unitCost,
    isRequired: item.isRequired,
    notes: item.notes,
  }));
}

export function contextsToCoatingItems(
  contexts: EstimationLineContext[],
  orderId: string,
): CoatingLineItem[] {
  return contexts.map((context, index) => ({
    id: `coat-${orderId}-${index + 1}`,
    productId: context.productId,
    productName: context.productName,
    finish: resolveFinish(context.specifications),
    process: resolveProcess(context.specifications),
    quantity: context.quantity,
    unitCost: 0,
    lineTotal: 0,
    salesOrderLineItemId: context.salesOrderLineItemId,
    sourceType: context.sourceType,
    productVersionLabel: context.productVersionLabel,
    productSku: context.productSku,
  }));
}

export function contextsToCostingLineItems(
  contexts: EstimationLineContext[],
  orderId: string,
): CostingLineItem[] {
  const items: CostingLineItem[] = [];
  let index = 0;

  for (const context of contexts) {
    const label =
      context.sourceType === "customized"
        ? `${context.productName} (${context.productVersionLabel ?? "custom"})`
        : `${context.productName} (${context.productVersionLabel ?? "standard"})`;

    if (context.materialCost > 0) {
      items.push({
        id: `cli-${orderId}-${++index}`,
        description: `${label} - materials`,
        category: "Materials",
        baseCost: context.materialCost,
        percentOfCost: 0,
        salesOrderLineItemId: context.salesOrderLineItemId,
        sourceType: context.sourceType,
      });
    }
    if (context.labourCost > 0) {
      items.push({
        id: `cli-${orderId}-${++index}`,
        description: `${label} - labour`,
        category: "Labour",
        baseCost: context.labourCost,
        percentOfCost: 0,
        salesOrderLineItemId: context.salesOrderLineItemId,
        sourceType: context.sourceType,
      });
    }
    if (context.machineCost > 0) {
      items.push({
        id: `cli-${orderId}-${++index}`,
        description: `${label} - machine`,
        category: "Machine",
        baseCost: context.machineCost,
        percentOfCost: 0,
        salesOrderLineItemId: context.salesOrderLineItemId,
        sourceType: context.sourceType,
      });
    }
    if (context.overheadCost > 0) {
      items.push({
        id: `cli-${orderId}-${++index}`,
        description: `${label} - overhead`,
        category: "Overhead",
        baseCost: context.overheadCost,
        percentOfCost: 0,
        salesOrderLineItemId: context.salesOrderLineItemId,
        sourceType: context.sourceType,
      });
    }
  }

  return items;
}

export function contextsToEstimationProductLines(
  contexts: EstimationLineContext[],
): EstimationProductLine[] {
  return contexts.map((context) => ({
    id: generateId("epl"),
    salesOrderLineItemId: context.salesOrderLineItemId,
    productId: context.productId,
    productSku: context.productSku,
    productName: context.productName,
    productVersionId: context.productVersionId,
    productVersionLabel: context.productVersionLabel,
    quantity: context.quantity,
    sourceType: context.sourceType,
    unitPrice: context.unitPrice,
    estimatedCost: context.totalCost,
    materialCost: context.materialCost,
    labourCost: context.labourCost,
    machineCost: context.machineCost,
    coatingCost: context.coatingCost,
    overheadCost: context.overheadCost,
    customizationId: context.customizationId,
    customizationStatus: context.customizationStatus,
  }));
}

export function buildEstimationNotes(
  order: SalesOrder,
  contexts: EstimationLineContext[],
): string {
  const standardCount = contexts.filter((item) => item.sourceType === "standard").length;
  const customizedCount = contexts.filter((item) => item.sourceType === "customized").length;
  const parts = [
    "Product estimation seeded from quotation sales order lines.",
    standardCount > 0 ? `${standardCount} standard product line(s) from master version BOM.` : "",
    customizedCount > 0
      ? `${customizedCount} customized line(s) from locked quotation configuration (master product unchanged).`
      : "",
    order.quotationNumber ? `Quotation ${order.quotationNumber}.` : "",
    "Review coating unit costs and materials before submitting for approval.",
  ];
  return parts.filter(Boolean).join(" ");
}
