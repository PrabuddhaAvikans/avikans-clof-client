export type ProductionMaterialBreakdown = {
  issuedQuantity: number;
  finishedMaterialQuantity: number;
  reusableScrapQuantity: number;
  recoverableQuantity: number;
  permanentWasteQuantity: number;
};

export type ProductionMaterialBreakdownResult =
  | { ok: true; totalAccounted: number }
  | { ok: false; message: string; totalAccounted: number; difference: number };

const DEFAULT_TOLERANCE = 0.001;

function roundCost(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function validateProductionMaterialBreakdown(
  breakdown: ProductionMaterialBreakdown,
  tolerance = DEFAULT_TOLERANCE,
): ProductionMaterialBreakdownResult {
  const issued = Number(breakdown.issuedQuantity) || 0;
  const finished = Number(breakdown.finishedMaterialQuantity) || 0;
  const scrap = Number(breakdown.reusableScrapQuantity) || 0;
  const recoverable = Number(breakdown.recoverableQuantity) || 0;
  const waste = Number(breakdown.permanentWasteQuantity) || 0;

  if (issued < 0 || finished < 0 || scrap < 0 || recoverable < 0 || waste < 0) {
    return {
      ok: false,
      message: "Quantities cannot be negative.",
      totalAccounted: finished + scrap + recoverable + waste,
      difference: issued - (finished + scrap + recoverable + waste),
    };
  }

  const totalAccounted = roundQty(finished + scrap + recoverable + waste);
  const difference = roundQty(issued - totalAccounted);

  if (Math.abs(difference) > tolerance) {
    return {
      ok: false,
      message: `Issued quantity (${issued}) must equal finished + reusable scrap + recoverable + permanent waste (${totalAccounted}). Difference: ${difference}.`,
      totalAccounted,
      difference,
    };
  }

  if (scrap + recoverable + waste > issued + tolerance) {
    return {
      ok: false,
      message: "Reusable scrap and waste cannot exceed issued material.",
      totalAccounted,
      difference,
    };
  }

  return { ok: true, totalAccounted };
}

export function computeRecoveredUnitCost(options: {
  inputQuantity: number;
  inputUnitCost: number;
  processingCost: number;
  recoveredQuantity: number;
}): number {
  const inputQty = Number(options.inputQuantity) || 0;
  const recoveredQty = Number(options.recoveredQuantity) || 0;
  if (recoveredQty <= 0) {
    throw { code: "INVALID_STATE", message: "Recovered quantity must be greater than zero." };
  }
  if (recoveredQty > inputQty + DEFAULT_TOLERANCE) {
    throw {
      code: "INVALID_STATE",
      message: "Recovered quantity cannot exceed reprocessing input quantity.",
    };
  }

  const carryingValue = inputQty * (Number(options.inputUnitCost) || 0);
  const processing = Math.max(0, Number(options.processingCost) || 0);
  return roundCost((carryingValue + processing) / recoveredQty);
}

export function computeCarriedValue(quantity: number, unitCost: number): number {
  return roundCost((Number(quantity) || 0) * (Number(unitCost) || 0));
}

export function scrapLotSku(sourceSku: string, jobNumber: string): string {
  const base = sourceSku.replace(/^RAW-/, "SCRAP-").slice(0, 40);
  return `${base}-${jobNumber}`;
}

export function recoveredLotSku(sourceSku: string, batchNumber: string): string {
  const base = sourceSku
    .replace(/^SCRAP-/, "RCV-")
    .replace(/^RAW-/, "RCV-")
    .slice(0, 40);
  return `${base}-${batchNumber}`;
}

export function validateReprocessingOutput(options: {
  inputQuantity: number;
  recoveredQuantity: number;
  processLossQuantity: number;
  tolerance?: number;
}): { ok: true } | { ok: false; message: string } {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const input = Number(options.inputQuantity) || 0;
  const recovered = Number(options.recoveredQuantity) || 0;
  const loss = Number(options.processLossQuantity) || 0;

  if (input <= 0) {
    return { ok: false, message: "Reprocessing input quantity must be greater than zero." };
  }
  if (recovered < 0 || loss < 0) {
    return { ok: false, message: "Recovered and process-loss quantities cannot be negative." };
  }
  if (recovered <= 0) {
    return { ok: false, message: "Recovered quantity must be greater than zero." };
  }
  if (recovered > input + tolerance) {
    return {
      ok: false,
      message: "Recovered quantity cannot exceed reprocessing input quantity.",
    };
  }

  const accounted = roundQty(recovered + loss);
  const difference = roundQty(input - accounted);
  if (Math.abs(difference) > tolerance) {
    return {
      ok: false,
      message: `Input (${input}) must equal recovered + process loss (${accounted}). Difference: ${difference}.`,
    };
  }

  return { ok: true };
}

export function sumReprocessingCosts(costs: {
  labour?: number;
  electricity?: number;
  machine?: number;
  gas?: number;
  furnace?: number;
  subcontract?: number;
  other?: number;
}): number {
  return roundCost(
    (Number(costs.labour) || 0) +
      (Number(costs.electricity) || 0) +
      (Number(costs.machine) || 0) +
      (Number(costs.gas) || 0) +
      (Number(costs.furnace) || 0) +
      (Number(costs.subcontract) || 0) +
      (Number(costs.other) || 0),
  );
}
