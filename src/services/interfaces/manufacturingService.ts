import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  ManufacturingJob,
  ManufacturingTask,
  ManufacturingTaskAction,
  QualityInspection,
} from "@/types/manufacturing";
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
  productVersionId?: string;
  quantity: number;
  priority: PriorityValue;
  plannedStartDate: string;
  plannedEndDate: string;
  assignedTo?: string;
  notes?: string;
  status?: ManufacturingJobStatusValue;
  tasks?: ManufacturingTask[];
  qualityInspection?: QualityInspection;
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
  holdJob(id: string, reason?: string): Promise<ManufacturingJob>;
  applyTaskAction(id: string, action: ManufacturingTaskAction): Promise<ManufacturingJob>;
}
