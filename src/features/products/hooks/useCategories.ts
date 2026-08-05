import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { categoriesActions } from "@/features/products/store/categoriesSlice";
import type { CategoryFormData, CategoryListFilters } from "@/services";
import type { Category } from "@/types/category";
import type { PaginatedResponse } from "@/types/common";

type TreeArg = null | Record<string, never>;

export function useCategories(filters: CategoryListFilters) {
  return useEpicQuery<CategoryListFilters, PaginatedResponse<Category>>({
    arg: filters,
    request: categoriesActions.fetchListRequest,
    selectEntry: (state, key) => state.categories.lists[key],
  });
}

export function useCategoryTree(arg: TreeArg = null) {
  return useEpicQuery<TreeArg, Category[]>({
    arg,
    getKey: () => "tree",
    request: categoriesActions.fetchTreeRequest,
    selectEntry: (state) => state.categories.tree,
  });
}

export function useCategory(id: string) {
  return useEpicQuery<string, Category>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: categoriesActions.fetchDetailRequest,
    selectEntry: (state, key) => state.categories.details[key],
  });
}

export function useCreateCategory() {
  return useEpicMutation<CategoryFormData, Category>({
    request: categoriesActions.createRequest,
    selectMutation: (state: RootState) => state.categories.create,
  });
}

export function useUpdateCategory() {
  return useEpicMutation<
    { id: string; data: Partial<CategoryFormData> },
    Category
  >({
    request: categoriesActions.updateRequest,
    selectMutation: (state: RootState) => state.categories.update,
  });
}

export function useDeleteCategory() {
  return useEpicMutation<string, string>({
    request: categoriesActions.deleteRequest,
    selectMutation: (state: RootState) => state.categories.remove,
  });
}
