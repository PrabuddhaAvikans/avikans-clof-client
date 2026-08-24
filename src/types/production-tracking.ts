import type { ManufacturingJobStatusValue } from "@/types/status";

export interface ProductionStageTask {
  id: string;
  name: string;
  sequence: number;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  completedAt?: string;
}

export interface ProductionJob {
  id: string;
  jobNumber: string;
  salesOrderNumber: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  quantity: number;
  /** Current manufacturing task name (not a department/line). */
  currentTaskName: string;
  /** Alias of currentTaskName for existing table layout. */
  line: string;
  supervisorId: string;
  supervisorName: string;
  startDate: string;
  dueDate: string;
  completionPercent: number;
  status: ManufacturingJobStatusValue;
  statusLabel: string;
  stages: ProductionStageTask[];
  materialIssued: number;
  materialConsumed: number;
  materialUnit: string;
  blockers: string[];
  laborHours: number;
  laborCost: number;
  estimatedCost: number;
  actualCost: number;
  qualityOpen: number;
  qualityClosed: number;
  elapsedHours: number;
  remainingHours: number;
  overdueDays?: number;
}

export interface ProductionKpis {
  jobsInProduction: number;
  jobsInProductionTrend: number;
  onHold: number;
  onHoldTrend: number;
  inQualityCheck: number;
  inQualityCheckTrend: number;
  readyToShip: number;
  readyToShipTrend: number;
}

export interface TimelineBlock {
  id: string;
  jobId: string;
  jobNumber: string;
  line: string;
  label: string;
  startHour: number;
  endHour: number;
}

export interface ProductionTrackingSnapshot {
  kpis: ProductionKpis;
  jobs: ProductionJob[];
  timeline: TimelineBlock[];
  lines: string[];
  supervisors: { id: string; name: string }[];
}
