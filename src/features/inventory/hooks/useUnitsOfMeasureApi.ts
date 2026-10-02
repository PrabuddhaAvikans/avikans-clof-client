import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { unitsOfMeasureActions } from "@/features/inventory/store/unitsOfMeasureSlice";
import type { UnitOfMeasureFormData, UnitOfMeasureListFilters } from "@/services";
import type { UnitOfMeasure } from "@/lib/unitsOfMeasure";
import type { PaginatedResponse } from "@/types/common";

const defaultFilters: UnitOfMeasureListFilters = { page: 1, pageSize: 200 };

export function useUnitsOfMeasureList(
  filters: UnitOfMeasureListFilters = defaultFilters,
) {
  return useEpicQuery<UnitOfMeasureListFilters, PaginatedResponse<UnitOfMeasure>>({
    arg: filters,
    request: unitsOfMeasureActions.fetchListRequest,
    selectEntry: (state, key) => state.unitsOfMeasure.lists[key],
  });
}

export function useCreateUnitOfMeasure() {
  return useEpicMutation<UnitOfMeasureFormData, UnitOfMeasure>({
    request: unitsOfMeasureActions.createRequest,
    selectMutation: (state: RootState) => state.unitsOfMeasure.create,
  });
}

export function useUpdateUnitOfMeasure() {
  return useEpicMutation<
    { id: string; data: Partial<UnitOfMeasureFormData> },
    UnitOfMeasure
  >({
    request: unitsOfMeasureActions.updateRequest,
    selectMutation: (state: RootState) => state.unitsOfMeasure.update,
  });
}

export function useDeleteUnitOfMeasure() {
  return useEpicMutation<string, string>({
    request: unitsOfMeasureActions.deleteRequest,
    selectMutation: (state: RootState) => state.unitsOfMeasure.remove,
  });
}
