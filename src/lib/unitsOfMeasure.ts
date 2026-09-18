export type UnitOfMeasure = {
  code: string;
  name: string;
};

export const UNITS_OF_MEASURE_UPDATED_EVENT = "ats-units-of-measure-updated";
const STORAGE_KEY = "ats.unitsOfMeasure";

export const DEFAULT_UNITS_OF_MEASURE: UnitOfMeasure[] = [
  { code: "pcs", name: "Pieces" },
  { code: "set", name: "Set" },
  { code: "kg", name: "Kilogram" },
  { code: "g", name: "Gram" },
  { code: "L", name: "Litre" },
  { code: "ml", name: "Millilitre" },
  { code: "m", name: "Metre" },
  { code: "mm", name: "Millimetre" },
  { code: "box", name: "Box" },
  { code: "reel", name: "Reel" },
  { code: "roll", name: "Roll" },
  { code: "hrs", name: "Hours" },
  { code: "job", name: "Job" },
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
      code: unit.code.trim(),
      name: unit.name.trim(),
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

  const next: UnitOfMeasure = { code, name };
  saveCustomUnits([...loadCustomUnits(), next]);
  return next;
}

export function removeCustomUnitOfMeasure(code: string): void {
  if (isDefaultUnit(code)) return;
  saveCustomUnits(loadCustomUnits().filter((unit) => !sameCode(unit.code, code)));
}
