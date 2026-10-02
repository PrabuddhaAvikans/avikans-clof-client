import type {
  ReprocessingBatch,
  ReprocessingCostBreakdown,
} from "@/types/reprocessing";

function toIso(value: unknown): string {
  if (value == null) return new Date().toISOString();
  if (typeof value === "string") return value;
  return new Date(String(value)).toISOString();
}

function toOptionalIso(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  return new Date(String(value)).toISOString();
}

function toOptionalId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  return String(value);
}

export function mapCosts(raw: Record<string, unknown> | null | undefined): ReprocessingCostBreakdown {
  return {
    labour: Number(raw?.labour ?? 0),
    electricity: Number(raw?.electricity ?? 0),
    machine: Number(raw?.machine ?? 0),
    gas: Number(raw?.gas ?? 0),
    furnace: Number(raw?.furnace ?? 0),
    subcontract: Number(raw?.subcontract ?? 0),
    other: Number(raw?.other ?? 0),
  };
}

export function mapBatch(raw: Record<string, unknown>): ReprocessingBatch {
  return {
    id: String(raw.id),
    batchNumber: String(raw.batchNumber ?? ""),
    status: (raw.status as ReprocessingBatch["status"]) ?? "draft",
    inputScrapLotId: String(raw.inputScrapLotId),
    inputScrapSku: String(raw.inputScrapSku ?? ""),
    inputScrapName: String(raw.inputScrapName ?? ""),
    inputQuantity: Number(raw.inputQuantity ?? 0),
    inputUnit: String(raw.inputUnit ?? ""),
    inputUnitCost: Number(raw.inputUnitCost ?? 0),
    wipLotId: toOptionalId(raw.wipLotId),
    issueMovementId: toOptionalId(raw.issueMovementId),
    costs: mapCosts(raw.costs as Record<string, unknown> | null | undefined),
    totalProcessingCost: Number(raw.totalProcessingCost ?? 0),
    recoveredQuantity:
      raw.recoveredQuantity == null ? undefined : Number(raw.recoveredQuantity),
    processLossQuantity:
      raw.processLossQuantity == null ? undefined : Number(raw.processLossQuantity),
    recoveredUnitCost:
      raw.recoveredUnitCost == null ? undefined : Number(raw.recoveredUnitCost),
    recoveredLotId: toOptionalId(raw.recoveredLotId),
    recoveredLotSku: raw.recoveredLotSku as string | undefined,
    sourceProductionOrderId: raw.sourceProductionOrderId as string | undefined,
    notes: raw.notes as string | undefined,
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    createdAt: toIso(raw.createdAt),
    startedAt: toOptionalIso(raw.startedAt),
    completedAt: toOptionalIso(raw.completedAt),
    updatedAt: toIso(raw.updatedAt),
  };
}

export function mapScrapLot(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    sku: String(raw.sku ?? ""),
    name: String(raw.name ?? ""),
    quantityAvailable: Number(raw.quantityAvailable ?? 0),
    unit: String(raw.unit ?? ""),
    costPrice: Number(raw.costPrice ?? 0),
  };
}
