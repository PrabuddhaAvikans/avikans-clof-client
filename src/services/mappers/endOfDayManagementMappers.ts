const ID_KEY = /^(id|.+Id)$/i;
const DATE_KEY =
  /^(businessDate|postingBusinessDate|originalBusinessDate|.+At)$/i;

function isIdOrDateKey(key: string): boolean {
  return ID_KEY.test(key) || DATE_KEY.test(key);
}

/** Recursively stringify Guid/id and DateTimeOffset/date fields on known shapes. */
export function mapUnknown<T>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (Array.isArray(value)) {
    return value.map((item) => mapUnknown(item)) as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === null || child === undefined) {
        result[key] = child;
      } else if (typeof child === "object") {
        result[key] = mapUnknown(child);
      } else if (isIdOrDateKey(key)) {
        result[key] = String(child);
      } else {
        result[key] = child;
      }
    }
    return result as T;
  }
  return value as T;
}
