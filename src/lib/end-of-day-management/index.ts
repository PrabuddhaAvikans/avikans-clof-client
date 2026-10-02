export {
  DEFAULT_BRANCH_ID,
  DEFAULT_END_OF_DAY_MANAGEMENT_SETTINGS,
  addBusinessDays,
  businessDatesInMonth,
  daysInMonth,
  monthKey,
  nextCalendarMonth,
  parseBusinessDate,
  toBusinessDate,
} from "@/lib/end-of-day-management/constants";

export {
  assertBusinessDateWritable,
  findBusinessPeriod,
  findMonthlyPeriod,
  getBusinessDateLockError,
  isBusinessDateWritable,
  isPeriodLockedStatus,
  type PeriodLockError,
} from "@/lib/end-of-day-management/locking";

export {
  aggregateProductionProgress,
  calculateWipCost,
  roundMoney,
  type ProductionProgressPosition,
  type WipCostInput,
} from "@/lib/end-of-day-management/wip";

export {
  applyWorkerSessionCloseRule,
  type ActiveWorkerSession,
  type WorkerSessionCloseOutcome,
} from "@/lib/end-of-day-management/workerSessions";

export {
  countInProgressProductionJobs,
  jobsToActiveWorkerSessions,
  jobsToMonthlyProductionSources,
  jobsToProductionSnapshotSources,
  pauseActiveManufacturingForDayClose,
  summarizeLiveProductionActivity,
} from "@/lib/end-of-day-management/fromManufacturing";

export {
  hasBlockingDayCloseIssues,
  validateDayClose,
  type DayCloseValidationContext,
} from "@/lib/end-of-day-management/dayCloseValidation";

export {
  hasBlockingMonthlyCloseIssues,
  validateMonthlyClose,
  type MonthlyCloseValidationContext,
} from "@/lib/end-of-day-management/monthlyCloseValidation";

export {
  buildDailyClosingSummary,
  buildInventoryDailySnapshots,
  buildInventoryMonthlySnapshots,
  buildMonthlyClosingSummary,
  buildProductionDailySnapshots,
  buildProductionMonthlySnapshots,
} from "@/lib/end-of-day-management/snapshots";

export {
  canTransitionPeriodStatus,
  createDayPeriod,
  createMonthlyPeriod,
  createPeriodAuditEntry,
  findActiveOpenDay,
  findActiveOpenMonth,
  markDayClosed,
  markDayReopened,
  markMonthClosed,
  markMonthReopened,
  markPeriodClosing,
  nextOpenDayPeriod,
  nextOpenMonthlyPeriod,
} from "@/lib/end-of-day-management/engine";
