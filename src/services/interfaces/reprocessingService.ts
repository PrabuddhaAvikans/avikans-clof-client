import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  CompleteReprocessingInput,
  CreateReprocessingBatchInput,
  ReprocessingBatch,
  ReprocessingBatchStatusValue,
} from "@/types/reprocessing";

export interface ReprocessingListFilters extends PaginatedRequest {
  status?: ReprocessingBatchStatusValue;
  inputScrapLotId?: string;
}

export interface ReprocessingService {
  list(filters: ReprocessingListFilters): Promise<PaginatedResponse<ReprocessingBatch>>;
  getById(id: string): Promise<ReprocessingBatch>;
  create(data: CreateReprocessingBatchInput): Promise<ReprocessingBatch>;
  start(id: string): Promise<ReprocessingBatch>;
  complete(id: string, data: CompleteReprocessingInput): Promise<ReprocessingBatch>;
  cancel(id: string, reason?: string): Promise<ReprocessingBatch>;
  listReusableScrapLots(): Promise<
    {
      id: string;
      sku: string;
      name: string;
      quantityAvailable: number;
      unit: string;
      costPrice: number;
    }[]
  >;
}
