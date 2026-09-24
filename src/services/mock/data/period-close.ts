import { PeriodStatus, WorkerSessionCloseRule } from "@/types/period-close";
import type {
  BusinessPeriod,
  DailyClosingSummary,
  DayCloseValidationIssue,
  InventoryDailySnapshot,
  MonthlyPeriod,
  PeriodAuditLog,
  PeriodCloseSettings,
  ProductionDailySnapshot,
  WorkerSessionCheckpoint,
} from "@/types/period-close";
import {
  DEFAULT_BRANCH_ID,
  DEFAULT_PERIOD_CLOSE_SETTINGS,
} from "@/lib/period-close/constants";

const ACTOR = {
  userId: "usr-001",
  userName: "System Administrator",
};

/** Seed: Sep 1–22 closed, Sep 23 open (current business date). */
function buildClosedDays(): BusinessPeriod[] {
  const periods: BusinessPeriod[] = [];
  for (let day = 1; day <= 22; day += 1) {
    const businessDate = `2026-09-${String(day).padStart(2, "0")}`;
    const closedAt = `${businessDate}T18:05:00.000Z`;
    periods.push({
      id: `bp-2026-09-${String(day).padStart(2, "0")}`,
      branchId: DEFAULT_BRANCH_ID,
      businessDate,
      status: PeriodStatus.closed,
      openedAt: `${businessDate}T00:05:00.000Z`,
      openedBy: ACTOR.userId,
      openedByName: ACTOR.userName,
      closedAt,
      closedBy: ACTOR.userId,
      closedByName: ACTOR.userName,
      originalClosedAt: closedAt,
      originalClosedBy: ACTOR.userId,
      originalClosedByName: ACTOR.userName,
      closeCount: 1,
    });
  }
  return periods;
}

export const seedSettings: PeriodCloseSettings = {
  ...DEFAULT_PERIOD_CLOSE_SETTINGS,
  workerSessionCloseRule: WorkerSessionCloseRule.pause_and_checkpoint,
};

export const seedDayPeriods: BusinessPeriod[] = [
  ...buildClosedDays(),
  {
    id: "bp-2026-09-23",
    branchId: DEFAULT_BRANCH_ID,
    businessDate: "2026-09-23",
    status: PeriodStatus.open,
    openedAt: "2026-09-23T00:05:00.000Z",
    openedBy: ACTOR.userId,
    openedByName: ACTOR.userName,
    closeCount: 0,
  },
];

export const seedMonthlyPeriods: MonthlyPeriod[] = [
  {
    id: "mp-2026-08",
    branchId: DEFAULT_BRANCH_ID,
    year: 2026,
    month: 8,
    status: PeriodStatus.closed,
    startedAt: "2026-08-01T00:05:00.000Z",
    startedBy: ACTOR.userId,
    startedByName: ACTOR.userName,
    closedAt: "2026-09-01T08:00:00.000Z",
    closedBy: ACTOR.userId,
    closedByName: ACTOR.userName,
    originalClosedAt: "2026-09-01T08:00:00.000Z",
    originalClosedBy: ACTOR.userId,
    originalClosedByName: ACTOR.userName,
    closeCount: 1,
  },
  {
    id: "mp-2026-09",
    branchId: DEFAULT_BRANCH_ID,
    year: 2026,
    month: 9,
    status: PeriodStatus.open,
    startedAt: "2026-09-01T00:05:00.000Z",
    startedBy: ACTOR.userId,
    startedByName: ACTOR.userName,
    closeCount: 0,
  },
];

/** Sample operational totals for the open day (matches spec example). */
export const seedOpenDayActivity = {
  ordersCreated: 15,
  productionJobs: 8,
  completedProductionQty: 23,
  partialProductionQty: 6,
  invoices: 10,
  invoiceTotal: 200_000,
  payments: 8,
  paymentTotal: 150_000,
  deliveries: 6,
  materialIssues: 18,
  materialReturns: 4,
  inventoryMovementCount: 28,
  quotationValue: 320_000,
  salesOrderValue: 275_000,
  creditNoteTotal: 10_000,
  cashPayments: 45_000,
  cardPayments: 60_000,
  bankPayments: 35_000,
  advancePayments: 10_000,
  refunds: 0,
  openingReceivable: 500_000,
  transactionRefs: {
    orderIds: ["so-1001", "so-1002", "so-1003"],
    invoiceIds: ["inv-00420", "inv-00421", "inv-00422"],
    paymentIds: ["pay-0310", "pay-0311"],
    deliveryIds: ["dlv-0201", "dlv-0202"],
    stockMovementIds: ["sm-d001", "sm-d002", "sm-d003"],
    productionJobIds: ["mj-1001", "mj-1002"],
  },
};

export const seedProductionSources = [
  {
    productionOrderId: "mj-1001",
    productionOrderNumber: "PJ-1001",
    operationId: "op-weld",
    operationName: "Welding",
    workerId: "usr-010",
    workerName: "Worker A",
    unitProgressPercentages: [70, 95],
    workedMinutes: 180,
    producedQty: 0,
    rejectedQty: 0,
  },
  {
    productionOrderId: "mj-1001",
    productionOrderNumber: "PJ-1001",
    operationId: "op-weld",
    operationName: "Welding",
    workerId: "usr-011",
    workerName: "Worker B",
    unitProgressPercentages: [100, 100],
    workedMinutes: 210,
    producedQty: 2,
    rejectedQty: 0,
  },
  {
    productionOrderId: "mj-1002",
    productionOrderNumber: "PJ-1002",
    operationId: "op-cut",
    operationName: "Cutting",
    workerId: "usr-012",
    workerName: "Worker C",
    unitProgressPercentages: [100, 100, 60, 40],
    workedMinutes: 240,
    producedQty: 2,
    rejectedQty: 0,
  },
];

export const seedActiveSessions = [
  {
    sessionId: "ws-901",
    workerId: "usr-010",
    workerName: "Worker A",
    productionOrderId: "mj-1001",
    operationId: "op-weld",
    operationName: "Welding",
    progressPercentage: 75,
    startedAt: "2026-09-23T15:00:00.000Z",
  },
];

export const seedInventoryBuckets = [
  {
    inventoryItemId: "inv-brass",
    sku: "RAW-BRASS",
    name: "Brass",
    unit: "KG",
    openingQty: 100,
    receipts: 50,
    returns: 4,
    productionOutput: 0,
    issues: 18,
    consumption: 52,
    deliveries: 0,
    adjustments: 0,
    movementIds: ["sm-d001", "sm-d002"],
  },
  {
    inventoryItemId: "inv-glass",
    sku: "RAW-GLASS",
    name: "Glass",
    unit: "PCS",
    openingQty: 200,
    receipts: 80,
    returns: 0,
    productionOutput: 0,
    issues: 10,
    consumption: 80,
    deliveries: 6,
    adjustments: -4,
    movementIds: ["sm-d003"],
  },
  {
    inventoryItemId: "inv-wire",
    sku: "RAW-WIRE",
    name: "Wire",
    unit: "M",
    openingQty: 500,
    receipts: 200,
    returns: 0,
    productionOutput: 0,
    issues: 0,
    consumption: 350,
    deliveries: 0,
    adjustments: 0,
    movementIds: ["sm-d004"],
  },
];

export const seedInvalidOrders: Array<{
  id: string;
  orderNumber: string;
  reasonCode: string;
  message: string;
}> = [];

export const seedDeliveredWithoutInvoice: Array<{
  id: string;
  orderNumber: string;
}> = [];

export const seedIncompleteCancellations: Array<{
  id: string;
  orderNumber: string;
}> = [];

export const seedUnpostedInvoices: Array<{ id: string; invoiceNumber: string }> = [];
export const seedUnpostedPayments: Array<{ id: string; paymentNumber: string }> = [];
export const seedUnapprovedAdjustments: Array<{ id: string; reference: string }> = [];

/** Sample demo blocking issues that can be toggled off after "fix". Empty by default for clean close path. */
export const seedDemoBlockingIssuesEnabled = false;

export const seedDayAudit: PeriodAuditLog[] = [
  {
    id: "pal-open-0923",
    periodType: "day",
    periodId: "bp-2026-09-23",
    action: "opened",
    userId: ACTOR.userId,
    userName: ACTOR.userName,
    performedAt: "2026-09-23T00:05:00.000Z",
  },
];

export const seedMonthAudit: PeriodAuditLog[] = [
  {
    id: "pal-open-09",
    periodType: "month",
    periodId: "mp-2026-09",
    action: "opened",
    userId: ACTOR.userId,
    userName: ACTOR.userName,
    performedAt: "2026-09-01T00:05:00.000Z",
  },
];

export type PeriodCloseSeedStore = {
  settings: PeriodCloseSettings;
  dayPeriods: BusinessPeriod[];
  monthlyPeriods: MonthlyPeriod[];
  daySummaries: DailyClosingSummary[];
  dayValidations: DayCloseValidationIssue[];
  productionDaily: ProductionDailySnapshot[];
  inventoryDaily: InventoryDailySnapshot[];
  sessionCheckpoints: WorkerSessionCheckpoint[];
  dayAudit: PeriodAuditLog[];
  monthAudit: PeriodAuditLog[];
};
