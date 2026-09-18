import { roundCost } from "@/lib/bomCosting";
import { loadCostingRates, type CostingRates } from "@/lib/costingRates";

export type LaborHoursSplit = {
  actualHours: number;
  regularHours: number;
  overtimeHours: number;
  normalOvertimeHours: number;
  doubleOvertimeHours: number;
};

export type LaborCostBreakdown = LaborHoursSplit & {
  labourRatePerHour: number;
  overtimeRatePerHour: number;
  overtimeMultiplier: number;
  normalOvertimeMultiplier: number;
  doubleOvertimeMultiplier: number;
  normalOvertimeRatePerHour: number;
  doubleOvertimeRatePerHour: number;
  regularCost: number;
  overtimeCost: number;
  normalOvertimeCost: number;
  doubleOvertimeCost: number;
  laborCost: number;
};

export type LaborHoursInput = {
  actualHours: number;
  estimatedHours?: number;
  overtimeHours?: number | null;
  normalOvertimeHours?: number | null;
  doubleOvertimeHours?: number | null;
};

function parseOptionalHours(value?: number | null): number | undefined {
  if (value == null || Number.isNaN(Number(value))) return undefined;
  return Math.max(0, Number(value));
}

export function resolveLabourRatePerHour(
  taskRate?: number | null,
  rates: CostingRates = loadCostingRates(),
): number {
  if (taskRate != null && Number(taskRate) > 0) {
    return Number(taskRate);
  }
  return rates.labourRatePerHour;
}

export function overtimeRateFields(labourRatePerHour: number, rates: CostingRates) {
  const normalOvertimeMultiplier = rates.normalOvertimeMultiplier;
  const doubleOvertimeMultiplier = rates.doubleOvertimeMultiplier;
  const normalOvertimeRatePerHour = roundCost(labourRatePerHour * normalOvertimeMultiplier);
  const doubleOvertimeRatePerHour = roundCost(labourRatePerHour * doubleOvertimeMultiplier);
  return {
    overtimeMultiplier: normalOvertimeMultiplier,
    normalOvertimeMultiplier,
    doubleOvertimeMultiplier,
    overtimeRatePerHour: normalOvertimeRatePerHour,
    normalOvertimeRatePerHour,
    doubleOvertimeRatePerHour,
  };
}

export function emptyLaborBreakdown(
  rates: CostingRates = loadCostingRates(),
): LaborCostBreakdown {
  return {
    actualHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    normalOvertimeHours: 0,
    doubleOvertimeHours: 0,
    labourRatePerHour: rates.labourRatePerHour,
    ...overtimeRateFields(rates.labourRatePerHour, rates),
    regularCost: 0,
    overtimeCost: 0,
    normalOvertimeCost: 0,
    doubleOvertimeCost: 0,
    laborCost: 0,
  };
}

export function splitLaborHours(input: LaborHoursInput): LaborHoursSplit {
  const actualHours = roundCost(Math.max(0, Number(input.actualHours) || 0));
  const estimatedHours = Math.max(0, Number(input.estimatedHours) || 0);
  const explicitNormal = parseOptionalHours(input.normalOvertimeHours);
  const explicitDouble = parseOptionalHours(input.doubleOvertimeHours);
  const explicitLegacyOt = parseOptionalHours(input.overtimeHours);

  let normalOvertimeHours = 0;
  let doubleOvertimeHours = 0;

  if (explicitNormal != null && explicitDouble != null) {
    normalOvertimeHours = explicitNormal;
    doubleOvertimeHours = explicitDouble;
  } else if (explicitNormal != null) {
    normalOvertimeHours = explicitNormal;
  } else if (explicitDouble != null) {
    doubleOvertimeHours = explicitDouble;
    normalOvertimeHours = Math.max(0, actualHours - estimatedHours - doubleOvertimeHours);
  } else if (explicitLegacyOt != null) {
    normalOvertimeHours = explicitLegacyOt;
  } else {
    normalOvertimeHours = Math.max(0, actualHours - estimatedHours);
  }

  if (doubleOvertimeHours > actualHours) {
    doubleOvertimeHours = actualHours;
    normalOvertimeHours = 0;
  } else if (normalOvertimeHours + doubleOvertimeHours > actualHours) {
    normalOvertimeHours = Math.max(0, actualHours - doubleOvertimeHours);
  }

  normalOvertimeHours = roundCost(normalOvertimeHours);
  doubleOvertimeHours = roundCost(doubleOvertimeHours);
  const overtimeHours = roundCost(normalOvertimeHours + doubleOvertimeHours);
  const regularHours = roundCost(Math.max(0, actualHours - overtimeHours));
  return { actualHours, regularHours, overtimeHours, normalOvertimeHours, doubleOvertimeHours };
}

export function calculateLaborCost(input: LaborHoursInput & {
  labourCostRate?: number | null;
  rates?: CostingRates;
}): LaborCostBreakdown {
  const rates = input.rates ?? loadCostingRates();
  const hours = splitLaborHours(input);
  const labourRatePerHour = resolveLabourRatePerHour(input.labourCostRate, rates);
  const otRates = overtimeRateFields(labourRatePerHour, rates);
  const regularCost = roundCost(hours.regularHours * labourRatePerHour);
  const normalOvertimeCost = roundCost(hours.normalOvertimeHours * otRates.normalOvertimeRatePerHour);
  const doubleOvertimeCost = roundCost(hours.doubleOvertimeHours * otRates.doubleOvertimeRatePerHour);
  const overtimeCost = roundCost(normalOvertimeCost + doubleOvertimeCost);
  return {
    ...hours,
    labourRatePerHour,
    ...otRates,
    regularCost,
    overtimeCost,
    normalOvertimeCost,
    doubleOvertimeCost,
    laborCost: roundCost(regularCost + overtimeCost),
  };
}

export function addLaborBreakdowns(
  left: LaborCostBreakdown,
  right: LaborCostBreakdown,
  rates: CostingRates,
): LaborCostBreakdown {
  return {
    actualHours: roundCost(left.actualHours + right.actualHours),
    regularHours: roundCost(left.regularHours + right.regularHours),
    overtimeHours: roundCost(left.overtimeHours + right.overtimeHours),
    normalOvertimeHours: roundCost(left.normalOvertimeHours + right.normalOvertimeHours),
    doubleOvertimeHours: roundCost(left.doubleOvertimeHours + right.doubleOvertimeHours),
    labourRatePerHour: rates.labourRatePerHour,
    ...overtimeRateFields(rates.labourRatePerHour, rates),
    regularCost: roundCost(left.regularCost + right.regularCost),
    overtimeCost: roundCost(left.overtimeCost + right.overtimeCost),
    normalOvertimeCost: roundCost(left.normalOvertimeCost + right.normalOvertimeCost),
    doubleOvertimeCost: roundCost(left.doubleOvertimeCost + right.doubleOvertimeCost),
    laborCost: roundCost(left.laborCost + right.laborCost),
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
