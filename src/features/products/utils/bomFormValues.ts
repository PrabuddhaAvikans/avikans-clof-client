import { normalizeBomLines } from "@/lib/bom";
import type { BomLineInput } from "@/types/product";

export function bomLineInputFromFormValues(
  bom: Array<{
    inventoryItemId: string;
    inventoryItemName: string;
    sku: string;
    quantity: number;
    unit: string;
    unitCost: number;
    wastePercent?: number;
    isRequired?: boolean;
    notes?: string;
    sequence?: number;
    alternatives?: BomLineInput["alternatives"];
  }>,
): BomLineInput[] {
  return bom.map((line, index) => ({
    inventoryItemId: line.inventoryItemId,
    inventoryItemName: line.inventoryItemName,
    sku: line.sku,
    quantity: Number(line.quantity) || 0,
    unit: line.unit,
    unitCost: Number(line.unitCost) || 0,
    wastePercent: Number(line.wastePercent) || 0,
    isRequired: line.isRequired ?? true,
    notes: line.notes,
    sequence: line.sequence ?? index + 1,
    alternatives: line.alternatives ?? [],
  }));
}
