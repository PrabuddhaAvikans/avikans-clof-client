import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { CostingRequest } from "@/types/costing";
import type { CostingRequestStatusValue } from "@/types/status";

export interface CostingListFilters extends PaginatedRequest {
  status?: CostingRequestStatusValue;
}

export interface CostingService {
  list(filters: CostingListFilters): Promise<PaginatedResponse<CostingRequest>>;
  getById(id: string): Promise<CostingRequest>;
  approve(id: string, comment?: string): Promise<CostingRequest>;
  reject(id: string, comment: string): Promise<CostingRequest>;
  requestChanges(id: string, comment: string): Promise<CostingRequest>;
  updateNotes(id: string, notes: string): Promise<CostingRequest>;
  addComment(id: string, comment: string): Promise<CostingRequest>;
}
