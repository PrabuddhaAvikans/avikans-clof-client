export const INVENTORY_LOOKUPS_UPDATED_EVENT = "ats-inventory-lookups-updated";
const STORAGE_KEY = "ats.inventoryLookups";

export type InventoryLookupKind = "categories" | "brands" | "suppliers" | "taxCodes";

export type InventoryLookups = Record<InventoryLookupKind, string[]>;

const DEFAULT_LOOKUPS: InventoryLookups = {
  categories: [
    "Components",
    "Electronics",
    "Raw Materials",
    "Hardware",
    "Finishing",
    "Packaging",
    "Coatings",
    "Consumables",
    "Services",
  ],
  brands: [],
  suppliers: [],
  taxCodes: ["VAT 18%", "VAT 0%", "Exempt", "N/A"],
};

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function isLookups(value: unknown): value is InventoryLookups {
  if (!value || typeof value !== "object") return false;
  const lookups = value as Partial<InventoryLookups>;
  return (
    Array.isArray(lookups.categories) &&
    Array.isArray(lookups.brands) &&
    Array.isArray(lookups.suppliers) &&
    Array.isArray(lookups.taxCodes)
  );
}

export function loadInventoryLookups(): InventoryLookups {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LOOKUPS, categories: [...DEFAULT_LOOKUPS.categories], taxCodes: [...DEFAULT_LOOKUPS.taxCodes] };
    const parsed = JSON.parse(raw) as unknown;
    if (!isLookups(parsed)) return { ...DEFAULT_LOOKUPS };
    return {
      categories: uniqueNames([...DEFAULT_LOOKUPS.categories, ...parsed.categories]),
      brands: uniqueNames([...DEFAULT_LOOKUPS.brands, ...parsed.brands]),
      suppliers: uniqueNames([...DEFAULT_LOOKUPS.suppliers, ...parsed.suppliers]),
      taxCodes: uniqueNames([...DEFAULT_LOOKUPS.taxCodes, ...parsed.taxCodes]),
    };
  } catch {
    return {
      categories: [...DEFAULT_LOOKUPS.categories],
      brands: [],
      suppliers: [],
      taxCodes: [...DEFAULT_LOOKUPS.taxCodes],
    };
  }
}

function persistLookups(lookups: InventoryLookups): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lookups));
  window.dispatchEvent(new Event(INVENTORY_LOOKUPS_UPDATED_EVENT));
}

export function addInventoryLookup(kind: InventoryLookupKind, value: string): string {
  const trimmed = value.trim();
  const current = loadInventoryLookups();
  const existing = current[kind].find((item) => item.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  persistLookups({ ...current, [kind]: uniqueNames([...current[kind], trimmed]) });
  return trimmed;
}

export function toLookupOptions(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((value) => ({ value, label: value }));
}
