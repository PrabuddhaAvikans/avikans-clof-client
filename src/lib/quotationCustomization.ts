import { generateId } from "@/services/http";
import {
  computeTotalCost,
  type BomItem,
  type CostBreakdown,
  type Product,
  type ProductOperation,
  type ProductSpecifications,
  type ProductVersion,
} from "@/types/product";
import type {
  QuotationCustomizationEstimation,
  QuotationCustomizationHistoryEntry,
  QuotationProductCustomization,
} from "@/types/quotation";
import type { QuotationCustomizationStatusValue } from "@/types/status";

export const CUSTOMIZABLE_SPEC_FIELDS = [
  { key: "dimensions", label: "Dimensions" },
  { key: "size", label: "Size" },
  { key: "diameterMm", label: "Diameter (mm)" },
  { key: "lengthMm", label: "Length (mm)" },
  { key: "widthMm", label: "Width (mm)" },
  { key: "heightMm", label: "Height (mm)" },
  { key: "colour", label: "Colour" },
  { key: "finish", label: "Finish" },
  { key: "coatingFinish", label: "Coating Finish" },
  { key: "materialPrimary", label: "Material" },
  { key: "materialSecondary", label: "Secondary Material" },
  { key: "glass", label: "Glass" },
  { key: "wiring", label: "Wiring" },
  { key: "ledType", label: "LED" },
  { key: "driver", label: "LED Driver" },
  { key: "driverType", label: "Driver Type" },
  { key: "driverBrand", label: "Driver Brand" },
  { key: "wattage", label: "Wattage" },
  { key: "colorTemperature", label: "Colour Temperature" },
  { key: "mountingType", label: "Mounting Type" },
  { key: "mountingBracket", label: "Mounting Bracket" },
  { key: "voltage", label: "Voltage" },
  { key: "inputVoltage", label: "Input Voltage" },
  { key: "dimming", label: "Dimming" },
  { key: "ipRating", label: "IP Rating" },
  { key: "manufacturingNotes", label: "Manufacturing Notes" },
] as const satisfies ReadonlyArray<{
  key: keyof ProductSpecifications;
  label: string;
}>;

export type CustomizableSpecKey = (typeof CUSTOMIZABLE_SPEC_FIELDS)[number]["key"];

const COST_DELTA_APPROVAL_THRESHOLD = 0.05; // 5% cost increase triggers approval
const MARGIN_FLOOR_PERCENT = 15;

export interface SpecFieldDiff {
  key: CustomizableSpecKey;
  label: string;
  originalValue: string;
  customizedValue: string;
  changed: boolean;
}

export function formatSpecValue(
  value: string | number | undefined | null,
): string {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

export function cloneSpecifications(
  specs: ProductSpecifications,
): ProductSpecifications {
  return { ...specs };
}

export function cloneBom(bom: BomItem[]): BomItem[] {
  return bom.map((item) => ({
    ...item,
    alternatives: item.alternatives.map((alt) => ({ ...alt })),
  }));
}

export function cloneOperations(operations: ProductOperation[]): ProductOperation[] {
  return operations.map((op) => ({ ...op }));
}

export function cloneCostBreakdown(breakdown: CostBreakdown): CostBreakdown {
  return { ...breakdown };
}

export function estimateFromBomAndOperations(
  bom: BomItem[],
  operations: ProductOperation[],
  baseCoating = 0,
  baseOverhead = 0,
  baseOther = 0,
): CostBreakdown {
  const materialCost = bom.reduce((sum, item) => sum + item.lineCost, 0);
  const labourCost = operations
    .filter((op) => op.isEnabled)
    .reduce((sum, op) => sum + op.estimatedHours * (op.labourCostRate ?? 0), 0);
  const machineCost = operations
    .filter((op) => op.isEnabled)
    .reduce((sum, op) => sum + (op.machineCost ?? 0), 0);

  return {
    materialCost: roundMoney(materialCost),
    labourCost: roundMoney(labourCost),
    coatingFinishingCost: roundMoney(baseCoating),
    machineCost: roundMoney(machineCost),
    overheadCost: roundMoney(baseOverhead),
    otherCost: roundMoney(baseOther),
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeEstimation(
  costBreakdown: CostBreakdown,
  sellingPrice: number,
  base: { bom: BomItem[]; operations: ProductOperation[]; costPrice: number },
  customized: { bom: BomItem[]; operations: ProductOperation[] },
  estimatedAt?: string,
): QuotationCustomizationEstimation {
  const costPrice = roundMoney(computeTotalCost(costBreakdown));
  const expectedProfit = roundMoney(sellingPrice - costPrice);
  const marginPercent =
    sellingPrice > 0 ? roundMoney((expectedProfit / sellingPrice) * 100) : 0;

  const materialRequirementChanged =
    JSON.stringify(base.bom.map(bomSignature)) !==
    JSON.stringify(customized.bom.map(bomSignature));
  const labourChanged =
    JSON.stringify(base.operations.map(opSignature)) !==
    JSON.stringify(customized.operations.map(opSignature));

  return {
    costBreakdown,
    costPrice,
    sellingPrice,
    expectedProfit,
    marginPercent,
    materialRequirementChanged,
    labourChanged,
    estimatedAt,
  };
}

function bomSignature(item: BomItem) {
  return {
    inventoryItemId: item.inventoryItemId,
    quantity: item.quantity,
    wastePercent: item.wastePercent,
    unitCost: item.unitCost,
    isRequired: item.isRequired,
  };
}

function opSignature(op: ProductOperation) {
  return {
    name: op.name,
    workstation: op.workstation,
    estimatedHours: op.estimatedHours,
    labourCostRate: op.labourCostRate,
    machineCost: op.machineCost,
    isEnabled: op.isEnabled,
    prerequisiteOperationIds: op.prerequisiteOperationIds ?? [],
  };
}

export function requiresApproval(
  baseCostPrice: number,
  estimation: QuotationCustomizationEstimation,
): boolean {
  if (estimation.costPrice > baseCostPrice * (1 + COST_DELTA_APPROVAL_THRESHOLD)) {
    return true;
  }
  if (estimation.marginPercent < MARGIN_FLOOR_PERCENT) {
    return true;
  }
  return false;
}

export function resolveCustomizationStatus(
  estimationReady: boolean,
  approvalRequired: boolean,
): QuotationCustomizationStatusValue {
  if (!estimationReady) return "draft";
  if (approvalRequired) return "pending_approval";
  return "approved";
}

export function buildSpecDiffs(
  original: ProductSpecifications,
  customized: ProductSpecifications,
): SpecFieldDiff[] {
  return CUSTOMIZABLE_SPEC_FIELDS.map(({ key, label }) => {
    const originalValue = formatSpecValue(original[key] as string | number | undefined);
    const customizedValue = formatSpecValue(
      customized[key] as string | number | undefined,
    );
    return {
      key,
      label,
      originalValue,
      customizedValue,
      changed: originalValue !== customizedValue,
    };
  });
}

export function getChangedSpecDiffs(
  original: ProductSpecifications,
  customized: ProductSpecifications,
): SpecFieldDiff[] {
  return buildSpecDiffs(original, customized).filter((diff) => diff.changed);
}

function historyEntry(
  action: string,
  detail?: string,
): QuotationCustomizationHistoryEntry {
  return {
    id: generateId("qchx"),
    at: new Date().toISOString(),
    by: "usr-001",
    byName: "Prabuddha Jayawardhana",
    action,
    detail,
  };
}

export function createCustomizationFromVersion(
  product: Product,
  version: ProductVersion,
  options?: {
    sellingPrice?: number;
    notes?: string;
  },
): QuotationProductCustomization {
  const timestamp = new Date().toISOString();
  const baseSpecs = cloneSpecifications(version.specifications);
  const baseBom = cloneBom(version.bom);
  const baseOps = cloneOperations(version.operations);
  const baseCost = cloneCostBreakdown(version.costBreakdown);
  const sellingPrice = options?.sellingPrice ?? version.basePrice;

  const estimation = computeEstimation(
    baseCost,
    sellingPrice,
    { bom: baseBom, operations: baseOps, costPrice: version.costPrice },
    { bom: baseBom, operations: baseOps },
    timestamp,
  );

  const approvalRequired = false;

  return {
    id: generateId("qpc"),
    status: "draft",
    base: {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      productVersionId: version.id,
      productVersionLabel: version.label,
      productVersionNumber: version.versionNumber,
      specifications: baseSpecs,
      bom: baseBom,
      operations: baseOps,
      costBreakdown: baseCost,
      costPrice: version.costPrice,
      basePrice: version.basePrice,
    },
    customizedSpecifications: cloneSpecifications(baseSpecs),
    customizedBom: cloneBom(baseBom),
    customizedOperations: cloneOperations(baseOps),
    estimation,
    approval: {
      required: approvalRequired,
      status: "draft",
    },
    notes: options?.notes,
    isLocked: false,
    history: [historyEntry("created", `Based on ${product.name} ${version.label}`)],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function applyCustomizationChanges(
  customization: QuotationProductCustomization,
  changes: {
    customizedSpecifications?: ProductSpecifications;
    customizedBom?: BomItem[];
    customizedOperations?: ProductOperation[];
    sellingPrice?: number;
    notes?: string;
    markEstimated?: boolean;
  },
): QuotationProductCustomization {
  if (customization.isLocked) {
    throw new Error("Accepted quotation customizations cannot be modified.");
  }

  const customizedSpecifications =
    changes.customizedSpecifications ?? customization.customizedSpecifications;
  const customizedBom = changes.customizedBom ?? customization.customizedBom;
  const customizedOperations =
    changes.customizedOperations ?? customization.customizedOperations;
  const sellingPrice =
    changes.sellingPrice ?? customization.estimation.sellingPrice;

  const costBreakdown = estimateFromBomAndOperations(
    customizedBom,
    customizedOperations,
    customization.base.costBreakdown.coatingFinishingCost,
    customization.base.costBreakdown.overheadCost,
    customization.base.costBreakdown.otherCost,
  );

  const timestamp = new Date().toISOString();
  const estimation = computeEstimation(
    costBreakdown,
    sellingPrice,
    {
      bom: customization.base.bom,
      operations: customization.base.operations,
      costPrice: customization.base.costPrice,
    },
    { bom: customizedBom, operations: customizedOperations },
    timestamp,
  );

  const approvalRequired = requiresApproval(
    customization.base.costPrice,
    estimation,
  );

  const changedSpecs = getChangedSpecDiffs(
    customization.base.specifications,
    customizedSpecifications,
  );

  const nextStatus: QuotationCustomizationStatusValue = changes.markEstimated
    ? "estimated"
    : customization.status === "approved" ||
        customization.status === "pending_approval"
      ? "draft"
      : customization.status;

  return {
    ...customization,
    status: nextStatus,
    customizedSpecifications,
    customizedBom,
    customizedOperations,
    estimation,
    approval: {
      required: approvalRequired,
      status: nextStatus,
      notes: approvalRequired
        ? "Cost or margin change requires approval before customer send."
        : undefined,
    },
    notes: changes.notes ?? customization.notes,
    updatedAt: timestamp,
    history: [
      historyEntry(
        changes.markEstimated ? "estimated" : "updated",
        changedSpecs.length > 0
          ? changedSpecs
              .map((d) => `${d.label}: ${d.originalValue} → ${d.customizedValue}`)
              .join("; ")
          : "Configuration updated",
      ),
      ...customization.history,
    ],
  };
}

export function finalizeCustomizationEstimation(
  customization: QuotationProductCustomization,
  sellingPrice?: number,
): QuotationProductCustomization {
  const updated = applyCustomizationChanges(customization, {
    sellingPrice,
    markEstimated: true,
  });

  const approvalRequired = updated.approval.required;
  const timestamp = new Date().toISOString();
  const nextStatus = resolveCustomizationStatus(true, approvalRequired);

  if (nextStatus === "pending_approval") {
    return {
      ...updated,
      status: "pending_approval",
      approval: {
        ...updated.approval,
        status: "pending_approval",
        requestedAt: timestamp,
      },
      history: [
        historyEntry("pending_approval", "Cost/margin change requires approval"),
        ...updated.history,
      ],
      updatedAt: timestamp,
    };
  }

  return {
    ...updated,
    status: "approved",
    approval: {
      ...updated.approval,
      required: false,
      status: "approved",
      decidedAt: timestamp,
      decidedBy: "usr-001",
      decidedByName: "Prabuddha Jayawardhana",
    },
    history: [
      historyEntry("approved", "Auto-approved - no approval threshold breached"),
      historyEntry("estimated", "Estimation recalculated from customized BOM/ops"),
      ...updated.history.filter((h) => h.action !== "estimated"),
    ],
    updatedAt: timestamp,
  };
}

export function approveCustomization(
  customization: QuotationProductCustomization,
  notes?: string,
): QuotationProductCustomization {
  if (customization.isLocked) {
    throw new Error("Locked customizations cannot be approved again.");
  }
  const timestamp = new Date().toISOString();
  return {
    ...customization,
    status: "approved",
    approval: {
      ...customization.approval,
      status: "approved",
      decidedAt: timestamp,
      decidedBy: "usr-001",
      decidedByName: "Prabuddha Jayawardhana",
      notes,
    },
    history: [
      historyEntry("approved", notes ?? "Customization approved"),
      ...customization.history,
    ],
    updatedAt: timestamp,
  };
}

export function lockCustomization(
  customization: QuotationProductCustomization,
): QuotationProductCustomization {
  if (customization.isLocked) return customization;
  const timestamp = new Date().toISOString();
  return {
    ...customization,
    isLocked: true,
    history: [
      historyEntry("locked", "Frozen on quotation acceptance / sales order conversion"),
      ...customization.history,
    ],
    updatedAt: timestamp,
  };
}

export function deepCloneCustomization(
  customization: QuotationProductCustomization,
): QuotationProductCustomization {
  return {
    ...customization,
    base: {
      ...customization.base,
      specifications: cloneSpecifications(customization.base.specifications),
      bom: cloneBom(customization.base.bom),
      operations: cloneOperations(customization.base.operations),
      costBreakdown: cloneCostBreakdown(customization.base.costBreakdown),
    },
    customizedSpecifications: cloneSpecifications(
      customization.customizedSpecifications,
    ),
    customizedBom: cloneBom(customization.customizedBom),
    customizedOperations: cloneOperations(customization.customizedOperations),
    estimation: {
      ...customization.estimation,
      costBreakdown: cloneCostBreakdown(customization.estimation.costBreakdown),
    },
    approval: { ...customization.approval },
    history: customization.history.map((entry) => ({ ...entry })),
  };
}
