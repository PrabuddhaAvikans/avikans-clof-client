import type { ManufacturingJobStatusValue, PriorityValue } from "@/types/status";

export interface ProductionStageTask {
  id: string;
  name: string;
  sequence: number;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  progressPercent: number;
  completedAt?: string;
}

export interface ProductionJob {
  id: string;
  jobNumber: string;
  salesOrderNumber: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  customerName: string;
  quantity: number;
  priority: PriorityValue;
  currentTaskName: string;
  line: string;
  supervisorId: string;
  supervisorName: string;
  startDate: string;
  dueDate: string;
  completionPercent: number;
  status: ManufacturingJobStatusValue;
  statusLabel: string;
  completedAt?: string;
  stages: ProductionStageTask[];
  materialIssued: number;
  materialConsumed: number;
  materialUnit: string;
  materialsReady: boolean;
  blockers: string[];
  laborHours: number;
  overtimeHours: number;
  normalOvertimeHours: number;
  doubleOvertimeHours: number;
  laborCost: number;
  overtimeCost: number;
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
  delayedJobs: number;
  delayedJobsTrend: number;
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
