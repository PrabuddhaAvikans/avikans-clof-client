import type { Warehouse, WarehouseStatus } from "@/lib/warehouses";

export function mapWarehouse(raw: Record<string, unknown>): Warehouse {
  return {
    id: String(raw.id),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    status: (raw.status as WarehouseStatus) ?? "active",
  };
}
