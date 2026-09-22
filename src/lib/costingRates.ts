import {
  calculateRequiredQuantity,
  calculateTotalMaterialCost,
  roundCost,
} from "@/lib/bomCosting";

export type CostingRates = {
  labourRatePerHour: number;
  overtimeMultiplier: number;
  normalOvertimeMultiplier: number;
  doubleOvertimeMultiplier: number;
  machineRatePerHour: number;
  coatingCostPerUnit: number;
  overheadPercent: number;
};

export const DEFAULT_COSTING_RATES: CostingRates = {
  labourRatePerHour: 500,
  overtimeMultiplier: 1.5,
  normalOvertimeMultiplier: 1.5,
  doubleOvertimeMultiplier: 2,
  machineRatePerHour: 200,
  coatingCostPerUnit: 0,
  overheadPercent: 10,
};

function parseOvertimeMultiplier(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (value == null || Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function normalizeCostingRates(parsed: Partial<CostingRates>): CostingRates {
  const normalOvertimeMultiplier = parseOvertimeMultiplier(
    parsed.normalOvertimeMultiplier ?? parsed.overtimeMultiplier,
    DEFAULT_COSTING_RATES.normalOvertimeMultiplier,
  );
  return {
    labourRatePerHour: Number(parsed.labourRatePerHour) || DEFAULT_COSTING_RATES.labourRatePerHour,
    overtimeMultiplier: normalOvertimeMultiplier,
    normalOvertimeMultiplier,
    doubleOvertimeMultiplier: parseOvertimeMultiplier(
      parsed.doubleOvertimeMultiplier,
      DEFAULT_COSTING_RATES.doubleOvertimeMultiplier,
    ),
    machineRatePerHour: Number(parsed.machineRatePerHour) || DEFAULT_COSTING_RATES.machineRatePerHour,
    coatingCostPerUnit: Number(parsed.coatingCostPerUnit) || 0,
    overheadPercent:
      parsed.overheadPercent == null
        ? DEFAULT_COSTING_RATES.overheadPercent
        : Number(parsed.overheadPercent) || 0,
  };
}

const STORAGE_KEY = "ats.costingRates";

export function loadCostingRates(): CostingRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COSTING_RATES };
    const parsed = JSON.parse(raw) as Partial<CostingRates>;
    return normalizeCostingRates(parsed);
  } catch {
    return { ...DEFAULT_COSTING_RATES };
  }
}

export function saveCostingRates(rates: CostingRates): CostingRates {
  const normalized = normalizeCostingRates(rates);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("ats-costing-rates-updated"));
  return normalized;
}

export type CostingOperationInput = {
  estimatedHours?: number | null;
  labourCostRate?: number | null;
  machineCost?: number | null;
  isEnabled?: boolean | null;
};

export type CostingBomInput = {
  quantity?: number | null;
  wastePercent?: number | null;
  unitCost?: number | null;
};

export type ComputedStandardCosts = {
  materialCost: number;
  labourCost: number;
  machineCost: number;
  coatingFinishingCost: number;
  overheadCost: number;
};

export function computeStandardCosts(
  bom: CostingBomInput[],
  operations: CostingOperationInput[],
  rates: CostingRates,
): ComputedStandardCosts {
  const materialCost = calculateTotalMaterialCost(
    bom.map((line) => ({
      requiredQuantity: calculateRequiredQuantity(
        Number(line.quantity) || 0,
        Number(line.wastePercent) || 0,
      ),
      unitCost: Number(line.unitCost) || 0,
    })),
  );

  const enabledOps = operations.filter((op) => op.isEnabled !== false);

  const labourCost = roundCost(
    enabledOps.reduce((sum, op) => {
      const hours = Number(op.estimatedHours) || 0;
      const rate = op.labourCostRate != null ? Number(op.labourCostRate) : rates.labourRatePerHour;
      return sum + hours * (Number(rate) || 0);
    }, 0),
  );

  const machineCost = roundCost(
    enabledOps.reduce((sum, op) => {
      if (op.machineCost != null) {
        return sum + (Number(op.machineCost) || 0);
      }
      const hours = Number(op.estimatedHours) || 0;
      return sum + hours * rates.machineRatePerHour;
    }, 0),
  );

  const coatingFinishingCost = roundCost(rates.coatingCostPerUnit);
  const overheadBase = materialCost + labourCost + machineCost + coatingFinishingCost;
  const overheadCost = roundCost(overheadBase * (rates.overheadPercent / 100));

  return {
    materialCost,
    labourCost,
    machineCost,
    coatingFinishingCost,
    overheadCost,
  };
}
