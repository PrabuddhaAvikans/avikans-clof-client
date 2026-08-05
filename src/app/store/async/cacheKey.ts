/** Stable JSON key for filter objects used as cache keys. */
export function cacheKey(value: unknown): string {
  return JSON.stringify(value ?? null);
}
