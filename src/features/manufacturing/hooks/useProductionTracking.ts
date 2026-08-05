import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { productionTrackingActions } from "@/features/manufacturing/store/productionTrackingSlice";
import type { ProductionTrackingFilters } from "@/services";
import type {
  ProductionJob,
  ProductionTrackingSnapshot,
} from "@/types/production-tracking";
import type { PaginatedResponse } from "@/types/common";

export function useProductionSnapshot() {
  return useEpicQuery<null, ProductionTrackingSnapshot>({
    arg: null,
    getKey: () => "snapshot",
    request: productionTrackingActions.fetchSnapshotRequest,
    selectEntry: (state, key) => state.productionTracking.snapshot[key],
  });
}

export function useProductionJobs(filters: ProductionTrackingFilters) {
  return useEpicQuery<ProductionTrackingFilters, PaginatedResponse<ProductionJob>>({
    arg: filters,
    request: productionTrackingActions.fetchListRequest,
    selectEntry: (state, key) => state.productionTracking.lists[key],
  });
}

export function useProductionJob(id: string) {
  return useEpicQuery<string, ProductionJob>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: productionTrackingActions.fetchDetailRequest,
    selectEntry: (state, key) => state.productionTracking.details[key],
  });
}

export function useStartProduction() {
  return useEpicMutation<string[], void>({
    request: productionTrackingActions.startRequest,
    selectMutation: (state: RootState) => state.productionTracking.start,
  });
}

export function useUpdateProductionStage() {
  return useEpicMutation<{ id: string; comment?: string }, ProductionJob>({
    request: productionTrackingActions.updateStageRequest,
    selectMutation: (state: RootState) => state.productionTracking.updateStage,
  });
}

export function useHoldProductionJob() {
  return useEpicMutation<{ id: string; reason?: string }, ProductionJob>({
    request: productionTrackingActions.holdRequest,
    selectMutation: (state: RootState) => state.productionTracking.hold,
  });
}

export function useReleaseToQc() {
  return useEpicMutation<string, ProductionJob>({
    request: productionTrackingActions.releaseToQcRequest,
    selectMutation: (state: RootState) => state.productionTracking.releaseToQc,
  });
}
