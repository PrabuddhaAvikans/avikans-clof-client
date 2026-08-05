import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { brandsActions } from "@/features/products/store/brandsSlice";
import type { BrandFormData, BrandListFilters } from "@/services";
import type { Brand } from "@/types/brand";
import type { PaginatedResponse } from "@/types/common";

export function useBrands(filters: BrandListFilters) {
  return useEpicQuery<BrandListFilters, PaginatedResponse<Brand>>({
    arg: filters,
    request: brandsActions.fetchListRequest,
    selectEntry: (state, key) => state.brands.lists[key],
  });
}

export function useBrand(id: string) {
  return useEpicQuery<string, Brand>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: brandsActions.fetchDetailRequest,
    selectEntry: (state, key) => state.brands.details[key],
  });
}

export function useCreateBrand() {
  return useEpicMutation<BrandFormData, Brand>({
    request: brandsActions.createRequest,
    selectMutation: (state: RootState) => state.brands.create,
  });
}

export function useUpdateBrand() {
  return useEpicMutation<
    { id: string; data: Partial<BrandFormData> },
    Brand
  >({
    request: brandsActions.updateRequest,
    selectMutation: (state: RootState) => state.brands.update,
  });
}

export function useDeleteBrand() {
  return useEpicMutation<string, string>({
    request: brandsActions.deleteRequest,
    selectMutation: (state: RootState) => state.brands.remove,
  });
}
