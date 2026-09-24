import type {
  BusinessPeriod,
  MonthlyCloseValidationIssue,
} from "@/types/period-close";
import { PeriodStatus } from "@/types/period-close";
import { businessDatesInMonth } from "@/lib/period-close/constants";

export type MonthlyCloseValidationContext = {
  monthlyPeriodId: string;
  year: number;
  month: number;
  requireAllDaysClosed: boolean;
  dayPeriods: BusinessPeriod[];
  unpostedInvoices: Array<{ id: string; invoiceNumber: string }>;
  unpostedPayments: Array<{ id: string; paymentNumber: string }>;
  inventoryReconciliationProblems: Array<{ id: string; message: string }>;
  unapprovedStockAdjustments: Array<{ id: string; reference: string }>;
  pendingFinancialAdjustments: Array<{ id: string; reference: string }>;
  negativeStockItems: Array<{ id: string; sku: string; qty: number }>;
  allowNegativeStock: boolean;
  incompleteCosting: Array<{ id: string; reference: string }>;
  unpostedProductionOutput: Array<{ id: string; reference: string }>;
  missingExpensePostings: Array<{ id: string; reference: string }>;
  /** In-progress production — warning only; never blocking. */
  inProgressProductionJobs: number;
};

let issueSeq = 0;

function nextIssueId(): string {
  issueSeq += 1;
  return `mcv-${issueSeq}`;
}

function issue(
  monthlyPeriodId: string,
  partial: Omit<MonthlyCloseValidationIssue, "id" | "monthlyPeriodId">,
): MonthlyCloseValidationIssue {
  return {
    id: nextIssueId(),
    monthlyPeriodId,
    ...partial,
  };
}

export function validateMonthlyClose(
  context: MonthlyCloseValidationContext,
): MonthlyCloseValidationIssue[] {
  const { monthlyPeriodId } = context;
  const issues: MonthlyCloseValidationIssue[] = [];

  if (context.requireAllDaysClosed) {
    const requiredDates = businessDatesInMonth(context.year, context.month);
    const byDate = new Map(
      context.dayPeriods.map((period) => [period.businessDate, period]),
    );

    const missingOrOpen = requiredDates.filter((date) => {
      const period = byDate.get(date);
      return !period || period.status !== PeriodStatus.closed;
    });

    if (missingOrOpen.length > 0) {
      issues.push(
        issue(monthlyPeriodId, {
          validationCode: "DAYS_NOT_CLOSED",
          validationType: "period",
          message: `${missingOrOpen.length} business day(s) in this month are not closed.`,
          isBlocking: true,
        }),
      );
    }
  }

  for (const invoice of context.unpostedInvoices) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "INVOICE_UNPOSTED",
        validationType: "finance",
        message: `Invoice ${invoice.invoiceNumber} has not been posted.`,
        entityType: "invoice",
        entityId: invoice.id,
        isBlocking: true,
      }),
    );
  }

  for (const payment of context.unpostedPayments) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "PAYMENT_UNPOSTED",
        validationType: "finance",
        message: `Payment ${payment.paymentNumber} has not been posted.`,
        entityType: "payment",
        entityId: payment.id,
        isBlocking: true,
      }),
    );
  }

  for (const problem of context.inventoryReconciliationProblems) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "INVENTORY_RECONCILIATION",
        validationType: "inventory",
        message: problem.message,
        entityType: "inventory",
        entityId: problem.id,
        isBlocking: true,
      }),
    );
  }

  for (const adjustment of context.unapprovedStockAdjustments) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "STOCK_ADJUSTMENT_UNAPPROVED",
        validationType: "inventory",
        message: `Stock adjustment ${adjustment.reference} is unapproved.`,
        entityType: "stock_adjustment",
        entityId: adjustment.id,
        isBlocking: true,
      }),
    );
  }

  for (const adjustment of context.pendingFinancialAdjustments) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "FINANCIAL_ADJUSTMENT_PENDING",
        validationType: "finance",
        message: `Financial adjustment ${adjustment.reference} is pending.`,
        entityType: "financial_adjustment",
        entityId: adjustment.id,
        isBlocking: true,
      }),
    );
  }

  if (!context.allowNegativeStock) {
    for (const item of context.negativeStockItems) {
      issues.push(
        issue(monthlyPeriodId, {
          validationCode: "NEGATIVE_STOCK",
          validationType: "inventory",
          message: `${item.sku} has invalid negative stock (${item.qty}).`,
          entityType: "inventory_item",
          entityId: item.id,
          isBlocking: true,
        }),
      );
    }
  }

  for (const costing of context.incompleteCosting) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "COSTING_INCOMPLETE",
        validationType: "costing",
        message: `Costing transaction ${costing.reference} is incomplete.`,
        entityType: "costing",
        entityId: costing.id,
        isBlocking: true,
      }),
    );
  }

  for (const output of context.unpostedProductionOutput) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "PRODUCTION_OUTPUT_UNPOSTED",
        validationType: "production",
        message: `Production output ${output.reference} is unposted.`,
        entityType: "production_output",
        entityId: output.id,
        isBlocking: true,
      }),
    );
  }

  for (const expense of context.missingExpensePostings) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "EXPENSE_MISSING",
        validationType: "finance",
        message: `Expense posting ${expense.reference} is missing.`,
        entityType: "expense",
        entityId: expense.id,
        isBlocking: true,
      }),
    );
  }

  if (context.inProgressProductionJobs > 0) {
    issues.push(
      issue(monthlyPeriodId, {
        validationCode: "PRODUCTION_IN_PROGRESS",
        validationType: "production",
        message: `${context.inProgressProductionJobs} production job(s) remain in progress (allowed across month end).`,
        isBlocking: false,
      }),
    );
  }

  return issues;
}

export function hasBlockingMonthlyCloseIssues(
  issues: MonthlyCloseValidationIssue[],
): boolean {
  return issues.some((item) => item.isBlocking);
}
