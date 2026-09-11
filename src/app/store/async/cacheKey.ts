export function cacheKey(value: unknown): string {
  return JSON.stringify(value ?? null);
}
