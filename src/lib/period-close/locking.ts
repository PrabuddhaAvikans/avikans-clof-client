import { PeriodStatus } from "@/types/period-close";
import type {
  BusinessPeriod,
  MonthlyPeriod,
  PeriodStatusValue,
} from "@/types/period-close";
import { monthKey, parseBusinessDate } from "@/lib/period-close/constants";

export type PeriodLockError = {
  code: "PERIOD_LOCKED" | "MONTH_LOCKED" | "PERIOD_CLOSING";
  message: string;
  businessDate?: string;
  year?: number;
  month?: number;
};

const LOCKED_STATUSES: PeriodStatusValue[] = [PeriodStatus.closed, PeriodStatus.closing];

export function isPeriodLockedStatus(status: PeriodStatusValue): boolean {
  return LOCKED_STATUSES.includes(status);
}

export function findBusinessPeriod(
  periods: BusinessPeriod[],
  branchId: string,
  businessDate: string,
): BusinessPeriod | undefined {
  return periods.find(
    (period) => period.branchId === branchId && period.businessDate === businessDate,
  );
}

export function findMonthlyPeriod(
  periods: MonthlyPeriod[],
  branchId: string,
  year: number,
  month: number,
): MonthlyPeriod | undefined {
  return periods.find(
    (period) =>
      period.branchId === branchId && period.year === year && period.month === month,
  );
}

/**
 * Returns a lock error when a business date cannot accept new/changed
 * dated transactions. Open and reopened periods remain writable.
 */
export function getBusinessDateLockError(options: {
  branchId: string;
  businessDate: string;
  dayPeriods: BusinessPeriod[];
  monthlyPeriods: MonthlyPeriod[];
}): PeriodLockError | null {
  const { branchId, businessDate, dayPeriods, monthlyPeriods } = options;
  const { year, month } = parseBusinessDate(businessDate);

  const monthly = findMonthlyPeriod(monthlyPeriods, branchId, year, month);
  if (monthly && isPeriodLockedStatus(monthly.status)) {
    return {
      code: "MONTH_LOCKED",
      message: `${monthKey(year, month)} has already been closed. Please use the current open accounting period or request an authorized period reopen.`,
      businessDate,
      year,
      month,
    };
  }

  const day = findBusinessPeriod(dayPeriods, branchId, businessDate);
  if (!day) return null;

  if (day.status === PeriodStatus.closing) {
    return {
      code: "PERIOD_CLOSING",
      message: `Business date ${businessDate} is currently being closed. Wait for the close to finish or contact an authorized user.`,
      businessDate,
    };
  }

  if (day.status === PeriodStatus.closed) {
    return {
      code: "PERIOD_LOCKED",
      message: `Business date ${businessDate} is closed. Post an adjustment in the current open period, or request an authorized reopen.`,
      businessDate,
    };
  }

  return null;
}

export function assertBusinessDateWritable(options: {
  branchId: string;
  businessDate: string;
  dayPeriods: BusinessPeriod[];
  monthlyPeriods: MonthlyPeriod[];
}): void {
  const error = getBusinessDateLockError(options);
  if (error) throw error;
}

export function isBusinessDateWritable(options: {
  branchId: string;
  businessDate: string;
  dayPeriods: BusinessPeriod[];
  monthlyPeriods: MonthlyPeriod[];
}): boolean {
  return getBusinessDateLockError(options) === null;
}
