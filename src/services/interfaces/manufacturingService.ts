import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { ManufacturingJob, Operation } from "@/types/manufacturing";
import type {
  ManufacturingJobStatusValue,
  PriorityValue,
} from "@/types/status";

export interface ManufacturingListFilters extends PaginatedRequest {
  status?: ManufacturingJobStatusValue;
  salesOrderId?: string;
  assignedTo?: string;
  priority?: PriorityValue;
}

export interface ManufacturingJobFormData {
  salesOrderId: string;
  productId: string;
  quantity: number;
  priority: PriorityValue;
  plannedStartDate: string;
  plannedEndDate: string;
  assignedTo?: string;
  notes?: string;
  status?: ManufacturingJobStatusValue;
  operations?: Operation[];
}

export interface ManufacturingService {
  list(filters: ManufacturingListFilters): Promise<PaginatedResponse<ManufacturingJob>>;
  getById(id: string): Promise<ManufacturingJob>;
  create(data: ManufacturingJobFormData): Promise<ManufacturingJob>;
  update(id: string, data: Partial<ManufacturingJobFormData>): Promise<ManufacturingJob>;
  delete(id: string): Promise<void>;
  reserveMaterials(id: string): Promise<ManufacturingJob>;
  startJob(id: string): Promise<ManufacturingJob>;
  completeJob(id: string): Promise<ManufacturingJob>;
}
