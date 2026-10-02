import type { UnitOfMeasure } from "@/lib/unitsOfMeasure";

export function mapUnit(raw: Record<string, unknown>): UnitOfMeasure {
  return {
    id: String(raw.id),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    status: (raw.status as UnitOfMeasure["status"]) ?? "active",
  };
}
