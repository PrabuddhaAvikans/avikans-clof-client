import { generateId } from "@/services/http";
import {
  calculateLineCost,
  calculateRequiredQuantity,
  calculateTotalMaterialCost,
} from "@/lib/bomCosting";
import type { BomLineSeed } from "@/services/mock/data/products";
import type { BomItem, BomLineInput } from "@/types/product";

type BomLineNormalizeInput = BomLineInput & {
  id?: string;
  requiredQuantity?: number;
  lineCost?: number;
};

export function normalizeBomLine(
  line: BomLineNormalizeInput,
  sequence: number,
  idPrefix: string,
): BomItem {
  const wastePercent = line.wastePercent ?? 0;
  const quantity = line.quantity ?? 1;
  const unitCost = line.unitCost ?? 0;
  const requiredQuantity =
    line.requiredQuantity ?? calculateRequiredQuantity(quantity, wastePercent);
  const lineCost = line.lineCost ?? calculateLineCost(requiredQuantity, unitCost);

  return {
    id: line.id ?? `${idPrefix}-bom-${sequence}`,
    sequence: line.sequence ?? sequence,
    inventoryItemId: line.inventoryItemId,
    inventoryItemName: line.inventoryItemName,
    sku: line.sku,
    quantity,
    unit: line.unit,
    wastePercent,
    requiredQuantity,
    unitCost,
    lineCost,
    isRequired: line.isRequired ?? true,
    notes: line.notes,
    alternatives: (line.alternatives ?? []).map((alt, altIndex) => ({
      id: alt.id ?? `${idPrefix}-bom-${sequence}-alt-${altIndex + 1}`,
      inventoryItemId: alt.inventoryItemId,
      inventoryItemName: alt.inventoryItemName,
      sku: alt.sku,
      unit: alt.unit,
      unitCost: alt.unitCost,
      isApproved: alt.isApproved ?? false,
      notes: alt.notes,
    })),
  };
}

export function normalizeBomLines(
  items: Array<BomLineInput | BomItem | BomLineSeed> | undefined,
  idPrefix: string,
): BomItem[] {
  if (!items?.length) return [];
  return items.map((item, index) =>
    normalizeBomLine(item as BomLineNormalizeInput, index + 1, idPrefix),
  );
}

export function migrateLegacyBomLine(
  line: BomLineSeed | BomLineInput,
  sequence: number,
): BomItem {
  const idPrefix = "id" in line && line.id ? line.id : generateId("bom");
  return normalizeBomLine(
    {
      ...line,
      wastePercent: line.wastePercent ?? 0,
      isRequired: line.isRequired ?? true,
      alternatives: line.alternatives ?? [],
    },
    sequence,
    idPrefix,
  );
}

export { calculateTotalMaterialCost };
