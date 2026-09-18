export type CostSheetHandle = {
  id: string;
  name: string;
};

export const COST_SHEET_HANDLES_UPDATED_EVENT = "ats-cost-sheet-handles-updated";
const STORAGE_KEY = "ats.costSheetHandles";

export const DEFAULT_COST_SHEET_HANDLES: CostSheetHandle[] = [
  { id: "packaging", name: "Packaging" },
  { id: "freight", name: "Freight / Transport" },
  { id: "tooling", name: "Tooling" },
  { id: "subcontract", name: "Subcontract" },
  { id: "consumables", name: "Consumables" },
  { id: "testing", name: "Inspection / Testing" },
  { id: "installation", name: "Installation" },
  { id: "warranty", name: "Warranty reserve" },
];

export function toCostSheetHandleOptions(handles: CostSheetHandle[]) {
  return handles.map((handle) => ({
    value: handle.id,
    label: handle.name,
  }));
}

function slugifyHandle(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "handle";
}

function isHandle(value: unknown): value is CostSheetHandle {
  if (!value || typeof value !== "object") return false;
  const handle = value as Partial<CostSheetHandle>;
  return typeof handle.id === "string" && typeof handle.name === "string";
}

function loadCustomHandles(): CostSheetHandle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHandle).map((handle) => ({
      id: handle.id.trim(),
      name: handle.name.trim(),
    }));
  } catch {
    return [];
  }
}

function saveCustomHandles(handles: CostSheetHandle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  window.dispatchEvent(new Event(COST_SHEET_HANDLES_UPDATED_EVENT));
}

function sameId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function loadCostSheetHandles(): CostSheetHandle[] {
  const merged = [...DEFAULT_COST_SHEET_HANDLES];

  for (const handle of loadCustomHandles()) {
    if (!merged.some((existing) => sameId(existing.id, handle.id))) {
      merged.push(handle);
    }
  }

  return merged;
}

export function isDefaultCostSheetHandle(id: string): boolean {
  return DEFAULT_COST_SHEET_HANDLES.some((handle) => sameId(handle.id, id));
}

export function findCostSheetHandle(idOrName: string): CostSheetHandle | undefined {
  const handles = loadCostSheetHandles();
  return (
    handles.find((handle) => sameId(handle.id, idOrName)) ??
    handles.find((handle) => sameName(handle.name, idOrName))
  );
}

export function formatCostSheetHandleLabel(id: string): string {
  return findCostSheetHandle(id)?.name ?? id;
}

export function addCostSheetHandle(name: string): CostSheetHandle {
  const trimmed = name.trim();
  const existing = findCostSheetHandle(trimmed);
  if (existing) return existing;

  const baseId = slugifyHandle(trimmed);
  const handles = loadCostSheetHandles();
  let id = baseId;
  let suffix = 2;
  while (handles.some((handle) => sameId(handle.id, id))) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const next: CostSheetHandle = { id, name: trimmed };
  saveCustomHandles([...loadCustomHandles(), next]);
  return next;
}

export function removeCustomCostSheetHandle(id: string): void {
  if (isDefaultCostSheetHandle(id)) return;
  saveCustomHandles(loadCustomHandles().filter((handle) => !sameId(handle.id, id)));
}
