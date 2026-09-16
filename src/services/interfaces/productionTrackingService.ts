import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  ProductionJob,
  ProductionTrackingSnapshot,
} from "@/types/production-tracking";

export interface ProductionTrackingFilters extends PaginatedRequest {
  line?: string;
  supervisorId?: string;
  status?: string;
  priority?: string;
  delayedOnly?: boolean;
}

export interface ProductionTrackingService {
  getSnapshot(): Promise<ProductionTrackingSnapshot>;
  listJobs(filters: ProductionTrackingFilters): Promise<PaginatedResponse<ProductionJob>>;
  getJobById(id: string): Promise<ProductionJob>;
  startProduction(ids: string[]): Promise<void>;
  updateStage(id: string, comment?: string): Promise<ProductionJob>;
  holdJob(id: string, reason?: string): Promise<ProductionJob>;
  releaseToQc(id: string): Promise<ProductionJob>;
}
