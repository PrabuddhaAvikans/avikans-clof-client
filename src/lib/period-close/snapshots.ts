import type {
  DailyClosingSummary,
  DailyTransactionRefs,
  InventoryDailySnapshot,
  InventoryMonthlySnapshot,
  MonthlyClosingSummary,
  MonthlyTransactionRefs,
  ProductionDailySnapshot,
  ProductionMonthlySnapshot,
} from "@/types/period-close";
import { aggregateProductionProgress, calculateWipCost, roundMoney } from "@/lib/period-close/wip";

export type ProductionSnapshotSource = {
  productionOrderId: string;
  productionOrderNumber: string;
  operationId: string;
  operationName: string;
  workerId?: string;
  workerName?: string;
  unitProgressPercentages: number[];
  workedMinutes: number;
  producedQty: number;
  rejectedQty: number;
  jobStatus?: string;
  taskStatus?: string;
};

export function buildProductionDailySnapshots(options: {
  businessPeriodId: string;
  businessDate: string;
  sources: ProductionSnapshotSource[];
  recordedAt: string;
  idFactory: () => string;
}): ProductionDailySnapshot[] {
  return options.sources.map((source) => {
    const progress = aggregateProductionProgress(source.unitProgressPercentages);
    return {
      id: options.idFactory(),
      businessPeriodId: options.businessPeriodId,
      businessDate: options.businessDate,
      productionOrderId: source.productionOrderId,
      productionOrderNumber: source.productionOrderNumber,
      operationId: source.operationId,
      operationName: source.operationName,
      workerId: source.workerId,
      workerName: source.workerName,
      totalQty: progress.totalQty,
      completedQty: progress.completedQty,
      partialQty: progress.partialQty,
      progressPercentage: progress.progressPercentage,
      workedMinutes: source.workedMinutes,
      producedQty: source.producedQty,
      rejectedQty: source.rejectedQty,
      jobStatus: source.jobStatus,
      taskStatus: source.taskStatus,
      recordedAt: options.recordedAt,
    };
  });
}

export type MonthlyProductionSnapshotSource = {
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
  materialConsumedValue: number;
  laborCostToDate: number;
  overheadAllocated?: number;
};

export function buildProductionMonthlySnapshots(options: {
  monthlyPeriodId: string;
  year: number;
  month: number;
  sources: MonthlyProductionSnapshotSource[];
  recordedAt: string;
  idFactory: () => string;
}): ProductionMonthlySnapshot[] {
  return options.sources.map((source) => {
    const wipCost = calculateWipCost({
      materialConsumedValue: source.materialConsumedValue,
      laborCostToDate: source.laborCostToDate,
      overheadAllocated: source.overheadAllocated,
    });

    return {
      id: options.idFactory(),
      monthlyPeriodId: options.monthlyPeriodId,
      year: options.year,
      month: options.month,
      productionOrderId: source.productionOrderId,
      productionOrderNumber: source.productionOrderNumber,
      operationId: source.operationId,
      operationName: source.operationName,
      totalQty: source.totalQty,
      completedQty: source.completedQty,
      workInProgressQty: source.workInProgressQty,
      progressPercentage: source.progressPercentage,
      materialConsumed: source.materialConsumed,
      laborHours: source.laborHours,
      estimatedCost: source.estimatedCost,
      actualCostToDate: source.actualCostToDate,
      wipCost,
      recordedAt: options.recordedAt,
    };
  });
}

export type InventoryMovementBucket = {
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
  movementIds: string[];
};

export function buildInventoryDailySnapshots(options: {
  businessPeriodId: string;
  businessDate: string;
  buckets: InventoryMovementBucket[];
  recordedAt: string;
  idFactory: () => string;
}): InventoryDailySnapshot[] {
  return options.buckets.map((bucket) => {
    const closingQty =
      bucket.openingQty +
      bucket.receipts +
      bucket.returns +
      bucket.productionOutput -
      bucket.issues -
      bucket.consumption -
      bucket.deliveries +
      bucket.adjustments;

    return {
      id: options.idFactory(),
      businessPeriodId: options.businessPeriodId,
      businessDate: options.businessDate,
      inventoryItemId: bucket.inventoryItemId,
      sku: bucket.sku,
      name: bucket.name,
      unit: bucket.unit,
      openingQty: bucket.openingQty,
      receipts: bucket.receipts,
      returns: bucket.returns,
      productionOutput: bucket.productionOutput,
      issues: bucket.issues,
      consumption: bucket.consumption,
      deliveries: bucket.deliveries,
      adjustments: bucket.adjustments,
      closingQty,
      movementIds: bucket.movementIds,
      recordedAt: options.recordedAt,
    };
  });
}

export type InventoryMonthlyBucket = {
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
  unitCost: number;
};

export function buildInventoryMonthlySnapshots(options: {
  monthlyPeriodId: string;
  year: number;
  month: number;
  buckets: InventoryMonthlyBucket[];
  recordedAt: string;
  idFactory: () => string;
}): InventoryMonthlySnapshot[] {
  return options.buckets.map((bucket) => {
    const closingQty =
      bucket.openingQty +
      bucket.receivedQty -
      bucket.consumedQty +
      bucket.adjustmentQty;
    const closingValue = roundMoney(
      bucket.openingValue +
        bucket.receivedValue -
        bucket.consumedValue +
        bucket.adjustmentValue,
    );

    return {
      id: options.idFactory(),
      monthlyPeriodId: options.monthlyPeriodId,
      year: options.year,
      month: options.month,
      inventoryItemId: bucket.inventoryItemId,
      sku: bucket.sku,
      name: bucket.name,
      unit: bucket.unit,
      openingQty: bucket.openingQty,
      openingValue: bucket.openingValue,
      receivedQty: bucket.receivedQty,
      receivedValue: bucket.receivedValue,
      consumedQty: bucket.consumedQty,
      consumedValue: bucket.consumedValue,
      adjustmentQty: bucket.adjustmentQty,
      adjustmentValue: bucket.adjustmentValue,
      closingQty,
      closingValue,
      recordedAt: options.recordedAt,
    };
  });
}

export type DailySummaryInput = {
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
  transactionRefs: DailyTransactionRefs;
  createdAt: string;
  idFactory: () => string;
};

export function buildDailyClosingSummary(input: DailySummaryInput): DailyClosingSummary {
  const closingReceivable = roundMoney(
    input.openingReceivable +
      input.invoiceTotal -
      input.paymentTotal -
      input.creditNoteTotal,
  );

  return {
    id: input.idFactory(),
    businessPeriodId: input.businessPeriodId,
    businessDate: input.businessDate,
    branchId: input.branchId,
    ordersCreated: input.ordersCreated,
    productionJobs: input.productionJobs,
    completedProductionQty: input.completedProductionQty,
    partialProductionQty: input.partialProductionQty,
    invoices: input.invoices,
    invoiceTotal: input.invoiceTotal,
    payments: input.payments,
    paymentTotal: input.paymentTotal,
    deliveries: input.deliveries,
    materialIssues: input.materialIssues,
    materialReturns: input.materialReturns,
    inventoryMovementCount: input.inventoryMovementCount,
    quotationValue: input.quotationValue,
    salesOrderValue: input.salesOrderValue,
    creditNoteTotal: input.creditNoteTotal,
    cashPayments: input.cashPayments,
    cardPayments: input.cardPayments,
    bankPayments: input.bankPayments,
    advancePayments: input.advancePayments,
    refunds: input.refunds,
    openingReceivable: input.openingReceivable,
    closingReceivable,
    outstandingAmount: closingReceivable,
    transactionRefs: input.transactionRefs,
    createdAt: input.createdAt,
  };
}

export type MonthlySummaryInput = {
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
  rawMaterials: number;
  labour: number;
  production: number;
  waste: number;
  reusableWaste: number;
  overhead: number;
  creditNotes: number;
  transactionRefs: MonthlyTransactionRefs;
  createdAt: string;
  idFactory: () => string;
};

export function buildMonthlyClosingSummary(
  input: MonthlySummaryInput,
): MonthlyClosingSummary {
  const grossProfit = roundMoney(input.salesTotal - input.costOfGoodsSold);
  const netMargin = roundMoney(grossProfit - input.expenseTotal);

  return {
    id: input.idFactory(),
    monthlyPeriodId: input.monthlyPeriodId,
    year: input.year,
    month: input.month,
    branchId: input.branchId,
    salesTotal: input.salesTotal,
    purchaseTotal: input.purchaseTotal,
    paymentTotal: input.paymentTotal,
    expenseTotal: input.expenseTotal,
    inventoryValue: input.inventoryValue,
    wipValue: input.wipValue,
    costOfGoodsSold: input.costOfGoodsSold,
    grossProfit,
    rawMaterials: input.rawMaterials,
    labour: input.labour,
    production: input.production,
    waste: input.waste,
    reusableWaste: input.reusableWaste,
    overhead: input.overhead,
    creditNotes: input.creditNotes,
    netMargin,
    transactionRefs: input.transactionRefs,
    createdAt: input.createdAt,
  };
}
