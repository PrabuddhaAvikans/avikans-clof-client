/**
 * Period close domain types.
 * Day Close and Monthly Close protect historical data without forcing
 * operational work (production orders, open jobs) to complete.
 */

import type { EmployeeDayWorkSummary } from "@/types/employee-work";

export const PeriodStatus = {
  open: "open",
  closing: "closing",
  closed: "closed",
  reopened: "reopened",
} as const;

export type PeriodStatusValue =
  (typeof PeriodStatus)[keyof typeof PeriodStatus];

export const PeriodStatusLabels: Record<PeriodStatusValue, string> = {
  open: "Open",
  closing: "Closing",
  closed: "Closed",
  reopened: "Reopened",
};

export const PeriodType = {
  day: "day",
  month: "month",
} as const;

export type PeriodTypeValue = (typeof PeriodType)[keyof typeof PeriodType];

export const ValidationSeverity = {
  blocking: "blocking",
  warning: "warning",
} as const;

export type ValidationSeverityValue =
  (typeof ValidationSeverity)[keyof typeof ValidationSeverity];

export const WorkerSessionCloseRule = {
  /** Pause active sessions and create a day-close checkpoint (default). */
  pause_and_checkpoint: "pause_and_checkpoint",
  /** Allow sessions to continue across business dates. */
  allow_cross_date: "allow_cross_date",
  /** Require supervisor confirmation before closing with active sessions. */
  require_supervisor_confirm: "require_supervisor_confirm",
} as const;

export type WorkerSessionCloseRuleValue =
  (typeof WorkerSessionCloseRule)[keyof typeof WorkerSessionCloseRule];

export type PeriodActor = {
  userId: string;
  userName: string;
};

export type BusinessPeriod = {
  id: string;
  branchId: string;
  businessDate: string;
  status: PeriodStatusValue;
  openedAt: string;
  openedBy: string;
  openedByName: string;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenReason?: string;
  /** Original close metadata retained across reopen cycles. */
  originalClosedAt?: string;
  originalClosedBy?: string;
  originalClosedByName?: string;
  closeCount: number;
};

export type MonthlyPeriod = {
  id: string;
  branchId: string;
  year: number;
  month: number;
  status: PeriodStatusValue;
  startedAt: string;
  startedBy: string;
  startedByName: string;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenReason?: string;
  originalClosedAt?: string;
  originalClosedBy?: string;
  originalClosedByName?: string;
  closeCount: number;
};

export type DayCloseValidationIssue = {
  id: string;
  businessPeriodId: string;
  validationCode: string;
  validationType: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isBlocking: boolean;
};

export type MonthlyCloseValidationIssue = {
  id: string;
  monthlyPeriodId: string;
  validationCode: string;
  validationType: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isBlocking: boolean;
};

export type DailyClosingSummary = {
  id: string;
  businessPeriodId: string;
  businessDate: string;
  branchId: string;
  ordersCreated: number;
  productionJobs: number;
  completedProductionQty: number;
  partialProductionQty: number;
  invoices: number;
  invoiceTotal: number;
  payments: number;
  paymentTotal: number;
  deliveries: number;
  materialIssues: number;
  materialReturns: number;
  inventoryMovementCount: number;
  quotationValue: number;
  salesOrderValue: number;
  creditNoteTotal: number;
  cashPayments: number;
  cardPayments: number;
  bankPayments: number;
  advancePayments: number;
  refunds: number;
  openingReceivable: number;
  closingReceivable: number;
  outstandingAmount: number;
  /** Transaction ids that contributed to totals (auditability). */
  transactionRefs: DailyTransactionRefs;
  createdAt: string;
};

export type DailyTransactionRefs = {
  orderIds: string[];
  invoiceIds: string[];
  paymentIds: string[];
  deliveryIds: string[];
  stockMovementIds: string[];
  productionJobIds: string[];
};

export type MonthlyClosingSummary = {
  id: string;
  monthlyPeriodId: string;
  year: number;
  month: number;
  branchId: string;
  salesTotal: number;
  purchaseTotal: number;
  paymentTotal: number;
  expenseTotal: number;
  inventoryValue: number;
  wipValue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  rawMaterials: number;
  labour: number;
  production: number;
  waste: number;
  reusableWaste: number;
  overhead: number;
  creditNotes: number;
  netMargin: number;
  transactionRefs: MonthlyTransactionRefs;
  createdAt: string;
};

export type MonthlyTransactionRefs = {
  invoiceIds: string[];
  paymentIds: string[];
  purchaseIds: string[];
  expenseIds: string[];
  inventorySnapshotIds: string[];
  productionSnapshotIds: string[];
};

export type ProductionDailySnapshot = {
  id: string;
  businessPeriodId: string;
  businessDate: string;
  productionOrderId: string;
  productionOrderNumber: string;
  operationId: string;
  operationName: string;
  workerId?: string;
  workerName?: string;
  totalQty: number;
  completedQty: number;
  partialQty: number;
  progressPercentage: number;
  workedMinutes: number;
  producedQty: number;
  rejectedQty: number;
  /** Live job status for Day Close UI (in_progress, completed, …). */
  jobStatus?: string;
  /** Task/operation status for Day Close UI. */
  taskStatus?: string;
  recordedAt: string;
};

export type ProductionMonthlySnapshot = {
  id: string;
  monthlyPeriodId: string;
  year: number;
  month: number;
  productionOrderId: string;
  productionOrderNumber: string;
  operationId: string;
  operationName: string;
  totalQty: number;
  completedQty: number;
  workInProgressQty: number;
  progressPercentage: number;
  materialConsumed: number;
  laborHours: number;
  estimatedCost: number;
  actualCostToDate: number;
  wipCost: number;
  recordedAt: string;
};

export type InventoryDailySnapshot = {
  id: string;
  businessPeriodId: string;
  businessDate: string;
  inventoryItemId: string;
  sku: string;
  name: string;
  unit: string;
  openingQty: number;
  receipts: number;
  returns: number;
  productionOutput: number;
  issues: number;
  consumption: number;
  deliveries: number;
  adjustments: number;
  closingQty: number;
  movementIds: string[];
  recordedAt: string;
};

export type InventoryMonthlySnapshot = {
  id: string;
  monthlyPeriodId: string;
  year: number;
  month: number;
  inventoryItemId: string;
  sku: string;
  name: string;
  unit: string;
  openingQty: number;
  openingValue: number;
  receivedQty: number;
  receivedValue: number;
  consumedQty: number;
  consumedValue: number;
  adjustmentQty: number;
  adjustmentValue: number;
  closingQty: number;
  closingValue: number;
  recordedAt: string;
};

export type WorkerSessionCheckpoint = {
  id: string;
  businessPeriodId: string;
  businessDate: string;
  sessionId: string;
  workerId: string;
  workerName: string;
  productionOrderId: string;
  operationId: string;
  operationName: string;
  progressPercentage: number;
  startedAt: string;
  checkpointAt: string;
  ruleApplied: WorkerSessionCloseRuleValue;
  resumedAt?: string;
  status: "paused" | "continued" | "awaiting_confirm";
};

export type PeriodAuditAction =
  | "opened"
  | "validation_run"
  | "closing_started"
  | "snapshots_generated"
  | "sessions_checkpointed"
  | "closed"
  | "reopened"
  | "next_period_opened"
  | "adjustment_posted";

export type PeriodAuditLog = {
  id: string;
  periodType: PeriodTypeValue;
  periodId: string;
  action: PeriodAuditAction;
  userId: string;
  userName: string;
  reason?: string;
  details?: Record<string, unknown>;
  performedAt: string;
};

export type PeriodAdjustment = {
  id: string;
  branchId: string;
  /** Period the adjustment is posted into (current open period). */
  postingBusinessDate: string;
  postingMonthlyPeriodId?: string;
  entityType: string;
  entityId: string;
  originalBusinessDate?: string;
  originalTransactionId?: string;
  adjustmentType: string;
  quantityDelta?: number;
  amountDelta?: number;
  reason: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
};

export type DayCloseWorkspace = {
  period: BusinessPeriod;
  summary: DailyClosingSummary | null;
  validations: DayCloseValidationIssue[];
  productionSnapshots: ProductionDailySnapshot[];
  inventorySnapshots: InventoryDailySnapshot[];
  sessionCheckpoints: WorkerSessionCheckpoint[];
  /** Per-employee worked hours for the business date (separate from task progress). */
  employeeDaySummaries: EmployeeDayWorkSummary[];
  auditLog: PeriodAuditLog[];
  canClose: boolean;
  canReopen: boolean;
  activeSessionCount: number;
  workerSessionRule: WorkerSessionCloseRuleValue;
  requiredDailyWorkMinutes: number;
  allowIncompleteEmployeeHoursException: boolean;
  incompleteEmployeeCount: number;
  overtimeEmployeeCount: number;
  totalOvertimeMinutes: number;
  requireOvertimeApproval: boolean;
};

export type MonthlyCloseWorkspace = {
  period: MonthlyPeriod;
  summary: MonthlyClosingSummary | null;
  validations: MonthlyCloseValidationIssue[];
  productionSnapshots: ProductionMonthlySnapshot[];
  inventorySnapshots: InventoryMonthlySnapshot[];
  dayPeriods: BusinessPeriod[];
  auditLog: PeriodAuditLog[];
  canClose: boolean;
  canReopen: boolean;
  openDayCount: number;
  closedDayCount: number;
};

export type PeriodCloseSettings = {
  branchId: string;
  workerSessionCloseRule: WorkerSessionCloseRuleValue;
  allowNegativeStock: boolean;
  requireAllDaysClosedForMonthlyClose: boolean;
  fiscalYearStartMonth: number;
  /** Required productive minutes per employee per business day (default 480 = 8h). */
  requiredDailyWorkMinutes: number;
  /** When true, incomplete employee hours can close with supervisor confirmation. */
  allowIncompleteEmployeeHoursException: boolean;
  /** When true, pause/break minutes count toward required daily hours. Default false. */
  countPauseAsWorked: boolean;
  /** Absolute minutes after which further time is double OT (default 600 = 10h). 0 = no auto DOT. */
  doubleOvertimeAfterMinutes: number;
  /** When true, overtime must be approved in the Day Close dialog. */
  requireOvertimeApproval: boolean;
};

export type CreatePeriodAdjustmentInput = {
  branchId: string;
  postingBusinessDate: string;
  entityType: string;
  entityId: string;
  originalBusinessDate?: string;
  originalTransactionId?: string;
  adjustmentType: string;
  quantityDelta?: number;
  amountDelta?: number;
  reason: string;
};

export type ReopenPeriodInput = {
  reason: string;
};

export type CloseDayResult = {
  period: BusinessPeriod;
  nextPeriod: BusinessPeriod;
  summary: DailyClosingSummary;
  validations: DayCloseValidationIssue[];
  productionSnapshots: ProductionDailySnapshot[];
  inventorySnapshots: InventoryDailySnapshot[];
  sessionCheckpoints: WorkerSessionCheckpoint[];
};

export type CloseMonthResult = {
  period: MonthlyPeriod;
  nextPeriod: MonthlyPeriod;
  summary: MonthlyClosingSummary;
  validations: MonthlyCloseValidationIssue[];
  productionSnapshots: ProductionMonthlySnapshot[];
  inventorySnapshots: InventoryMonthlySnapshot[];
};
