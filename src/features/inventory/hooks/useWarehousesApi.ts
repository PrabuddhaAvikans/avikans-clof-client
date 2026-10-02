import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { warehousesActions } from "@/features/inventory/store/warehousesSlice";
import type { WarehouseFormData, WarehouseListFilters } from "@/services";
import type { Warehouse } from "@/lib/warehouses";
import type { PaginatedResponse } from "@/types/common";

const defaultFilters: WarehouseListFilters = { page: 1, pageSize: 200 };

export function useWarehousesList(filters: WarehouseListFilters = defaultFilters) {
  return useEpicQuery<WarehouseListFilters, PaginatedResponse<Warehouse>>({
    arg: filters,
    request: warehousesActions.fetchListRequest,
    selectEntry: (state, key) => state.warehouses.lists[key],
  });
}

export function useCreateWarehouse() {
  return useEpicMutation<WarehouseFormData, Warehouse>({
    request: warehousesActions.createRequest,
    selectMutation: (state: RootState) => state.warehouses.create,
  });
}

export function useUpdateWarehouse() {
  return useEpicMutation<{ id: string; data: Partial<WarehouseFormData> }, Warehouse>({
    request: warehousesActions.updateRequest,
    selectMutation: (state: RootState) => state.warehouses.update,
  });
}

export function useDeleteWarehouse() {
  return useEpicMutation<string, string>({
    request: warehousesActions.deleteRequest,
    selectMutation: (state: RootState) => state.warehouses.remove,
  });
}
