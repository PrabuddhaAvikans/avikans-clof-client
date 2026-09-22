export function roundCost(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateRequiredQuantity(quantity: number, wastePercent: number): number {
  const base = Number(quantity) || 0;
  const waste = Number(wastePercent) || 0;
  return roundCost(base * (1 + waste / 100));
}

export function calculateLineCost(requiredQuantity: number, unitCost: number): number {
  return roundCost((Number(requiredQuantity) || 0) * (Number(unitCost) || 0));
}

export function calculateTotalMaterialCost(
  lines: Array<{ lineCost?: number; requiredQuantity?: number; unitCost?: number }>,
): number {
  return roundCost(
    lines.reduce((sum, line) => {
      if (line.lineCost != null) return sum + line.lineCost;
      const required = line.requiredQuantity ?? 0;
      const cost = line.unitCost ?? 0;
      return sum + calculateLineCost(required, cost);
    }, 0),
  );
}
