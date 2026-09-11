import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { manufacturingActions } from "@/features/manufacturing/store/manufacturingSlice";
import type {
  ManufacturingJobFormData,
  ManufacturingListFilters,
} from "@/services";
import type { ManufacturingJob, ManufacturingTaskAction, ProductionCompletionInput } from "@/types/manufacturing";
import type { PaginatedResponse } from "@/types/common";

export function useManufacturingJobs(filters: ManufacturingListFilters) {
  return useEpicQuery<ManufacturingListFilters, PaginatedResponse<ManufacturingJob>>({
    arg: filters,
    request: manufacturingActions.fetchListRequest,
    selectEntry: (state, key) => state.manufacturing.lists[key],
  });
}

export function useManufacturingJob(id: string) {
  return useEpicQuery<string, ManufacturingJob>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: manufacturingActions.fetchDetailRequest,
    selectEntry: (state, key) => state.manufacturing.details[key],
  });
}

export function useCreateManufacturingJob() {
  return useEpicMutation<ManufacturingJobFormData, ManufacturingJob>({
    request: manufacturingActions.createRequest,
    selectMutation: (state: RootState) => state.manufacturing.create,
  });
}

export function useUpdateManufacturingJob() {
  return useEpicMutation<
    { id: string; data: Partial<ManufacturingJobFormData> },
    ManufacturingJob
  >({
    request: manufacturingActions.updateRequest,
    selectMutation: (state: RootState) => state.manufacturing.update,
  });
}

export function useReserveMaterials() {
  return useEpicMutation<string, ManufacturingJob>({
    request: manufacturingActions.reserveMaterialsRequest,
    selectMutation: (state: RootState) => state.manufacturing.reserveMaterials,
  });
}

export function useStartManufacturingJob() {
  return useEpicMutation<string, ManufacturingJob>({
    request: manufacturingActions.startRequest,
    selectMutation: (state: RootState) => state.manufacturing.start,
  });
}

export function useCompleteManufacturingJob() {
  return useEpicMutation<
    { id: string; completion?: ProductionCompletionInput },
    ManufacturingJob
  >({
    request: manufacturingActions.completeRequest,
    selectMutation: (state: RootState) => state.manufacturing.complete,
  });
}

export function useHoldManufacturingJob() {
  return useEpicMutation<{ id: string; reason?: string }, ManufacturingJob>({
    request: manufacturingActions.holdRequest,
    selectMutation: (state: RootState) => state.manufacturing.hold,
  });
}

export function useManufacturingTaskAction() {
  return useEpicMutation<
    { id: string; action: ManufacturingTaskAction },
    ManufacturingJob
  >({
    request: manufacturingActions.taskActionRequest,
    selectMutation: (state: RootState) => state.manufacturing.taskAction,
  });
}
