export type AccessoryHandle = {
  id: string;
  name: string;
};

export const ACCESSORY_HANDLES_UPDATED_EVENT = "ats-accessory-handles-updated";
const STORAGE_KEY = "ats.accessoryHandles";

export const DEFAULT_ACCESSORY_HANDLES: AccessoryHandle[] = [
  { id: "driver", name: "Driver / Power supply" },
  { id: "mounting-kit", name: "Mounting kit" },
  { id: "suspension-kit", name: "Suspension kit" },
  { id: "diffuser", name: "Diffuser / Lens" },
  { id: "reflector", name: "Reflector" },
  { id: "remote", name: "Remote control" },
  { id: "sensor", name: "Sensor" },
  { id: "emergency-pack", name: "Emergency pack" },
  { id: "track-adapter", name: "Track adapter" },
  { id: "cable", name: "Cable / Connector" },
  { id: "end-cap", name: "End cap / Cover" },
];

export function toAccessoryHandleOptions(handles: AccessoryHandle[]) {
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
  return slug || "accessory";
}

function isHandle(value: unknown): value is AccessoryHandle {
  if (!value || typeof value !== "object") return false;
  const handle = value as Partial<AccessoryHandle>;
  return typeof handle.id === "string" && typeof handle.name === "string";
}

function loadCustomHandles(): AccessoryHandle[] {
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

function saveCustomHandles(handles: AccessoryHandle[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  window.dispatchEvent(new Event(ACCESSORY_HANDLES_UPDATED_EVENT));
}

function sameId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function loadAccessoryHandles(): AccessoryHandle[] {
  const merged = [...DEFAULT_ACCESSORY_HANDLES];

  for (const handle of loadCustomHandles()) {
    if (!merged.some((existing) => sameId(existing.id, handle.id))) {
      merged.push(handle);
    }
  }

  return merged;
}

export function findAccessoryHandle(idOrName: string): AccessoryHandle | undefined {
  const handles = loadAccessoryHandles();
  return (
    handles.find((handle) => sameId(handle.id, idOrName)) ??
    handles.find((handle) => sameName(handle.name, idOrName))
  );
}

export function formatAccessoryHandleLabel(id: string): string {
  return findAccessoryHandle(id)?.name ?? id;
}

export function addAccessoryHandle(name: string): AccessoryHandle {
  const trimmed = name.trim();
  const existing = findAccessoryHandle(trimmed);
  if (existing) return existing;

  const baseId = slugifyHandle(trimmed);
  const handles = loadAccessoryHandles();
  let id = baseId;
  let suffix = 2;
  while (handles.some((handle) => sameId(handle.id, id))) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const next: AccessoryHandle = { id, name: trimmed };
  saveCustomHandles([...loadCustomHandles(), next]);
  return next;
}
