import { delay, generateId, notFoundError, nowIso } from "@/services/http";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import type {
  BusinessPeriodListFilters,
  CloseDayOptions,
  MonthlyPeriodListFilters,
  PeriodCloseService,
} from "@/services/interfaces/periodCloseService";
import {
  seedDayAudit,
  seedDayPeriods,
  seedDeliveredWithoutInvoice,
  seedIncompleteCancellations,
  seedInvalidOrders,
  seedInventoryBuckets,
  seedMonthAudit,
  seedMonthlyPeriods,
  seedOpenDayActivity,
  seedSettings,
  seedUnapprovedAdjustments,
  seedUnpostedInvoices,
  seedUnpostedPayments,
} from "@/services/mock/data/period-close";
import {
  getManufacturingJobs,
  replaceManufacturingJob,
} from "@/services/mock/manufacturingStore";
import { listEmployeeWorkSessionsForDate, pauseOpenEmployeeWorkSessionsForDate } from "@/services/mock/employeeWorkSessionStore";
import {
  buildEmployeeDaySummaries,
  countEmployeesWithOvertime,
  countIncompleteEmployeeDays,
  sumEmployeeOvertimeMinutes,
} from "@/lib/employee-work";
import {
  DEFAULT_BRANCH_ID,
  applyWorkerSessionCloseRule,
  assertBusinessDateWritable,
  buildDailyClosingSummary,
  buildInventoryDailySnapshots,
  buildInventoryMonthlySnapshots,
  buildMonthlyClosingSummary,
  buildProductionDailySnapshots,
  buildProductionMonthlySnapshots,
  businessDatesInMonth,
  countInProgressProductionJobs,
  createPeriodAuditEntry,
  findActiveOpenDay,
  findActiveOpenMonth,
  hasBlockingDayCloseIssues,
  hasBlockingMonthlyCloseIssues,
  jobsToActiveWorkerSessions,
  jobsToMonthlyProductionSources,
  jobsToProductionSnapshotSources,
  markDayClosed,
  markDayReopened,
  markMonthClosed,
  markMonthReopened,
  markPeriodClosing,
  nextOpenDayPeriod,
  nextOpenMonthlyPeriod,
  parseBusinessDate,
  pauseActiveManufacturingForDayClose,
  summarizeLiveProductionActivity,
  validateDayClose,
  validateMonthlyClose,
} from "@/lib/period-close";
import { PeriodStatus, PeriodType, WorkerSessionCloseRule } from "@/types/period-close";
import type {
  BusinessPeriod,
  CloseDayResult,
  CloseMonthResult,
  CreatePeriodAdjustmentInput,
  DailyClosingSummary,
  DayCloseValidationIssue,
  DayCloseWorkspace,
  InventoryDailySnapshot,
  InventoryMonthlySnapshot,
  MonthlyCloseValidationIssue,
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
import type { EmployeeDayWorkSummary } from "@/types/employee-work";

const ACTOR = {
  userId: "usr-001",
  userName: "System Administrator",
};

let settings: PeriodCloseSettings = structuredClone(seedSettings);
let dayPeriods: BusinessPeriod[] = structuredClone(seedDayPeriods);
let monthlyPeriods: MonthlyPeriod[] = structuredClone(seedMonthlyPeriods);
let daySummaries: DailyClosingSummary[] = [];
let monthSummaries: MonthlyClosingSummary[] = [];
let dayValidations: DayCloseValidationIssue[] = [];
let monthValidations: MonthlyCloseValidationIssue[] = [];
let productionDaily: ProductionDailySnapshot[] = [];
let productionMonthly: ProductionMonthlySnapshot[] = [];
let inventoryDaily: InventoryDailySnapshot[] = [];
let inventoryMonthly: InventoryMonthlySnapshot[] = [];
let sessionCheckpoints: WorkerSessionCheckpoint[] = [];
let dayAudit: PeriodAuditLog[] = structuredClone(seedDayAudit);
let monthAudit: PeriodAuditLog[] = structuredClone(seedMonthAudit);
let adjustments: PeriodAdjustment[] = [];

function liveActiveSessions() {
  return jobsToActiveWorkerSessions(getManufacturingJobs());
}

function liveEmployeeDaySummaries(
  businessDate: string,
  asOf = nowIso(),
): EmployeeDayWorkSummary[] {
  return buildEmployeeDaySummaries({
    businessDate,
    sessions: listEmployeeWorkSessionsForDate(businessDate),
    requiredDailyWorkMinutes: settings.requiredDailyWorkMinutes,
    countPauseAsWorked: settings.countPauseAsWorked,
    doubleOvertimeAfterMinutes: settings.doubleOvertimeAfterMinutes,
    asOf,
  });
}

function requireDay(id: string): BusinessPeriod {
  const period = dayPeriods.find((item) => item.id === id);
  if (!period) notFoundError("BusinessPeriod", id);
  return period;
}

function requireMonth(id: string): MonthlyPeriod {
  const period = monthlyPeriods.find((item) => item.id === id);
  if (!period) notFoundError("MonthlyPeriod", id);
  return period;
}

function replaceDay(period: BusinessPeriod): BusinessPeriod {
  const index = dayPeriods.findIndex((item) => item.id === period.id);
  if (index === -1) dayPeriods.unshift(period);
  else dayPeriods[index] = period;
  return period;
}

function replaceMonth(period: MonthlyPeriod): MonthlyPeriod {
  const index = monthlyPeriods.findIndex((item) => item.id === period.id);
  if (index === -1) monthlyPeriods.unshift(period);
  else monthlyPeriods[index] = period;
  return period;
}

function pushDayAudit(
  periodId: string,
  action: PeriodAuditLog["action"],
  reason?: string,
  details?: Record<string, unknown>,
): void {
  dayAudit.unshift(
    createPeriodAuditEntry({
      id: generateId("pal"),
      periodType: PeriodType.day,
      periodId,
      action,
      actor: ACTOR,
      performedAt: nowIso(),
      reason,
      details,
    }),
  );
}

function pushMonthAudit(
  periodId: string,
  action: PeriodAuditLog["action"],
  reason?: string,
  details?: Record<string, unknown>,
): void {
  monthAudit.unshift(
    createPeriodAuditEntry({
      id: generateId("pal"),
      periodType: PeriodType.month,
      periodId,
      action,
      actor: ACTOR,
      performedAt: nowIso(),
      reason,
      details,
    }),
  );
}

function runDayValidationInternal(
  period: BusinessPeriod,
  supervisorConfirmed = false,
  incompleteHoursExceptionConfirmed = false,
  overtimeApproved = false,
): DayCloseValidationIssue[] {
  const sessions = liveActiveSessions();
  const sessionOutcome = applyWorkerSessionCloseRule({
    rule: settings.workerSessionCloseRule,
    sessions,
    checkpointAt: nowIso(),
    supervisorConfirmed,
    actor: ACTOR,
  });
  const employeeDaySummaries = liveEmployeeDaySummaries(period.businessDate);

  const issues = validateDayClose({
    businessPeriodId: period.id,
    invalidOrders: seedInvalidOrders,
    deliveredWithoutInvoice: seedDeliveredWithoutInvoice,
    incompleteCancellations: seedIncompleteCancellations,
    unpostedInvoices: seedUnpostedInvoices,
    unpostedPayments: seedUnpostedPayments,
    unapprovedAdjustments: seedUnapprovedAdjustments,
    sessionsAwaitingConfirm: sessionOutcome.requiresSupervisorConfirm
      ? sessions.length
      : 0,
    employeeDaySummaries,
    allowIncompleteEmployeeHoursException:
      settings.allowIncompleteEmployeeHoursException,
    incompleteHoursExceptionConfirmed,
    requireOvertimeApproval: settings.requireOvertimeApproval,
    overtimeApproved,
  });

  dayValidations = [
    ...dayValidations.filter((item) => item.businessPeriodId !== period.id),
    ...issues,
  ];
  pushDayAudit(period.id, "validation_run", undefined, {
    blocking: issues.filter((item) => item.isBlocking).length,
    warnings: issues.filter((item) => !item.isBlocking).length,
    activeManufacturingSessions: sessions.length,
    incompleteEmployees: countIncompleteEmployeeDays(employeeDaySummaries),
    overtimeEmployees: countEmployeesWithOvertime(employeeDaySummaries),
    overtimeMinutes: sumEmployeeOvertimeMinutes(employeeDaySummaries),
  });
  return issues;
}

function peekDayValidationIssues(
  period: BusinessPeriod,
  supervisorConfirmed = false,
  incompleteHoursExceptionConfirmed = false,
  overtimeApproved = false,
): DayCloseValidationIssue[] {
  // Always live-compute so employee hours and manufacturing sessions stay current.
  const sessions = liveActiveSessions();
  const sessionOutcome = applyWorkerSessionCloseRule({
    rule: settings.workerSessionCloseRule,
    sessions,
    checkpointAt: nowIso(),
    supervisorConfirmed,
    actor: ACTOR,
  });
  const employeeDaySummaries = liveEmployeeDaySummaries(period.businessDate);

  return validateDayClose({
    businessPeriodId: period.id,
    invalidOrders: seedInvalidOrders,
    deliveredWithoutInvoice: seedDeliveredWithoutInvoice,
    incompleteCancellations: seedIncompleteCancellations,
    unpostedInvoices: seedUnpostedInvoices,
    unpostedPayments: seedUnpostedPayments,
    unapprovedAdjustments: seedUnapprovedAdjustments,
    sessionsAwaitingConfirm: sessionOutcome.requiresSupervisorConfirm
      ? sessions.length
      : 0,
    employeeDaySummaries,
    allowIncompleteEmployeeHoursException:
      settings.allowIncompleteEmployeeHoursException,
    incompleteHoursExceptionConfirmed,
    requireOvertimeApproval: settings.requireOvertimeApproval,
    overtimeApproved,
  });
}

function buildLiveProductionPreview(
  period: BusinessPeriod,
): ProductionDailySnapshot[] {
  const sources = jobsToProductionSnapshotSources(getManufacturingJobs());
  return buildProductionDailySnapshots({
    businessPeriodId: period.id,
    businessDate: period.businessDate,
    sources,
    recordedAt: nowIso(),
    idFactory: () => `preview-prod-${generateId("snap")}`,
  });
}

function buildDayWorkspace(period: BusinessPeriod): DayCloseWorkspace {
  const validations = peekDayValidationIssues(period);
  const persistedSummary =
    daySummaries.find((item) => item.businessPeriodId === period.id) ?? null;
  const isOpenLike =
    period.status === PeriodStatus.open || period.status === PeriodStatus.reopened;

  const liveActivity = summarizeLiveProductionActivity(getManufacturingJobs());
  const sessions = liveActiveSessions();

  const summary =
    persistedSummary ??
    (isOpenLike
      ? buildDailyClosingSummary({
          businessPeriodId: period.id,
          businessDate: period.businessDate,
          branchId: period.branchId,
          ...seedOpenDayActivity,
          productionJobs: liveActivity.productionJobs,
          completedProductionQty: liveActivity.completedProductionQty,
          partialProductionQty: liveActivity.partialProductionQty,
          createdAt: nowIso(),
          idFactory: () => `preview-${period.id}`,
        })
      : null);

  const persistedProduction = productionDaily.filter(
    (item) => item.businessPeriodId === period.id,
  );
  const productionSnapshots =
    persistedProduction.length > 0
      ? persistedProduction
      : isOpenLike
        ? buildLiveProductionPreview(period)
        : [];

  const employeeDaySummaries = liveEmployeeDaySummaries(period.businessDate);

  return {
    period: structuredClone(period),
    summary: summary ? structuredClone(summary) : null,
    validations: structuredClone(validations),
    productionSnapshots: structuredClone(productionSnapshots),
    inventorySnapshots: structuredClone(
      inventoryDaily.filter((item) => item.businessPeriodId === period.id),
    ),
    sessionCheckpoints: structuredClone(
      sessionCheckpoints.filter((item) => item.businessPeriodId === period.id),
    ),
    employeeDaySummaries: structuredClone(employeeDaySummaries),
    auditLog: structuredClone(
      dayAudit.filter((item) => item.periodId === period.id),
    ),
    canClose: isOpenLike && !hasBlockingDayCloseIssues(validations),
    canReopen: period.status === PeriodStatus.closed,
    activeSessionCount: isOpenLike ? sessions.length : 0,
    workerSessionRule: settings.workerSessionCloseRule,
    requiredDailyWorkMinutes: settings.requiredDailyWorkMinutes,
    allowIncompleteEmployeeHoursException:
      settings.allowIncompleteEmployeeHoursException,
    incompleteEmployeeCount: countIncompleteEmployeeDays(employeeDaySummaries),
    overtimeEmployeeCount: countEmployeesWithOvertime(employeeDaySummaries),
    totalOvertimeMinutes: sumEmployeeOvertimeMinutes(employeeDaySummaries),
    requireOvertimeApproval: settings.requireOvertimeApproval,
  };
}

function runMonthValidationInternal(
  period: MonthlyPeriod,
): MonthlyCloseValidationIssue[] {
  const branchDays = dayPeriods.filter((item) => item.branchId === period.branchId);
  const issues = validateMonthlyClose({
    monthlyPeriodId: period.id,
    year: period.year,
    month: period.month,
    requireAllDaysClosed: settings.requireAllDaysClosedForMonthlyClose,
    dayPeriods: branchDays,
    unpostedInvoices: [],
    unpostedPayments: [],
    inventoryReconciliationProblems: [],
    unapprovedStockAdjustments: [],
    pendingFinancialAdjustments: [],
    negativeStockItems: [],
    allowNegativeStock: settings.allowNegativeStock,
    incompleteCosting: [],
    unpostedProductionOutput: [],
    missingExpensePostings: [],
    inProgressProductionJobs: countInProgressProductionJobs(getManufacturingJobs()),
  });

  monthValidations = [
    ...monthValidations.filter((item) => item.monthlyPeriodId !== period.id),
    ...issues,
  ];
  pushMonthAudit(period.id, "validation_run", undefined, {
    blocking: issues.filter((item) => item.isBlocking).length,
    warnings: issues.filter((item) => !item.isBlocking).length,
  });
  return issues;
}

function peekMonthValidationIssues(
  period: MonthlyPeriod,
): MonthlyCloseValidationIssue[] {
  const cached = monthValidations.filter(
    (item) => item.monthlyPeriodId === period.id,
  );
  if (cached.length > 0) return cached;

  const branchDays = dayPeriods.filter((item) => item.branchId === period.branchId);
  return validateMonthlyClose({
    monthlyPeriodId: period.id,
    year: period.year,
    month: period.month,
    requireAllDaysClosed: settings.requireAllDaysClosedForMonthlyClose,
    dayPeriods: branchDays,
    unpostedInvoices: [],
    unpostedPayments: [],
    inventoryReconciliationProblems: [],
    unapprovedStockAdjustments: [],
    pendingFinancialAdjustments: [],
    negativeStockItems: [],
    allowNegativeStock: settings.allowNegativeStock,
    incompleteCosting: [],
    unpostedProductionOutput: [],
    missingExpensePostings: [],
    inProgressProductionJobs: countInProgressProductionJobs(getManufacturingJobs()),
  });
}

function buildMonthWorkspace(period: MonthlyPeriod): MonthlyCloseWorkspace {
  const validations = peekMonthValidationIssues(period);
  const summary =
    monthSummaries.find((item) => item.monthlyPeriodId === period.id) ?? null;
  const dates = businessDatesInMonth(period.year, period.month);
  const dayInMonth = dayPeriods.filter(
    (item) =>
      item.branchId === period.branchId &&
      item.businessDate.startsWith(
        `${period.year}-${String(period.month).padStart(2, "0")}`,
      ),
  );
  const closedDayCount = dayInMonth.filter(
    (item) => item.status === PeriodStatus.closed,
  ).length;
  const openDayCount = dates.length - closedDayCount;
  const isOpenLike =
    period.status === PeriodStatus.open || period.status === PeriodStatus.reopened;

  const persistedProduction = productionMonthly.filter(
    (item) => item.monthlyPeriodId === period.id,
  );
  const productionSnapshots =
    persistedProduction.length > 0
      ? persistedProduction
      : isOpenLike
        ? buildProductionMonthlySnapshots({
            monthlyPeriodId: period.id,
            year: period.year,
            month: period.month,
            sources: jobsToMonthlyProductionSources(getManufacturingJobs()),
            recordedAt: nowIso(),
            idFactory: () => `preview-mprod-${generateId("snap")}`,
          })
        : [];

  return {
    period: structuredClone(period),
    summary: summary ? structuredClone(summary) : null,
    validations: structuredClone(validations),
    productionSnapshots: structuredClone(productionSnapshots),
    inventorySnapshots: structuredClone(
      inventoryMonthly.filter((item) => item.monthlyPeriodId === period.id),
    ),
    dayPeriods: structuredClone(dayInMonth),
    auditLog: structuredClone(
      monthAudit.filter((item) => item.periodId === period.id),
    ),
    canClose: isOpenLike && !hasBlockingMonthlyCloseIssues(validations),
    canReopen: period.status === PeriodStatus.closed,
    openDayCount,
    closedDayCount,
  };
}

export const mockPeriodCloseService: PeriodCloseService = {
  async getSettings(branchId = DEFAULT_BRANCH_ID) {
    await delay();
    return structuredClone({ ...settings, branchId });
  },

  async updateSettings(patch) {
    await delay();
    settings = { ...settings, ...patch };
    return structuredClone(settings);
  },

  async listDayPeriods(filters: BusinessPeriodListFilters) {
    await delay();
    return applyListQuery(
      cloneData(dayPeriods),
      filters,
      ["businessDate", "id"],
      (item) => {
        if (filters.branchId && item.branchId !== filters.branchId) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.from && item.businessDate < filters.from) return false;
        if (filters.to && item.businessDate > filters.to) return false;
        return true;
      },
    );
  },

  async listMonthlyPeriods(filters: MonthlyPeriodListFilters) {
    await delay();
    return applyListQuery(
      cloneData(monthlyPeriods),
      filters,
      ["id"],
      (item) => {
        if (filters.branchId && item.branchId !== filters.branchId) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.year != null && item.year !== filters.year) return false;
        return true;
      },
    );
  },

  async getCurrentDay(branchId = DEFAULT_BRANCH_ID) {
    await delay();
    const period = findActiveOpenDay(dayPeriods, branchId);
    if (!period) {
      throw {
        code: "NO_OPEN_DAY",
        message: "No open business date found for this branch.",
      };
    }
    return buildDayWorkspace(period);
  },

  async getDayWorkspace(periodId) {
    await delay();
    return buildDayWorkspace(requireDay(periodId));
  },

  async getCurrentMonth(branchId = DEFAULT_BRANCH_ID) {
    await delay();
    const period = findActiveOpenMonth(monthlyPeriods, branchId);
    if (!period) {
      throw {
        code: "NO_OPEN_MONTH",
        message: "No open monthly period found for this branch.",
      };
    }
    return buildMonthWorkspace(period);
  },

  async getMonthWorkspace(periodId) {
    await delay();
    return buildMonthWorkspace(requireMonth(periodId));
  },

  async runDayValidation(periodId) {
    await delay();
    const period = requireDay(periodId);
    runDayValidationInternal(period, false);
    return buildDayWorkspace(period);
  },

  async closeDay(periodId, options?: CloseDayOptions): Promise<CloseDayResult> {
    await delay();
    let period = requireDay(periodId);

    if (
      period.status !== PeriodStatus.open &&
      period.status !== PeriodStatus.reopened
    ) {
      throw {
        code: "INVALID_STATE",
        message: `Cannot close a day in status "${period.status}".`,
      };
    }

    // Parent month must not be locked
    const { year, month } = parseBusinessDate(period.businessDate);
    const parentMonth = monthlyPeriods.find(
      (item) =>
        item.branchId === period.branchId &&
        item.year === year &&
        item.month === month,
    );
    if (parentMonth?.status === PeriodStatus.closed) {
      throw {
        code: "MONTH_LOCKED",
        message: `Cannot close day ${period.businessDate} because the month is already closed.`,
      };
    }

    period = replaceDay(markPeriodClosing(period));
    pushDayAudit(period.id, "closing_started");

    const issues = runDayValidationInternal(
      period,
      options?.supervisorConfirmed === true,
      options?.incompleteHoursExceptionConfirmed === true,
      options?.overtimeApproved === true,
    );
    if (hasBlockingDayCloseIssues(issues)) {
      period = replaceDay({ ...period, status: PeriodStatus.open });
      throw {
        code: "VALIDATION_FAILED",
        message: "Day Close blocked by validation errors. Fix blocking issues and retry.",
        details: { issues },
      };
    }

    const recordedAt = nowIso();
    const idFactory = () => generateId("snap");
    const manufacturingJobs = getManufacturingJobs();
    const productionSources = jobsToProductionSnapshotSources(manufacturingJobs);
    const liveSessions = liveActiveSessions();
    const liveActivity = summarizeLiveProductionActivity(manufacturingJobs);

    const productionSnapshots = buildProductionDailySnapshots({
      businessPeriodId: period.id,
      businessDate: period.businessDate,
      sources: productionSources,
      recordedAt,
      idFactory,
    });
    productionDaily = [
      ...productionDaily.filter((item) => item.businessPeriodId !== period.id),
      ...productionSnapshots,
    ];

    const inventorySnapshots = buildInventoryDailySnapshots({
      businessPeriodId: period.id,
      businessDate: period.businessDate,
      buckets: seedInventoryBuckets,
      recordedAt,
      idFactory,
    });
    inventoryDaily = [
      ...inventoryDaily.filter((item) => item.businessPeriodId !== period.id),
      ...inventorySnapshots,
    ];

    const completedProductionQty = productionSnapshots.reduce(
      (sum, item) => sum + item.completedQty,
      0,
    );
    const partialProductionQty = productionSnapshots.reduce(
      (sum, item) => sum + item.partialQty,
      0,
    );

    const summary = buildDailyClosingSummary({
      businessPeriodId: period.id,
      businessDate: period.businessDate,
      branchId: period.branchId,
      ...seedOpenDayActivity,
      productionJobs: liveActivity.productionJobs || seedOpenDayActivity.productionJobs,
      completedProductionQty:
        completedProductionQty || liveActivity.completedProductionQty,
      partialProductionQty:
        partialProductionQty || liveActivity.partialProductionQty,
      transactionRefs: {
        ...seedOpenDayActivity.transactionRefs,
        productionJobIds: [
          ...new Set(productionSources.map((source) => source.productionOrderId)),
        ],
      },
      createdAt: recordedAt,
      idFactory: () => generateId("dcs"),
    });
    daySummaries = [
      ...daySummaries.filter((item) => item.businessPeriodId !== period.id),
      summary,
    ];

    pushDayAudit(period.id, "snapshots_generated", undefined, {
      production: productionSnapshots.length,
      inventory: inventorySnapshots.length,
      manufacturingJobs: liveActivity.productionJobs,
    });

    const sessionOutcome = applyWorkerSessionCloseRule({
      rule: settings.workerSessionCloseRule,
      sessions: liveSessions,
      checkpointAt: recordedAt,
      supervisorConfirmed: options?.supervisorConfirmed === true,
      actor: ACTOR,
    });

    const checkpoints: WorkerSessionCheckpoint[] = sessionOutcome.checkpoints.map(
      (checkpoint) => ({
        ...checkpoint,
        id: generateId("wsc"),
        businessPeriodId: period.id,
        businessDate: period.businessDate,
      }),
    );
    sessionCheckpoints = [
      ...sessionCheckpoints.filter((item) => item.businessPeriodId !== period.id),
      ...checkpoints,
    ];

    // Default rule: pause real manufacturing tasks — never complete them.
    if (
      settings.workerSessionCloseRule === WorkerSessionCloseRule.pause_and_checkpoint ||
      (settings.workerSessionCloseRule ===
        WorkerSessionCloseRule.require_supervisor_confirm &&
        options?.supervisorConfirmed)
    ) {
      const { updatedJobs, pausedTaskIds } = pauseActiveManufacturingForDayClose(
        manufacturingJobs,
        ACTOR,
        `Day Close checkpoint for ${period.businessDate}`,
      );
      for (const job of updatedJobs) {
        replaceManufacturingJob(job);
      }
      const pausedEmployeeSessions = pauseOpenEmployeeWorkSessionsForDate(
        period.businessDate,
        recordedAt,
      );
      pushDayAudit(period.id, "sessions_checkpointed", undefined, {
        count: checkpoints.length,
        pausedTasks: pausedTaskIds.length,
        pausedEmployeeSessions: pausedEmployeeSessions.length,
        rule: settings.workerSessionCloseRule,
      });
    } else {
      const pausedEmployeeSessions = pauseOpenEmployeeWorkSessionsForDate(
        period.businessDate,
        recordedAt,
      );
      pushDayAudit(period.id, "sessions_checkpointed", undefined, {
        count: checkpoints.length,
        pausedEmployeeSessions: pausedEmployeeSessions.length,
        rule: settings.workerSessionCloseRule,
      });
    }

    period = replaceDay(markDayClosed(period, ACTOR, recordedAt));
    pushDayAudit(period.id, "closed");

    const nextPeriod = nextOpenDayPeriod(
      period,
      ACTOR,
      recordedAt,
      () => generateId("bp"),
    );
    const existingNext = dayPeriods.find(
      (item) =>
        item.branchId === nextPeriod.branchId &&
        item.businessDate === nextPeriod.businessDate,
    );
    if (!existingNext) {
      dayPeriods.unshift(nextPeriod);
      pushDayAudit(nextPeriod.id, "opened");
      pushDayAudit(period.id, "next_period_opened", undefined, {
        nextBusinessDate: nextPeriod.businessDate,
      });
    }

    return {
      period: structuredClone(period),
      nextPeriod: structuredClone(existingNext ?? nextPeriod),
      summary: structuredClone(summary),
      validations: structuredClone(issues),
      productionSnapshots: structuredClone(productionSnapshots),
      inventorySnapshots: structuredClone(inventorySnapshots),
      sessionCheckpoints: structuredClone(checkpoints),
    };
  },

  async reopenDay(periodId, input: ReopenPeriodInput) {
    await delay();
    let period = requireDay(periodId);
    const reopenedAt = nowIso();
    period = replaceDay(markDayReopened(period, ACTOR, reopenedAt, input.reason));
    pushDayAudit(period.id, "reopened", input.reason, {
      originalClosedAt: period.originalClosedAt,
      originalClosedBy: period.originalClosedBy,
      originalClosedByName: period.originalClosedByName,
    });
    return structuredClone(period);
  },

  async runMonthValidation(periodId) {
    await delay();
    const period = requireMonth(periodId);
    runMonthValidationInternal(period);
    return buildMonthWorkspace(period);
  },

  async closeMonth(periodId): Promise<CloseMonthResult> {
    await delay();
    let period = requireMonth(periodId);

    if (
      period.status !== PeriodStatus.open &&
      period.status !== PeriodStatus.reopened
    ) {
      throw {
        code: "INVALID_STATE",
        message: `Cannot close a month in status "${period.status}".`,
      };
    }

    period = replaceMonth(markPeriodClosing(period));
    pushMonthAudit(period.id, "closing_started");

    const issues = runMonthValidationInternal(period);
    if (hasBlockingMonthlyCloseIssues(issues)) {
      period = replaceMonth({ ...period, status: PeriodStatus.open });
      throw {
        code: "VALIDATION_FAILED",
        message:
          "Monthly Close blocked by validation errors. Fix blocking issues and retry.",
        details: { issues },
      };
    }

    const recordedAt = nowIso();
    const idFactory = () => generateId("snap");

    const productionSnapshots = buildProductionMonthlySnapshots({
      monthlyPeriodId: period.id,
      year: period.year,
      month: period.month,
      sources: jobsToMonthlyProductionSources(getManufacturingJobs()),
      recordedAt,
      idFactory,
    });
    productionMonthly = [
      ...productionMonthly.filter((item) => item.monthlyPeriodId !== period.id),
      ...productionSnapshots,
    ];

    const inventorySnapshots = buildInventoryMonthlySnapshots({
      monthlyPeriodId: period.id,
      year: period.year,
      month: period.month,
      buckets: [
        {
          inventoryItemId: "inv-brass",
          sku: "RAW-BRASS",
          name: "Brass",
          unit: "KG",
          openingQty: 100,
          openingValue: 50_000,
          receivedQty: 50,
          receivedValue: 25_000,
          consumedQty: 70,
          consumedValue: 35_000,
          adjustmentQty: 0,
          adjustmentValue: 0,
          unitCost: 500,
        },
        {
          inventoryItemId: "inv-glass",
          sku: "RAW-GLASS",
          name: "Glass",
          unit: "PCS",
          openingQty: 200,
          openingValue: 40_000,
          receivedQty: 80,
          receivedValue: 16_000,
          consumedQty: 90,
          consumedValue: 18_000,
          adjustmentQty: 0,
          adjustmentValue: 0,
          unitCost: 200,
        },
        {
          inventoryItemId: "inv-wire",
          sku: "RAW-WIRE",
          name: "Wire",
          unit: "M",
          openingQty: 500,
          openingValue: 10_000,
          receivedQty: 200,
          receivedValue: 4_000,
          consumedQty: 350,
          consumedValue: 7_000,
          adjustmentQty: 0,
          adjustmentValue: 0,
          unitCost: 20,
        },
      ],
      recordedAt,
      idFactory,
    });
    inventoryMonthly = [
      ...inventoryMonthly.filter((item) => item.monthlyPeriodId !== period.id),
      ...inventorySnapshots,
    ];

    const wipValue = productionSnapshots.reduce((sum, item) => sum + item.wipCost, 0);
    const inventoryValue = inventorySnapshots.reduce(
      (sum, item) => sum + item.closingValue,
      0,
    );

    const summary = buildMonthlyClosingSummary({
      monthlyPeriodId: period.id,
      year: period.year,
      month: period.month,
      branchId: period.branchId,
      salesTotal: 2_450_000,
      purchaseTotal: 680_000,
      paymentTotal: 1_900_000,
      expenseTotal: 210_000,
      inventoryValue,
      wipValue,
      costOfGoodsSold: 1_450_000,
      rawMaterials: 720_000,
      labour: 310_000,
      production: 180_000,
      waste: 22_000,
      reusableWaste: 8_000,
      overhead: 95_000,
      creditNotes: 45_000,
      transactionRefs: {
        invoiceIds: ["inv-month-01"],
        paymentIds: ["pay-month-01"],
        purchaseIds: ["po-month-01"],
        expenseIds: ["exp-month-01"],
        inventorySnapshotIds: inventorySnapshots.map((item) => item.id),
        productionSnapshotIds: productionSnapshots.map((item) => item.id),
      },
      createdAt: recordedAt,
      idFactory: () => generateId("mcs"),
    });
    monthSummaries = [
      ...monthSummaries.filter((item) => item.monthlyPeriodId !== period.id),
      summary,
    ];

    pushMonthAudit(period.id, "snapshots_generated", undefined, {
      production: productionSnapshots.length,
      inventory: inventorySnapshots.length,
      wipValue,
    });

    period = replaceMonth(markMonthClosed(period, ACTOR, recordedAt));
    pushMonthAudit(period.id, "closed");

    const nextPeriod = nextOpenMonthlyPeriod(
      period,
      ACTOR,
      recordedAt,
      () => generateId("mp"),
    );
    const existingNext = monthlyPeriods.find(
      (item) =>
        item.branchId === nextPeriod.branchId &&
        item.year === nextPeriod.year &&
        item.month === nextPeriod.month,
    );
    if (!existingNext) {
      monthlyPeriods.unshift(nextPeriod);
      pushMonthAudit(nextPeriod.id, "opened");
      pushMonthAudit(period.id, "next_period_opened", undefined, {
        nextYear: nextPeriod.year,
        nextMonth: nextPeriod.month,
      });
    }

    return {
      period: structuredClone(period),
      nextPeriod: structuredClone(existingNext ?? nextPeriod),
      summary: structuredClone(summary),
      validations: structuredClone(issues),
      productionSnapshots: structuredClone(productionSnapshots),
      inventorySnapshots: structuredClone(inventorySnapshots),
    };
  },

  async reopenMonth(periodId, input: ReopenPeriodInput) {
    await delay();
    let period = requireMonth(periodId);
    const reopenedAt = nowIso();
    period = replaceMonth(
      markMonthReopened(period, ACTOR, reopenedAt, input.reason),
    );
    pushMonthAudit(period.id, "reopened", input.reason, {
      originalClosedAt: period.originalClosedAt,
      originalClosedBy: period.originalClosedBy,
      originalClosedByName: period.originalClosedByName,
    });
    return structuredClone(period);
  },

  async listDayAudit(periodId) {
    await delay();
    return structuredClone(dayAudit.filter((item) => item.periodId === periodId));
  },

  async listMonthAudit(periodId) {
    await delay();
    return structuredClone(monthAudit.filter((item) => item.periodId === periodId));
  },

  async getDailySummary(periodId) {
    await delay();
    return structuredClone(
      daySummaries.find((item) => item.businessPeriodId === periodId) ?? null,
    );
  },

  async getMonthlySummary(periodId) {
    await delay();
    return structuredClone(
      monthSummaries.find((item) => item.monthlyPeriodId === periodId) ?? null,
    );
  },

  async listProductionDailySnapshots(periodId) {
    await delay();
    return structuredClone(
      productionDaily.filter((item) => item.businessPeriodId === periodId),
    );
  },

  async listProductionMonthlySnapshots(periodId) {
    await delay();
    return structuredClone(
      productionMonthly.filter((item) => item.monthlyPeriodId === periodId),
    );
  },

  async listInventoryDailySnapshots(periodId) {
    await delay();
    return structuredClone(
      inventoryDaily.filter((item) => item.businessPeriodId === periodId),
    );
  },

  async listInventoryMonthlySnapshots(periodId) {
    await delay();
    return structuredClone(
      inventoryMonthly.filter((item) => item.monthlyPeriodId === periodId),
    );
  },

  async listSessionCheckpoints(periodId) {
    await delay();
    return structuredClone(
      sessionCheckpoints.filter((item) => item.businessPeriodId === periodId),
    );
  },

  async createAdjustment(input: CreatePeriodAdjustmentInput) {
    await delay();
    if (!input.reason.trim()) {
      throw { code: "VALIDATION_ERROR", message: "Adjustment reason is required." };
    }

    assertBusinessDateWritable({
      branchId: input.branchId,
      businessDate: input.postingBusinessDate,
      dayPeriods,
      monthlyPeriods,
    });

    if (input.originalBusinessDate) {
      const lock = assertBusinessDateWritable;
      // Original period may be closed — that is expected for adjustments.
      void lock;
    }

    const adjustment: PeriodAdjustment = {
      id: generateId("padj"),
      branchId: input.branchId,
      postingBusinessDate: input.postingBusinessDate,
      entityType: input.entityType,
      entityId: input.entityId,
      originalBusinessDate: input.originalBusinessDate,
      originalTransactionId: input.originalTransactionId,
      adjustmentType: input.adjustmentType,
      quantityDelta: input.quantityDelta,
      amountDelta: input.amountDelta,
      reason: input.reason.trim(),
      createdBy: ACTOR.userId,
      createdByName: ACTOR.userName,
      createdAt: nowIso(),
    };
    adjustments.unshift(adjustment);

    const openDay = findActiveOpenDay(dayPeriods, input.branchId);
    if (openDay) {
      pushDayAudit(openDay.id, "adjustment_posted", input.reason, {
        adjustmentId: adjustment.id,
        originalTransactionId: input.originalTransactionId,
      });
    }

    return structuredClone(adjustment);
  },

  async listAdjustments(branchId = DEFAULT_BRANCH_ID) {
    await delay();
    return structuredClone(
      adjustments.filter((item) => item.branchId === branchId),
    );
  },

  async assertWritable(branchId, businessDate) {
    await delay(50);
    assertBusinessDateWritable({
      branchId,
      businessDate,
      dayPeriods,
      monthlyPeriods,
    });
  },
};

/** Synchronous lock check for other mock services (no network delay). */
export function assertMockPeriodWritable(
  branchId: string,
  businessDate: string,
): void {
  assertBusinessDateWritable({
    branchId,
    businessDate,
    dayPeriods,
    monthlyPeriods,
  });
}

export function getMockDayPeriods(): BusinessPeriod[] {
  return dayPeriods;
}

export function getMockMonthlyPeriods(): MonthlyPeriod[] {
  return monthlyPeriods;
}
