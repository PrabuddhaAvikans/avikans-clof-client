import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import { filterBySearch, paginate, sortItems } from "@/services/http";

export function applyListQuery<T>(
  items: T[],
  request: PaginatedRequest,
  searchFields: (keyof T)[],
  filterFn?: (item: T) => boolean,
): PaginatedResponse<T> {
  let result = items;

  if (filterFn) {
    result = result.filter(filterFn);
  }

  result = filterBySearch(result, request.search, searchFields);
  result = sortItems(result, request.sortBy, request.sortDirection);
  return paginate(result, request);
}

export function cloneData<T>(data: T[]): T[] {
  return structuredClone(data);
}
