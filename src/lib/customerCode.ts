/** Matches Customers.Infrastructure NextCodeAsync: CUS-{year}-{####}. */
export function suggestCustomerCode(existingCodes: string[] = []): string {
  const year = new Date().getFullYear();
  const prefix = `CUS-${year}-`;
  const taken = existingCodes
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.startsWith(prefix));

  const next =
    taken
      .map((code) => {
        const n = Number.parseInt(code.slice(prefix.length), 10);
        return Number.isFinite(n) ? n : 0;
      })
      .reduce((max, n) => Math.max(max, n), 0) + 1;

  return `${prefix}${String(next).padStart(4, "0")}`;
}
