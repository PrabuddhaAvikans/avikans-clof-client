export const ReprocessingBatchStatus = {
  draft: "draft",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type ReprocessingBatchStatusValue =
  (typeof ReprocessingBatchStatus)[keyof typeof ReprocessingBatchStatus];

export const ReprocessingBatchStatusLabels: Record<ReprocessingBatchStatusValue, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type ReprocessingCostBreakdown = {
  labour: number;
  electricity: number;
  machine: number;
  gas: number;
  furnace: number;
  subcontract: number;
  other: number;
};

export type ReprocessingBatch = {
  id: string;
  batchNumber: string;
  status: ReprocessingBatchStatusValue;
  inputScrapLotId: string;
  inputScrapSku: string;
  inputScrapName: string;
  inputQuantity: number;
  inputUnit: string;
  inputUnitCost: number;
  wipLotId?: string;
  issueMovementId?: string;
  costs: ReprocessingCostBreakdown;
  totalProcessingCost: number;
  recoveredQuantity?: number;
  processLossQuantity?: number;
  recoveredUnitCost?: number;
  recoveredLotId?: string;
  recoveredLotSku?: string;
  sourceProductionOrderId?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
};

export type CreateReprocessingBatchInput = {
  inputScrapLotId: string;
  inputQuantity: number;
  costs?: Partial<ReprocessingCostBreakdown>;
  sourceProductionOrderId?: string;
  notes?: string;
};

export type CompleteReprocessingInput = {
  recoveredQuantity: number;
  processLossQuantity: number;
  costs?: Partial<ReprocessingCostBreakdown>;
  notes?: string;
};
