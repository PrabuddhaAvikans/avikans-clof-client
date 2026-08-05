import type { PaginatedRequest, PaginatedResponse, SortDirection } from "@/types/common";

const DEFAULT_DELAY_MS = 300;

export async function delay(ms = DEFAULT_DELAY_MS): Promise<void> {
  const jitter = Math.floor(Math.random() * 100);
  await new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

export function simulateError(errorRate = 0): void {
  if (errorRate > 0 && Math.random() < errorRate) {
    throw {
      code: "SIMULATED_ERROR",
      message: "A simulated network error occurred.",
      traceId: crypto.randomUUID(),
    };
  }
}

export function paginate<T>(
  items: T[],
  request: PaginatedRequest,
): PaginatedResponse<T> {
  const { page, pageSize } = request;
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function filterBySearch<T>(
  items: T[],
  search: string | undefined,
  fields: (keyof T)[],
): T[] {
  if (!search?.trim()) {
    return items;
  }

  const term = search.trim().toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === "string") {
        return value.toLowerCase().includes(term);
      }
      if (typeof value === "number") {
        return String(value).includes(term);
      }
      if (Array.isArray(value)) {
        return value.some((entry) => String(entry).toLowerCase().includes(term));
      }
      return false;
    }),
  );
}

export function sortItems<T>(
  items: T[],
  sortBy?: string,
  sortDirection: SortDirection = "asc",
): T[] {
  if (!sortBy) {
    return items;
  }

  const direction = sortDirection === "desc" ? -1 : 1;
  const key = sortBy as keyof T;

  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * direction;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * direction;
    }

    return String(aVal).localeCompare(String(bVal)) * direction;
  });
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function notFoundError(entity: string, id: string): never {
  throw {
    code: "NOT_FOUND",
    message: `${entity} with id '${id}' was not found.`,
    traceId: crypto.randomUUID(),
  };
}
