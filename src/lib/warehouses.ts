export type WarehouseStatus = "active" | "inactive";

export type Warehouse = {
  code: string;
  name: string;
  address: string;
  status: WarehouseStatus;
};

export const WAREHOUSES_UPDATED_EVENT = "ats-warehouses-updated";
export const DEFAULT_WAREHOUSE_NAME = "Main Warehouse";
const STORAGE_KEY = "ats.warehouses";

export const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    code: "MAIN",
    name: DEFAULT_WAREHOUSE_NAME,
    address: "Colombo, Sri Lanka",
    status: "active",
  },
  {
    code: "WHA",
    name: "Warehouse A",
    address: "",
    status: "active",
  },
  {
    code: "WHB",
    name: "Warehouse B",
    address: "",
    status: "active",
  },
];

export function formatWarehouseLabel(warehouse: Pick<Warehouse, "code" | "name">): string {
  return warehouse.code ? `${warehouse.code} - ${warehouse.name}` : warehouse.name;
}

export function suggestWarehouseCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
}

export function toWarehouseFieldOptions(warehouses: Warehouse[]) {
  return warehouses.map((warehouse) => ({
    value: warehouse.name,
    label: formatWarehouseLabel(warehouse),
  }));
}

function isWarehouseStatus(value: unknown): value is WarehouseStatus {
  return value === "active" || value === "inactive";
}

function isWarehouse(value: unknown): value is Warehouse {
  if (!value || typeof value !== "object") return false;
  const warehouse = value as Partial<Warehouse>;
  return (
    typeof warehouse.code === "string" &&
    typeof warehouse.name === "string" &&
    typeof warehouse.address === "string" &&
    isWarehouseStatus(warehouse.status)
  );
}

function normalizeWarehouse(warehouse: Warehouse): Warehouse {
  return {
    code: warehouse.code.trim(),
    name: warehouse.name.trim(),
    address: warehouse.address.trim(),
    status: warehouse.status,
  };
}

function sameValue(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function loadStoredWarehouses(): Warehouse[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const warehouses = parsed.filter(isWarehouse).map(normalizeWarehouse);
    return warehouses.length > 0 ? warehouses : null;
  } catch {
    return null;
  }
}

function persistWarehouses(warehouses: Warehouse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouses.map(normalizeWarehouse)));
  window.dispatchEvent(new Event(WAREHOUSES_UPDATED_EVENT));
}

export function loadWarehouses(): Warehouse[] {
  return loadStoredWarehouses() ?? DEFAULT_WAREHOUSES.map((warehouse) => ({ ...warehouse }));
}

export function findWarehouseByName(name: string): Warehouse | undefined {
  return loadWarehouses().find((warehouse) => sameValue(warehouse.name, name));
}

export function findWarehouseByCode(code: string): Warehouse | undefined {
  return loadWarehouses().find((warehouse) => sameValue(warehouse.code, code));
}

export function addWarehouse(input: Warehouse): Warehouse {
  const next = normalizeWarehouse(input);
  const existingByCode = findWarehouseByCode(next.code);
  if (existingByCode) return existingByCode;
  const existingByName = findWarehouseByName(next.name);
  if (existingByName) return existingByName;

  persistWarehouses([...loadWarehouses(), next]);
  return next;
}

export function updateWarehouse(code: string, input: Warehouse): Warehouse {
  const next = normalizeWarehouse(input);
  const warehouses = loadWarehouses();
  const index = warehouses.findIndex((warehouse) => sameValue(warehouse.code, code));
  if (index === -1) {
    persistWarehouses([...warehouses, next]);
    return next;
  }

  const duplicateCode = warehouses.find(
    (warehouse, warehouseIndex) =>
      warehouseIndex !== index && sameValue(warehouse.code, next.code),
  );
  if (duplicateCode) return duplicateCode;

  const duplicateName = warehouses.find(
    (warehouse, warehouseIndex) =>
      warehouseIndex !== index && sameValue(warehouse.name, next.name),
  );
  if (duplicateName) return duplicateName;

  warehouses[index] = next;
  persistWarehouses(warehouses);
  return next;
}

export function removeWarehouse(code: string): void {
  const remaining = loadWarehouses().filter((warehouse) => !sameValue(warehouse.code, code));
  if (remaining.length === 0) return;
  persistWarehouses(remaining);
}
