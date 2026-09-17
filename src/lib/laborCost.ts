import { roundCost } from "@/lib/bomCosting";
import { loadCostingRates, type CostingRates } from "@/lib/costingRates";

export type LaborHoursSplit = {
  actualHours: number;
  regularHours: number;
  overtimeHours: number;
};

export type LaborCostBreakdown = LaborHoursSplit & {
  labourRatePerHour: number;
  overtimeRatePerHour: number;
  overtimeMultiplier: number;
  regularCost: number;
  overtimeCost: number;
  laborCost: number;
};

export function resolveLabourRatePerHour(
  taskRate?: number | null,
  rates: CostingRates = loadCostingRates(),
): number {
  if (taskRate != null && Number(taskRate) > 0) {
    return Number(taskRate);
  }
  return rates.labourRatePerHour;
}

export function splitLaborHours(input: {
  actualHours: number;
  estimatedHours?: number;
  overtimeHours?: number | null;
}): LaborHoursSplit {
  const actualHours = roundCost(Math.max(0, Number(input.actualHours) || 0));
  const estimatedHours = Math.max(0, Number(input.estimatedHours) || 0);
  const hasExplicitOt =
    input.overtimeHours != null && !Number.isNaN(Number(input.overtimeHours));
  const overtimeHours = roundCost(
    Math.min(
      actualHours,
      Math.max(
        0,
        hasExplicitOt
          ? Number(input.overtimeHours)
          : Math.max(0, actualHours - estimatedHours),
      ),
    ),
  );
  const regularHours = roundCost(Math.max(0, actualHours - overtimeHours));
  return { actualHours, regularHours, overtimeHours };
}

export function calculateLaborCost(input: {
  actualHours: number;
  estimatedHours?: number;
  overtimeHours?: number | null;
  labourCostRate?: number | null;
  rates?: CostingRates;
}): LaborCostBreakdown {
  const rates = input.rates ?? loadCostingRates();
  const hours = splitLaborHours(input);
  const labourRatePerHour = resolveLabourRatePerHour(input.labourCostRate, rates);
  const overtimeMultiplier = rates.overtimeMultiplier;
  const overtimeRatePerHour = roundCost(labourRatePerHour * overtimeMultiplier);
  const regularCost = roundCost(hours.regularHours * labourRatePerHour);
  const overtimeCost = roundCost(hours.overtimeHours * overtimeRatePerHour);
  return {
    ...hours,
    labourRatePerHour,
    overtimeRatePerHour,
    overtimeMultiplier,
    regularCost,
    overtimeCost,
    laborCost: roundCost(regularCost + overtimeCost),
  };
}

export function calculateEstimatedLaborCost(
  estimatedHours: number,
  labourCostRate?: number | null,
  rates: CostingRates = loadCostingRates(),
): number {
  const hours = Math.max(0, Number(estimatedHours) || 0);
  return roundCost(hours * resolveLabourRatePerHour(labourCostRate, rates));
}
