export type UnitOfMeasure = {
  id: string;
  code: string;
  name: string;
  status?: "active" | "inactive";
};

export const UNITS_OF_MEASURE_UPDATED_EVENT = "ats-units-of-measure-updated";
const STORAGE_KEY = "ats.unitsOfMeasure";

export const DEFAULT_UNITS_OF_MEASURE: UnitOfMeasure[] = [
  { id: "uom-pcs", code: "pcs", name: "Pieces", status: "active" },
  { id: "uom-set", code: "set", name: "Set", status: "active" },
  { id: "uom-kg", code: "kg", name: "Kilogram", status: "active" },
  { id: "uom-g", code: "g", name: "Gram", status: "active" },
  { id: "uom-L", code: "L", name: "Litre", status: "active" },
  { id: "uom-ml", code: "ml", name: "Millilitre", status: "active" },
  { id: "uom-m", code: "m", name: "Metre", status: "active" },
  { id: "uom-mm", code: "mm", name: "Millimetre", status: "active" },
  { id: "uom-box", code: "box", name: "Box", status: "active" },
  { id: "uom-reel", code: "reel", name: "Reel", status: "active" },
  { id: "uom-roll", code: "roll", name: "Roll", status: "active" },
  { id: "uom-hrs", code: "hrs", name: "Hours", status: "active" },
  { id: "uom-job", code: "job", name: "Job", status: "active" },
];

export function formatUnitLabel(unit: Pick<UnitOfMeasure, "code" | "name">): string {
  return `${unit.code} - ${unit.name}`;
}

export function toUnitFieldOptions(units: UnitOfMeasure[]) {
  return units.map((unit) => ({
    value: unit.code,
    label: formatUnitLabel(unit),
  }));
}

function isUnit(value: unknown): value is UnitOfMeasure {
  if (!value || typeof value !== "object") return false;
  const unit = value as Partial<UnitOfMeasure>;
  return typeof unit.code === "string" && typeof unit.name === "string";
}

function loadCustomUnits(): UnitOfMeasure[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUnit).map((unit) => ({
      id: unit.id?.trim() || `uom-${unit.code.trim().toLowerCase()}`,
      code: unit.code.trim(),
      name: unit.name.trim(),
      status: unit.status ?? "active",
    }));
  } catch {
    return [];
  }
}

function saveCustomUnits(units: UnitOfMeasure[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  window.dispatchEvent(new Event(UNITS_OF_MEASURE_UPDATED_EVENT));
}

function sameCode(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function loadUnitsOfMeasure(): UnitOfMeasure[] {
  const merged = [...DEFAULT_UNITS_OF_MEASURE];

  for (const unit of loadCustomUnits()) {
    if (!merged.some((existing) => sameCode(existing.code, unit.code))) {
      merged.push(unit);
    }
  }

  return merged;
}

export function isDefaultUnit(code: string): boolean {
  return DEFAULT_UNITS_OF_MEASURE.some((unit) => sameCode(unit.code, code));
}

export function findUnitOfMeasure(code: string): UnitOfMeasure | undefined {
  return loadUnitsOfMeasure().find((unit) => sameCode(unit.code, code));
}

export function addUnitOfMeasure(input: UnitOfMeasure): UnitOfMeasure {
  const code = input.code.trim();
  const name = input.name.trim();
  const existing = findUnitOfMeasure(code);
  if (existing) return existing;

  const next: UnitOfMeasure = {
    id: `uom-${code.toLowerCase()}`,
    code,
    name,
    status: "active",
  };
  saveCustomUnits([...loadCustomUnits(), next]);
  return next;
}

export function removeCustomUnitOfMeasure(code: string): void {
  if (isDefaultUnit(code)) return;
  saveCustomUnits(loadCustomUnits().filter((unit) => !sameCode(unit.code, code)));
}
