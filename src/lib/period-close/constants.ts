import { WorkerSessionCloseRule } from "@/types/period-close";
import type { PeriodCloseSettings } from "@/types/period-close";
import {
  DEFAULT_DOUBLE_OVERTIME_AFTER_MINUTES,
  REQUIRED_DAILY_WORK_MINUTES,
} from "@/lib/employee-work";

/** Default branch until multi-branch closing is configured. */
export const DEFAULT_BRANCH_ID = "branch-main";

export const DEFAULT_PERIOD_CLOSE_SETTINGS: PeriodCloseSettings = {
  branchId: DEFAULT_BRANCH_ID,
  workerSessionCloseRule: WorkerSessionCloseRule.pause_and_checkpoint,
  allowNegativeStock: false,
  requireAllDaysClosedForMonthlyClose: true,
  fiscalYearStartMonth: 1,
  requiredDailyWorkMinutes: REQUIRED_DAILY_WORK_MINUTES,
  allowIncompleteEmployeeHoursException: false,
  countPauseAsWorked: false,
  doubleOvertimeAfterMinutes: DEFAULT_DOUBLE_OVERTIME_AFTER_MINUTES,
  requireOvertimeApproval: true,
};

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseBusinessDate(businessDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = businessDate.split("-").map(Number);
  return { year, month, day };
}

export function toBusinessDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addBusinessDays(businessDate: string, days: number): string {
  const date = new Date(`${businessDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toBusinessDate(date);
}

export function nextCalendarMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  if (month >= 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function businessDatesInMonth(year: number, month: number): string[] {
  const count = daysInMonth(year, month);
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(month).padStart(2, "0")}-${day}`;
  });
}
