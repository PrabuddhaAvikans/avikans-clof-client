/**
 * WIP costing helpers.
 * Do not assume WIP = progress% × selling price unless a costing method
 * explicitly defines that relationship.
 */

export type WipCostInput = {
  materialConsumedValue: number;
  laborCostToDate: number;
  overheadAllocated?: number;
  /** Optional explicit WIP valuation method override. */
  method?: "cost_to_date" | "percent_of_estimate";
  estimatedTotalCost?: number;
  progressPercentage?: number;
};

/**
 * Default method: cost-to-date (materials + labour + overhead already incurred).
 * Alternative: percent of estimate when costing policy requires it.
 */
export function calculateWipCost(input: WipCostInput): number {
  if (
    input.method === "percent_of_estimate" &&
    input.estimatedTotalCost != null &&
    input.progressPercentage != null
  ) {
    return roundMoney(
      (input.estimatedTotalCost * Math.max(0, Math.min(100, input.progressPercentage))) /
        100,
    );
  }

  return roundMoney(
    (input.materialConsumedValue || 0) +
      (input.laborCostToDate || 0) +
      (input.overheadAllocated || 0),
  );
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export type ProductionProgressPosition = {
  totalQty: number;
  completedQty: number;
  partialQty: number;
  progressPercentage: number;
};

/**
 * Aggregate multi-worker / multi-quantity progress without changing task status.
 * Overall progress is the mean of unit progress percentages.
 */
export function aggregateProductionProgress(
  unitProgressPercentages: number[],
): ProductionProgressPosition {
  const totalQty = unitProgressPercentages.length;
  if (totalQty === 0) {
    return { totalQty: 0, completedQty: 0, partialQty: 0, progressPercentage: 0 };
  }

  let completedQty = 0;
  let partialQty = 0;
  let sum = 0;

  for (const raw of unitProgressPercentages) {
    const progress = Math.max(0, Math.min(100, Number(raw) || 0));
    sum += progress;
    if (progress >= 100) completedQty += 1;
    else if (progress > 0) partialQty += 1;
  }

  return {
    totalQty,
    completedQty,
    partialQty,
    progressPercentage: Math.round((sum / totalQty) * 100) / 100,
  };
}
