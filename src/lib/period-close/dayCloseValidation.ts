import { validateEmployeeDayHours } from "@/lib/employee-work/employeeDayClose";
import type { EmployeeDayWorkSummary } from "@/types/employee-work";
import type { DayCloseValidationIssue } from "@/types/period-close";

export type DayCloseValidationContext = {
  businessPeriodId: string;
  /** Orders in invalid/incomplete transactional states (not merely in-progress). */
  invalidOrders: Array<{
    id: string;
    orderNumber: string;
    reasonCode: string;
    message: string;
  }>;
  /** Delivered without required invoice. */
  deliveredWithoutInvoice: Array<{ id: string; orderNumber: string }>;
  /** Cancelled with incomplete reversal. */
  incompleteCancellations: Array<{ id: string; orderNumber: string }>;
  /** Unposted invoices dated on this business date. */
  unpostedInvoices: Array<{ id: string; invoiceNumber: string }>;
  /** Unposted payments dated on this business date. */
  unpostedPayments: Array<{ id: string; paymentNumber: string }>;
  /** Unapproved stock adjustments for the day. */
  unapprovedAdjustments: Array<{ id: string; reference: string }>;
  /** Active sessions when rule requires confirmation. */
  sessionsAwaitingConfirm: number;
  /** Employee productive-hour summaries for the business date. */
  employeeDaySummaries?: EmployeeDayWorkSummary[];
  allowIncompleteEmployeeHoursException?: boolean;
  incompleteHoursExceptionConfirmed?: boolean;
  requireOvertimeApproval?: boolean;
  overtimeApproved?: boolean;
};

let issueSeq = 0;

function nextIssueId(): string {
  issueSeq += 1;
  return `dcv-${issueSeq}`;
}

function issue(
  businessPeriodId: string,
  partial: Omit<DayCloseValidationIssue, "id" | "businessPeriodId">,
): DayCloseValidationIssue {
  return {
    id: nextIssueId(),
    businessPeriodId,
    ...partial,
  };
}

/**
 * Day Close validation.
 * Blocking for broken transactional integrity — never for normal
 * in-progress production. Incomplete employee hours block unless
 * company policy allows a supervisor exception.
 */
export function validateDayClose(
  context: DayCloseValidationContext,
): DayCloseValidationIssue[] {
  const { businessPeriodId } = context;
  const issues: DayCloseValidationIssue[] = [];

  for (const order of context.invalidOrders) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: order.reasonCode,
        validationType: "orders",
        message: order.message,
        entityType: "sales_order",
        entityId: order.id,
        isBlocking: true,
      }),
    );
  }

  for (const order of context.deliveredWithoutInvoice) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "ORDER_DELIVERED_WITHOUT_INVOICE",
        validationType: "orders",
        message: `Order ${order.orderNumber} is marked delivered without a required invoice.`,
        entityType: "sales_order",
        entityId: order.id,
        isBlocking: true,
      }),
    );
  }

  for (const order of context.incompleteCancellations) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "CANCEL_REVERSAL_INCOMPLETE",
        validationType: "orders",
        message: `Cancelled order ${order.orderNumber} has an incomplete reversal.`,
        entityType: "sales_order",
        entityId: order.id,
        isBlocking: true,
      }),
    );
  }

  for (const invoice of context.unpostedInvoices) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "INVOICE_UNPOSTED",
        validationType: "finance",
        message: `Invoice ${invoice.invoiceNumber} is not posted for this business date.`,
        entityType: "invoice",
        entityId: invoice.id,
        isBlocking: true,
      }),
    );
  }

  for (const payment of context.unpostedPayments) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "PAYMENT_UNPOSTED",
        validationType: "finance",
        message: `Payment ${payment.paymentNumber} is not posted for this business date.`,
        entityType: "payment",
        entityId: payment.id,
        isBlocking: true,
      }),
    );
  }

  for (const adjustment of context.unapprovedAdjustments) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "STOCK_ADJUSTMENT_UNAPPROVED",
        validationType: "inventory",
        message: `Stock adjustment ${adjustment.reference} is awaiting approval.`,
        entityType: "stock_adjustment",
        entityId: adjustment.id,
        isBlocking: true,
      }),
    );
  }

  if (context.sessionsAwaitingConfirm > 0) {
    issues.push(
      issue(businessPeriodId, {
        validationCode: "ACTIVE_SESSIONS_NEED_CONFIRM",
        validationType: "production",
        message: `${context.sessionsAwaitingConfirm} active worker session(s) require supervisor confirmation before Day Close.`,
        isBlocking: true,
      }),
    );
  }

  if (context.employeeDaySummaries && context.employeeDaySummaries.length > 0) {
    issues.push(
      ...validateEmployeeDayHours({
        businessPeriodId,
        summaries: context.employeeDaySummaries,
        allowIncompleteEmployeeHoursException:
          context.allowIncompleteEmployeeHoursException ?? false,
        incompleteHoursExceptionConfirmed:
          context.incompleteHoursExceptionConfirmed,
        requireOvertimeApproval: context.requireOvertimeApproval,
        overtimeApproved: context.overtimeApproved,
      }),
    );
  }

  return issues;
}

export function hasBlockingDayCloseIssues(
  issues: DayCloseValidationIssue[],
): boolean {
  return issues.some((item) => item.isBlocking);
}
