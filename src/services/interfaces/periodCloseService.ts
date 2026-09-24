import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  BusinessPeriod,
  CloseDayResult,
  CloseMonthResult,
  CreatePeriodAdjustmentInput,
  DailyClosingSummary,
  DayCloseWorkspace,
  InventoryDailySnapshot,
  InventoryMonthlySnapshot,
  MonthlyCloseWorkspace,
  MonthlyClosingSummary,
  MonthlyPeriod,
  PeriodAdjustment,
  PeriodAuditLog,
  PeriodCloseSettings,
  ProductionDailySnapshot,
  ProductionMonthlySnapshot,
  ReopenPeriodInput,
  WorkerSessionCheckpoint,
} from "@/types/period-close";

export type BusinessPeriodListFilters = PaginatedRequest & {
  branchId?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type MonthlyPeriodListFilters = PaginatedRequest & {
  branchId?: string;
  status?: string;
  year?: number;
};

export type CloseDayOptions = {
  supervisorConfirmed?: boolean;
  /** Approve closing when one or more employees are under required hours (policy must allow). */
  incompleteHoursExceptionConfirmed?: boolean;
  /** Approve overtime recorded for the business day (when requireOvertimeApproval is on). */
  overtimeApproved?: boolean;
};

export interface PeriodCloseService {
  getSettings(branchId?: string): Promise<PeriodCloseSettings>;
  updateSettings(
    settings: Partial<PeriodCloseSettings> & { branchId: string },
  ): Promise<PeriodCloseSettings>;

  listDayPeriods(
    filters: BusinessPeriodListFilters,
  ): Promise<PaginatedResponse<BusinessPeriod>>;
  listMonthlyPeriods(
    filters: MonthlyPeriodListFilters,
  ): Promise<PaginatedResponse<MonthlyPeriod>>;

  getCurrentDay(branchId?: string): Promise<DayCloseWorkspace>;
  getDayWorkspace(periodId: string): Promise<DayCloseWorkspace>;
  getCurrentMonth(branchId?: string): Promise<MonthlyCloseWorkspace>;
  getMonthWorkspace(periodId: string): Promise<MonthlyCloseWorkspace>;

  runDayValidation(periodId: string): Promise<DayCloseWorkspace>;
  closeDay(periodId: string, options?: CloseDayOptions): Promise<CloseDayResult>;
  reopenDay(periodId: string, input: ReopenPeriodInput): Promise<BusinessPeriod>;

  runMonthValidation(periodId: string): Promise<MonthlyCloseWorkspace>;
  closeMonth(periodId: string): Promise<CloseMonthResult>;
  reopenMonth(periodId: string, input: ReopenPeriodInput): Promise<MonthlyPeriod>;

  listDayAudit(periodId: string): Promise<PeriodAuditLog[]>;
  listMonthAudit(periodId: string): Promise<PeriodAuditLog[]>;

  getDailySummary(periodId: string): Promise<DailyClosingSummary | null>;
  getMonthlySummary(periodId: string): Promise<MonthlyClosingSummary | null>;
  listProductionDailySnapshots(periodId: string): Promise<ProductionDailySnapshot[]>;
  listProductionMonthlySnapshots(periodId: string): Promise<ProductionMonthlySnapshot[]>;
  listInventoryDailySnapshots(periodId: string): Promise<InventoryDailySnapshot[]>;
  listInventoryMonthlySnapshots(periodId: string): Promise<InventoryMonthlySnapshot[]>;
  listSessionCheckpoints(periodId: string): Promise<WorkerSessionCheckpoint[]>;

  createAdjustment(input: CreatePeriodAdjustmentInput): Promise<PeriodAdjustment>;
  listAdjustments(branchId?: string): Promise<PeriodAdjustment[]>;

  /**
   * Used by other write paths to reject edits against closed periods.
   * Throws PERIOD_LOCKED / MONTH_LOCKED when not writable.
   */
  assertWritable(branchId: string, businessDate: string): Promise<void>;
}
