import type {
  ManufacturingJobStatusValue,
  ManufacturingTaskStatusValue,
  PriorityValue,
} from "@/types/status";

export type ManufacturingTaskStatus = ManufacturingTaskStatusValue;

/** @deprecated Use ManufacturingTaskStatus */
export type OperationStatus = ManufacturingTaskStatus;

export type ManufacturingTaskHistoryAction =
  | "created"
  | "ready"
  | "started"
  | "paused"
  | "resumed"
  | "completed"
  | "on_hold"
  | "blocked"
  | "skipped"
  | "rework_required"
  | "cancelled"
  | "notes_added"
  | "quantity_updated"
  | "reopened";

export interface ManufacturingTaskHistoryEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  occurredAt: string;
  action: ManufacturingTaskHistoryAction;
  oldStatus?: ManufacturingTaskStatus;
  newStatus?: ManufacturingTaskStatus;
  comments?: string;
}

export interface TaskMaterialUsage {
  id: string;
  inventoryItemId: string;
  inventoryItemSku: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  cost?: number;
}

export interface ManufacturingRework {
  id: string;
  reworkNumber: string;
  originalTaskId: string;
  reworkTaskId: string;
  reason: string;
  quantity: number;
  additionalTimeHours?: number;
  additionalMaterials?: TaskMaterialUsage[];
  additionalCost?: number;
  result?: "pending" | "passed" | "failed";
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface ManufacturingTask {
  id: string;
  taskNumber: string;
  productionJobId: string;
  productOperationId?: string;
  sequence: number;
  name: string;
  description?: string;
  isRequired: boolean;
  isEnabled: boolean;
  isQcTask: boolean;
  isTestingTask: boolean;
  isRework: boolean;
  originalTaskId?: string;
  estimatedHours: number;
  actualHours?: number;
  labourCostRate?: number;
  machineName?: string;
  machineCost?: number;
  actualCost?: number;
  assignedTo?: string;
  assignedToName?: string;
  operatorId?: string;
  operatorName?: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  wasteQuantity: number;
  startedQuantity: number;
  status: ManufacturingTaskStatus;
  startedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  notes?: string;
  prerequisiteTaskIds: string[];
  history: ManufacturingTaskHistoryEntry[];
  materialsUsed: TaskMaterialUsage[];
  workstation?: string;
}

/** @deprecated Use ManufacturingTask */
export type Operation = ManufacturingTask;

export interface MaterialRequirement {
  id: string;
  inventoryItemId: string;
  inventoryItemSku: string;
  inventoryItemName: string;
  requiredQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  unit: string;
  status: "pending" | "reserved" | "partial" | "issued";
}

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  inspectorId: string;
  inspectorName: string;
  status: "pending" | "in_progress" | "passed" | "failed" | "rework";
  checklistItems: {
    id: string;
    name: string;
    passed: boolean | null;
    notes?: string;
  }[];
  inspectedAt?: string;
  notes?: string;
}

export interface ManufacturingJob {
  id: string;
  jobNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productSku: string;
  productName: string;
  productVersionId: string;
  productVersionLabel: string;
  quantity: number;
  status: ManufacturingJobStatusValue;
  priority: PriorityValue;
  tasks: ManufacturingTask[];
  reworks: ManufacturingRework[];
  materialRequirements: MaterialRequirement[];
  qualityInspection?: QualityInspection;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progressPercent: number;
  estimatedCost: number;
  actualCost: number;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskActionActor = {
  userId: string;
  userName: string;
};

export type ManufacturingTaskAction =
  | {
      type: "start";
      taskId: string;
      assignedTo?: string;
      assignedToName?: string;
      operatorId?: string;
      operatorName?: string;
      machineName?: string;
      quantityStarted?: number;
      notes?: string;
    }
  | { type: "pause"; taskId: string; notes?: string }
  | { type: "resume"; taskId: string; notes?: string }
  | { type: "hold"; taskId: string; notes?: string }
  | {
      type: "complete";
      taskId: string;
      completedQuantity: number;
      rejectedQuantity?: number;
      wasteQuantity?: number;
      reworkQuantity?: number;
      actualHours?: number;
      notes?: string;
      materialsUsed?: TaskMaterialUsage[];
    }
  | { type: "skip"; taskId: string; notes?: string }
  | { type: "block"; taskId: string; notes?: string }
  | { type: "notes"; taskId: string; notes: string }
  | {
      type: "rework";
      taskId: string;
      reason: string;
      quantity: number;
      notes?: string;
    }
  | {
      type: "qc";
      result: "passed" | "failed" | "rework";
      inspection: QualityInspection;
      failedTaskId?: string;
      reason?: string;
      quantity?: number;
    };
