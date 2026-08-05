import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { inventoryActions } from "@/features/inventory/store/inventorySlice";
import type {
  InventoryFormData,
  InventoryListFilters,
  StockMovementFilters,
} from "@/services";
import type {
  InventoryItem,
  StockMovement,
  StockMovementTypeValue,
} from "@/types/inventory";
import type { PaginatedResponse } from "@/types/common";

export function useInventoryItems(filters: InventoryListFilters) {
  return useEpicQuery<InventoryListFilters, PaginatedResponse<InventoryItem>>({
    arg: filters,
    request: inventoryActions.fetchListRequest,
    selectEntry: (state, key) => state.inventory.lists[key],
  });
}

export function useInventoryItem(id: string) {
  return useEpicQuery<string, InventoryItem>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: inventoryActions.fetchDetailRequest,
    selectEntry: (state, key) => state.inventory.details[key],
  });
}

export function useLowStockItems() {
  return useEpicQuery<null, InventoryItem[]>({
    arg: null,
    getKey: () => "low-stock",
    request: inventoryActions.fetchLowStockRequest,
    selectEntry: (state, key) => state.inventory.lowStock[key],
  });
}

export function useStockMovements(filters: StockMovementFilters) {
  return useEpicQuery<StockMovementFilters, PaginatedResponse<StockMovement>>({
    arg: filters,
    request: inventoryActions.fetchMovementsRequest,
    selectEntry: (state, key) => state.inventory.movements[key],
  });
}

export function useCreateInventoryItem() {
  return useEpicMutation<InventoryFormData, InventoryItem>({
    request: inventoryActions.createRequest,
    selectMutation: (state: RootState) => state.inventory.create,
  });
}

export function useUpdateInventoryItem() {
  return useEpicMutation<
    { id: string; data: Partial<InventoryFormData> },
    InventoryItem
  >({
    request: inventoryActions.updateRequest,
    selectMutation: (state: RootState) => state.inventory.update,
  });
}

export function useRecordStockMovement() {
  return useEpicMutation<
    {
      inventoryItemId: string;
      type: StockMovementTypeValue;
      quantity: number;
      reference?: { referenceType: string; referenceId: string; notes?: string };
    },
    StockMovement
  >({
    request: inventoryActions.recordMovementRequest,
    selectMutation: (state: RootState) => state.inventory.recordMovement,
  });
}
