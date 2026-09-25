import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  ManufacturingJob,
  ManufacturingTask,
  ManufacturingTaskAction,
  ProductionCompletionInput,
  QualityInspection,
  TaskContributorInput,
} from "@/types/manufacturing";
import type { ActiveSessionSwitch } from "@/types/employee-work";
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

export interface BulkCompleteTaskEntry {
  taskId: string;
  completedQuantity?: number;
  rejectedQuantity?: number;
  wasteQuantity?: number;
  contributors?: TaskContributorInput[];
  actualHours?: number;
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  notes?: string;
}

export interface BulkCompleteTasksInput {
  tasks?: BulkCompleteTaskEntry[];
  taskIds?: string[];
  notes?: string;
  activeSessionSwitch?: ActiveSessionSwitch;
}

export interface ManufacturingService {
  list(filters: ManufacturingListFilters): Promise<PaginatedResponse<ManufacturingJob>>;
  getById(id: string): Promise<ManufacturingJob>;
  create(data: ManufacturingJobFormData): Promise<ManufacturingJob>;
  update(id: string, data: Partial<ManufacturingJobFormData>): Promise<ManufacturingJob>;
  delete(id: string): Promise<void>;
  reserveMaterials(id: string): Promise<ManufacturingJob>;
  startJob(id: string): Promise<ManufacturingJob>;
  completeJob(id: string, completion?: ProductionCompletionInput): Promise<ManufacturingJob>;
  holdJob(id: string, reason?: string): Promise<ManufacturingJob>;
  applyTaskAction(id: string, action: ManufacturingTaskAction): Promise<ManufacturingJob>;
  completeTasks(id: string, input: BulkCompleteTasksInput): Promise<ManufacturingJob>;
}
