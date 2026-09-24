import { roundCost } from "@/lib/bomCosting";
import { loadCostingRates } from "@/lib/costingRates";
import { overtimeRateFields } from "@/lib/laborCost";

/**
 * Split a day's productive minutes into regular, normal OT, and double OT.
 *
 * Default policy:
 * - 0 → requiredMinutes          = regular
 * - required → doubleOtAfter     = normal overtime (1.5×)
 * - beyond doubleOtAfter         = double overtime (2×)
 *
 * Example (required 8h, double after 10h):
 *   Worked 11h → Regular 8h · OT 2h · DOT 1h
 */
export function splitDailyWorkMinutes(options: {
  workedMinutes: number;
  requiredMinutes: number;
  /** Absolute day minutes after which further time is double OT. 0 = no auto DOT. */
  doubleOvertimeAfterMinutes?: number;
}): {
  regularMinutes: number;
  normalOvertimeMinutes: number;
  doubleOvertimeMinutes: number;
  overtimeMinutes: number;
} {
  const worked = Math.max(0, Math.round(options.workedMinutes));
  const required = Math.max(0, Math.round(options.requiredMinutes));
  const doubleAfter = Math.max(
    0,
    Math.round(options.doubleOvertimeAfterMinutes ?? 0),
  );

  const regularMinutes = Math.min(worked, required);
  const excess = Math.max(0, worked - required);

  let normalOvertimeMinutes = excess;
  let doubleOvertimeMinutes = 0;

  if (doubleAfter > required && excess > 0) {
    const normalCap = Math.max(0, doubleAfter - required);
    normalOvertimeMinutes = Math.min(excess, normalCap);
    doubleOvertimeMinutes = Math.max(0, excess - normalCap);
  }

  return {
    regularMinutes,
    normalOvertimeMinutes,
    doubleOvertimeMinutes,
    overtimeMinutes: normalOvertimeMinutes + doubleOvertimeMinutes,
  };
}

/** Estimate labour cost for a day's hour split using current costing rates. */
export function estimateDailyLabourCost(options: {
  regularMinutes: number;
  normalOvertimeMinutes: number;
  doubleOvertimeMinutes: number;
  labourRatePerHour?: number;
}): {
  regularCost: number;
  normalOvertimeCost: number;
  doubleOvertimeCost: number;
  overtimeCost: number;
  laborCost: number;
  labourRatePerHour: number;
  normalOvertimeMultiplier: number;
  doubleOvertimeMultiplier: number;
} {
  const rates = loadCostingRates();
  const labourRatePerHour =
    options.labourRatePerHour != null && options.labourRatePerHour > 0
      ? options.labourRatePerHour
      : rates.labourRatePerHour;
  const ot = overtimeRateFields(labourRatePerHour, rates);

  const regularHours = options.regularMinutes / 60;
  const normalOtHours = options.normalOvertimeMinutes / 60;
  const doubleOtHours = options.doubleOvertimeMinutes / 60;

  const regularCost = roundCost(regularHours * labourRatePerHour);
  const normalOvertimeCost = roundCost(normalOtHours * ot.normalOvertimeRatePerHour);
  const doubleOvertimeCost = roundCost(doubleOtHours * ot.doubleOvertimeRatePerHour);
  const overtimeCost = roundCost(normalOvertimeCost + doubleOvertimeCost);

  return {
    regularCost,
    normalOvertimeCost,
    doubleOvertimeCost,
    overtimeCost,
    laborCost: roundCost(regularCost + overtimeCost),
    labourRatePerHour,
    normalOvertimeMultiplier: ot.normalOvertimeMultiplier,
    doubleOvertimeMultiplier: ot.doubleOvertimeMultiplier,
  };
}
