import type { ActiveSessionSwitch } from "@/types/employee-work";
import type {
  ManufacturingJobStatusValue,
  ManufacturingTaskStatusValue,
  PriorityValue,
} from "@/types/status";

export type ManufacturingTaskStatus = ManufacturingTaskStatusValue;

export type OperationStatus = ManufacturingTaskStatus;

export type ManufacturingTaskHistoryAction =
  | "created"
  | "ready"
  | "started"
  | "paused"
  | "stopped"
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

export type TaskContributorStatus =
  | "assigned"
  | "in_progress"
  | "paused"
  | "on_hold"
  | "completed";

export type TaskUnitStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TaskUnitAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "paused"
  | "on_hold"
  | "completed";

export interface TaskUnitAssignment {
  id: string;
  taskUnitId: string;
  userId: string;
  userName: string;
  contributionPercentage: number;
  status: TaskUnitAssignmentStatus;
  actualHours: number;
  overtimeHours: number;
  normalOvertimeHours: number;
  doubleOvertimeHours: number;
  laborCost: number;
  rejectedQuantity: number;
  wasteQuantity: number;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
}

export interface TaskUnit {
  id: string;
  taskId: string;
  unitNo: number;
  progressPercentage: number;
  status: TaskUnitStatus;
  assignments: TaskUnitAssignment[];
}

export interface TaskWorkerProgress {
  userId: string;
  userName: string;
  assignedQuantity: number;
  completedQuantity: number;
  inProgressQuantity: number;
  progressPercentage: number;
  status: TaskUnitAssignmentStatus;
  contributionPercentage: number;
  actualHours: number;
  overtimeHours: number;
  normalOvertimeHours: number;
  doubleOvertimeHours: number;
  laborCost: number;
  rejectedQuantity: number;
  wasteQuantity: number;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
}

/** Aggregated people row derived from task units (kept for labour/reporting UI). */
export interface TaskContributor {
  userId: string;
  userName: string;
  contributionPercent: number;
  quantity: number;
  rejectedQuantity: number;
  wasteQuantity: number;
  actualHours: number;
  overtimeHours: number;
  normalOvertimeHours: number;
  doubleOvertimeHours: number;
  laborCost: number;
  status: TaskContributorStatus;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  /** Average progress across this worker's assigned units. */
  progressPercentage?: number;
  completedQuantity?: number;
  inProgressQuantity?: number;
}

export type TaskContributorInput = {
  userId: string;
  userName: string;
  contributionPercent?: number;
  quantity?: number;
  rejectedQuantity?: number;
  wasteQuantity?: number;
  actualHours?: number;
  overtimeHours?: number;
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  /** Optional unit progress when updating allocated units (0–100). Defaults to 100 when finishing. */
  progressPercentage?: number;
  /** When set, apply this person to these unit numbers (same physical qty shared by multiple people). */
  unitNos?: number[];
};

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
  overtimeHours?: number;
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  labourCostRate?: number;
  machineName?: string;
  machineCost?: number;
  actualCost?: number;
  assignedTo?: string;
  assignedToName?: string;
  operatorId?: string;
  operatorName?: string;
  contributors: TaskContributor[];
  /** Physical quantity units — source of truth for qty-wise progress. */
  units: TaskUnit[];
  plannedQuantity: number;
  completedQuantity: number;
  /** Units with 0 < progress < 100. */
  partiallyCompletedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  wasteQuantity: number;
  startedQuantity: number;
  /** Average of unit progress percentages (0–100). */
  overallProgress: number;
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
  issuedFromInventoryItemId?: string;
  issuedStockMovementId?: string;
  issuedUnitCost?: number;
}

export interface ProductionCompletionInput {
  finishedMaterialQuantity: number;
  reusableScrapQuantity: number;
  recoverableQuantity?: number;
  permanentWasteQuantity: number;
  notes?: string;
}

export interface ProductionMaterialOutcome {
  finishedMaterialQuantity: number;
  reusableScrapQuantity: number;
  recoverableQuantity: number;
  permanentWasteQuantity: number;
  postedAt: string;
  scrapLotIds: string[];
  recoverableLotIds: string[];
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
  materialOutcome?: ProductionMaterialOutcome;
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
      contributors?: TaskContributorInput[];
      notes?: string;
      /** Set only after the supervisor confirms a switch away from other active work. */
      activeSessionSwitch?: ActiveSessionSwitch;
    }
  | { type: "pause"; taskId: string; notes?: string }
  | { type: "resume"; taskId: string; notes?: string; activeSessionSwitch?: ActiveSessionSwitch }
  | { type: "hold"; taskId: string; notes?: string }
  | {
      type: "complete";
      taskId: string;
      completedQuantity?: number;
      rejectedQuantity?: number;
      wasteQuantity?: number;
      reworkQuantity?: number;
      actualHours?: number;
      overtimeHours?: number;
      normalOvertimeHours?: number;
      doubleOvertimeHours?: number;
      contributors?: TaskContributorInput[];
      notes?: string;
      materialsUsed?: TaskMaterialUsage[];
      /** Set only after the supervisor confirms a switch away from other active work. */
      activeSessionSwitch?: ActiveSessionSwitch;
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
