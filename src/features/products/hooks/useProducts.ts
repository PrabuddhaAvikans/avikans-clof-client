import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { productsActions } from "@/features/products/store/productsSlice";
import type { ProductListFilters } from "@/services";
import type {
  Product,
  ProductFormData,
  ProductHeaderFormData,
  ProductVersionFormData,
} from "@/types/product";
import type { PaginatedResponse } from "@/types/common";

export function useProducts(filters: ProductListFilters) {
  return useEpicQuery<ProductListFilters, PaginatedResponse<Product>>({
    arg: filters,
    request: productsActions.fetchListRequest,
    selectEntry: (state, key) => state.products.lists[key],
  });
}

export function useProduct(id: string) {
  return useEpicQuery<string, Product>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: productsActions.fetchDetailRequest,
    selectEntry: (state, key) => state.products.details[key],
  });
}

export function useCreateProduct() {
  return useEpicMutation<ProductFormData, Product>({
    request: productsActions.createRequest,
    selectMutation: (state: RootState) => state.products.create,
  });
}

export function useUpdateProduct() {
  return useEpicMutation<
    { id: string; data: Partial<ProductFormData> },
    Product
  >({
    request: productsActions.updateRequest,
    selectMutation: (state: RootState) => state.products.update,
  });
}

export function useUpdateProductVersion() {
  return useEpicMutation<
    { productId: string; versionId: string; data: ProductVersionFormData },
    Product
  >({
    request: productsActions.updateVersionRequest,
    selectMutation: (state: RootState) => state.products.updateVersion,
  });
}

export function useReviseProductVersion() {
  return useEpicMutation<
    { productId: string; sourceVersionId: string; revisionNotes?: string },
    Product
  >({
    request: productsActions.reviseVersionRequest,
    selectMutation: (state: RootState) => state.products.reviseVersion,
  });
}

export function useUpdateProductHeader() {
  return useEpicMutation<
    { productId: string; data: ProductHeaderFormData },
    Product
  >({
    request: productsActions.updateHeaderRequest,
    selectMutation: (state: RootState) => state.products.updateHeader,
  });
}

export function useDeleteProduct() {
  return useEpicMutation<string, string>({
    request: productsActions.deleteRequest,
    selectMutation: (state: RootState) => state.products.remove,
  });
}
