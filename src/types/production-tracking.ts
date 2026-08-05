export const PRODUCTION_STAGES = [
  "order_confirmed",
  "material_ready",
  "fabrication",
  "coating",
  "assembly",
  "testing",
  "qc",
  "packed",
] as const;

export type ProductionStage = (typeof PRODUCTION_STAGES)[number];

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  order_confirmed: "Order Confirmed",
  material_ready: "Material Ready",
  fabrication: "Fabrication",
  coating: "Coating",
  assembly: "Assembly",
  testing: "Testing",
  qc: "QC",
  packed: "Packed",
};

export type ProductionStageTaskStatus = "pending" | "in_progress" | "completed";

export interface ProductionStageTask {
  stage: ProductionStage;
  status: ProductionStageTaskStatus;
  completedAt?: string;
  notes?: string;
}

export interface ProductionJob {
  id: string;
  jobNumber: string;
  salesOrderNumber: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  quantity: number;
  line: string;
  supervisorId: string;
  supervisorName: string;
  startDate: string;
  dueDate: string;
  completionPercent: number;
  status: ProductionStage | "on_hold";
  statusLabel: string;
  stages: ProductionStageTask[];
  materialIssued: number;
  materialConsumed: number;
  materialUnit: string;
  blockers: string[];
  laborHours: number;
  laborCost: number;
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

export interface PipelineStageCount {
  stage: ProductionStage;
  label: string;
  count: number;
}

export interface TimelineBlock {
  id: string;
  jobId: string;
  jobNumber: string;
  line: string;
  stage: ProductionStage;
  label: string;
  startHour: number;
  endHour: number;
}

export interface OverdueMilestone {
  id: string;
  jobId: string;
  jobNumber: string;
  stage: ProductionStage;
  label: string;
  overdueDays: number;
}

export interface ProductionTrackingSnapshot {
  kpis: ProductionKpis;
  pipeline: PipelineStageCount[];
  jobs: ProductionJob[];
  timeline: TimelineBlock[];
  overdue: OverdueMilestone[];
  lines: string[];
  supervisors: { id: string; name: string }[];
}
