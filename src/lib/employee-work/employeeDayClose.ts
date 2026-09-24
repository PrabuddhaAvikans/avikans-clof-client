import {
  REQUIRED_DAILY_WORK_MINUTES,
  minutesBetween,
} from "@/lib/employee-work/constants";
import {
  estimateDailyLabourCost,
  splitDailyWorkMinutes,
} from "@/lib/employee-work/overtime";
import {
  calculateSessionPauseMinutes,
  calculateSessionWorkedMinutes,
} from "@/lib/employee-work/sessionTime";
import { EmployeeDayStatus } from "@/types/employee-work";
import type {
  EmployeeDayWorkSummary,
  EmployeeTaskWorkBreakdown,
  EmployeeWorkSession,
} from "@/types/employee-work";
import type { DayCloseValidationIssue } from "@/types/period-close";

/** Default: double OT after 10 hours (8h regular + 2h normal OT). */
export const DEFAULT_DOUBLE_OVERTIME_AFTER_MINUTES = 10 * 60;

export type EmployeeDayClosePolicy = {
  requiredDailyWorkMinutes?: number;
  countPauseAsWorked?: boolean;
  allowIncompleteEmployeeHoursException?: boolean;
  /** Absolute minutes after which further time is double OT. 0 disables auto DOT. */
  doubleOvertimeAfterMinutes?: number;
  /** When true, overtime must be approved before Day Close. */
  requireOvertimeApproval?: boolean;
};

export type BuildEmployeeDaySummariesOptions = EmployeeDayClosePolicy & {
  businessDate: string;
  sessions: EmployeeWorkSession[];
  asOf?: string;
};

export function buildEmployeeDaySummaries(
  options: BuildEmployeeDaySummariesOptions,
): EmployeeDayWorkSummary[] {
  const required =
    options.requiredDailyWorkMinutes ?? REQUIRED_DAILY_WORK_MINUTES;
  const doubleAfter =
    options.doubleOvertimeAfterMinutes ?? DEFAULT_DOUBLE_OVERTIME_AFTER_MINUTES;
  const asOf = options.asOf ?? new Date().toISOString();
  const byEmployee = new Map<string, EmployeeWorkSession[]>();

  for (const session of options.sessions) {
    if (session.businessDate !== options.businessDate) continue;
    const list = byEmployee.get(session.employeeId) ?? [];
    list.push(session);
    byEmployee.set(session.employeeId, list);
  }

  const summaries: EmployeeDayWorkSummary[] = [];

  for (const [employeeId, sessions] of byEmployee) {
    const employeeName = sessions[0]?.employeeName ?? employeeId;
    let workedMinutes = 0;
    let pauseMinutes = 0;
    let breakMinutes = 0;

    for (const session of sessions) {
      workedMinutes += calculateSessionWorkedMinutes(session, asOf, {
        countPauseAsWorked: options.countPauseAsWorked,
      });
      pauseMinutes += calculateSessionPauseMinutes(session, asOf);
      breakMinutes += Math.max(0, session.breakMinutes);
    }

    const firstStart = sessions.map((s) => s.startedAt).sort()[0];
    const lastEndCandidates = sessions.map(
      (s) => s.endedAt ?? (isLive(s) ? asOf : s.startedAt),
    );
    const lastEnd = lastEndCandidates.sort().at(-1) ?? firstStart;
    const attendanceMinutes = firstStart
      ? minutesBetween(firstStart, lastEnd)
      : 0;

    const remainingMinutes = Math.max(0, required - workedMinutes);
    const dayStatus =
      workedMinutes >= required
        ? EmployeeDayStatus.completed
        : EmployeeDayStatus.incomplete;

    const split = splitDailyWorkMinutes({
      workedMinutes,
      requiredMinutes: required,
      doubleOvertimeAfterMinutes: doubleAfter,
    });
    const cost = estimateDailyLabourCost(split);

    summaries.push({
      employeeId,
      employeeName,
      businessDate: options.businessDate,
      requiredMinutes: required,
      workedMinutes,
      regularMinutes: split.regularMinutes,
      normalOvertimeMinutes: split.normalOvertimeMinutes,
      doubleOvertimeMinutes: split.doubleOvertimeMinutes,
      overtimeMinutes: split.overtimeMinutes,
      pauseMinutes,
      breakMinutes,
      attendanceMinutes,
      remainingMinutes,
      dayStatus,
      canClose: dayStatus === EmployeeDayStatus.completed,
      regularCost: cost.regularCost,
      normalOvertimeCost: cost.normalOvertimeCost,
      doubleOvertimeCost: cost.doubleOvertimeCost,
      overtimeCost: cost.overtimeCost,
      laborCost: cost.laborCost,
      sessions: sessions.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      taskBreakdown: buildTaskBreakdown(sessions, asOf, options.countPauseAsWorked),
    });
  }

  return summaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

function isLive(session: EmployeeWorkSession): boolean {
  return (
    session.status === "started" ||
    session.status === "working" ||
    session.status === "paused" ||
    session.status === "on_hold"
  );
}

function buildTaskBreakdown(
  sessions: EmployeeWorkSession[],
  asOf: string,
  countPauseAsWorked?: boolean,
): EmployeeTaskWorkBreakdown[] {
  const map = new Map<string, EmployeeTaskWorkBreakdown>();

  for (const session of sessions) {
    const key = session.taskId ?? session.id;
    const worked = calculateSessionWorkedMinutes(session, asOf, {
      countPauseAsWorked,
    });
    const existing = map.get(key);
    if (existing) {
      existing.workedMinutes += worked;
      continue;
    }
    map.set(key, {
      taskId: session.taskId ?? session.id,
      taskName: session.taskName ?? "Work session",
      productionOrderId: session.productionOrderId,
      productionOrderNumber: session.productionOrderNumber,
      workedMinutes: worked,
    });
  }

  return [...map.values()].sort((a, b) => b.workedMinutes - a.workedMinutes);
}

export type EmployeeDayValidationContext = {
  businessPeriodId: string;
  summaries: EmployeeDayWorkSummary[];
  allowIncompleteEmployeeHoursException: boolean;
  incompleteHoursExceptionConfirmed?: boolean;
  requireOvertimeApproval?: boolean;
  overtimeApproved?: boolean;
};

let issueSeq = 0;

function nextIssueId(): string {
  issueSeq += 1;
  return `edc-${issueSeq}`;
}

export function validateEmployeeDayHours(
  context: EmployeeDayValidationContext,
): DayCloseValidationIssue[] {
  const issues: DayCloseValidationIssue[] = [];
  const incomplete = context.summaries.filter(
    (item) => item.dayStatus === EmployeeDayStatus.incomplete,
  );

  for (const employee of incomplete) {
    const workedH = (employee.workedMinutes / 60).toFixed(1);
    const requiredH = (employee.requiredMinutes / 60).toFixed(0);
    const remainingH = (employee.remainingMinutes / 60).toFixed(1);

    if (
      context.allowIncompleteEmployeeHoursException &&
      context.incompleteHoursExceptionConfirmed
    ) {
      issues.push({
        id: nextIssueId(),
        businessPeriodId: context.businessPeriodId,
        validationCode: "EMPLOYEE_HOURS_INCOMPLETE_EXCEPTION",
        validationType: "employee_hours",
        message: `${employee.employeeName}: worked ${workedH}h of ${requiredH}h required (${remainingH}h remaining) — closing under approved exception.`,
        entityType: "employee",
        entityId: employee.employeeId,
        isBlocking: false,
      });
      continue;
    }

    const needsConfirm =
      context.allowIncompleteEmployeeHoursException &&
      !context.incompleteHoursExceptionConfirmed;

    issues.push({
      id: nextIssueId(),
      businessPeriodId: context.businessPeriodId,
      validationCode: needsConfirm
        ? "EMPLOYEE_HOURS_NEED_EXCEPTION"
        : "EMPLOYEE_HOURS_INCOMPLETE",
      validationType: "employee_hours",
      message: needsConfirm
        ? `${employee.employeeName}: worked ${workedH}h of ${requiredH}h (${remainingH}h remaining). Supervisor exception required to close.`
        : `${employee.employeeName}: worked ${workedH}h of ${requiredH}h required (${remainingH}h remaining). Employee day is incomplete.`,
      entityType: "employee",
      entityId: employee.employeeId,
      isBlocking: true,
    });
  }

  const withOt = context.summaries.filter((item) => item.overtimeMinutes > 0);
  if (withOt.length > 0) {
    const totalOtMinutes = withOt.reduce((sum, item) => sum + item.overtimeMinutes, 0);
    const totalOtH = (totalOtMinutes / 60).toFixed(1);
    const names = withOt.map((item) => item.employeeName).join(", ");

    if (context.requireOvertimeApproval && !context.overtimeApproved) {
      issues.push({
        id: nextIssueId(),
        businessPeriodId: context.businessPeriodId,
        validationCode: "EMPLOYEE_OT_NEED_APPROVAL",
        validationType: "employee_hours",
        message: `${withOt.length} employee(s) have ${totalOtH}h overtime (${names}). Approve overtime before Day Close.`,
        isBlocking: true,
      });
    } else {
      issues.push({
        id: nextIssueId(),
        businessPeriodId: context.businessPeriodId,
        validationCode: context.overtimeApproved
          ? "EMPLOYEE_OT_APPROVED"
          : "EMPLOYEE_OT_RECORDED",
        validationType: "employee_hours",
        message: context.overtimeApproved
          ? `Overtime approved: ${totalOtH}h across ${withOt.length} employee(s) (${names}).`
          : `Overtime recorded: ${totalOtH}h across ${withOt.length} employee(s) (${names}).`,
        isBlocking: false,
      });
    }
  }

  return issues;
}

export function countIncompleteEmployeeDays(
  summaries: EmployeeDayWorkSummary[],
): number {
  return summaries.filter((item) => item.dayStatus === EmployeeDayStatus.incomplete)
    .length;
}

export function countCompletedEmployeeDays(
  summaries: EmployeeDayWorkSummary[],
): number {
  return summaries.filter((item) => item.dayStatus === EmployeeDayStatus.completed)
    .length;
}

export function sumEmployeeOvertimeMinutes(
  summaries: EmployeeDayWorkSummary[],
): number {
  return summaries.reduce((sum, item) => sum + item.overtimeMinutes, 0);
}

export function countEmployeesWithOvertime(
  summaries: EmployeeDayWorkSummary[],
): number {
  return summaries.filter((item) => item.overtimeMinutes > 0).length;
}
