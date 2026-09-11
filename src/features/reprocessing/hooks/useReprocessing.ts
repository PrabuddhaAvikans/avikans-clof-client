import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { reprocessingActions } from "@/features/reprocessing/store/reprocessingSlice";
import type { ReprocessingListFilters } from "@/services/interfaces/reprocessingService";
import type {
  CompleteReprocessingInput,
  CreateReprocessingBatchInput,
  ReprocessingBatch,
} from "@/types/reprocessing";
import type { PaginatedResponse } from "@/types/common";

type ScrapLot = {
  id: string;
  sku: string;
  name: string;
  quantityAvailable: number;
  unit: string;
  costPrice: number;
};

export function useReprocessingBatches(filters: ReprocessingListFilters) {
  return useEpicQuery<ReprocessingListFilters, PaginatedResponse<ReprocessingBatch>>({
    arg: filters,
    request: reprocessingActions.fetchListRequest,
    selectEntry: (state, key) => state.reprocessing.lists[key],
  });
}

export function useReprocessingBatch(id: string) {
  return useEpicQuery<string, ReprocessingBatch>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: reprocessingActions.fetchDetailRequest,
    selectEntry: (state, key) => state.reprocessing.details[key],
  });
}

export function useReusableScrapLots() {
  return useEpicQuery<null, ScrapLot[]>({
    arg: null,
    getKey: () => "scrap-lots",
    request: reprocessingActions.fetchScrapLotsRequest,
    selectEntry: (state, key) => state.reprocessing.scrapLots[key],
  });
}

export function useCreateReprocessingBatch() {
  return useEpicMutation<CreateReprocessingBatchInput, ReprocessingBatch>({
    request: reprocessingActions.createRequest,
    selectMutation: (state: RootState) => state.reprocessing.create,
  });
}

export function useStartReprocessingBatch() {
  return useEpicMutation<string, ReprocessingBatch>({
    request: reprocessingActions.startRequest,
    selectMutation: (state: RootState) => state.reprocessing.start,
  });
}

export function useCompleteReprocessingBatch() {
  return useEpicMutation<
    { id: string; data: CompleteReprocessingInput },
    ReprocessingBatch
  >({
    request: reprocessingActions.completeRequest,
    selectMutation: (state: RootState) => state.reprocessing.complete,
  });
}
