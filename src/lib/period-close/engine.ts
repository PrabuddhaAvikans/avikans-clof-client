import { PeriodStatus, PeriodType } from "@/types/period-close";
import type {
  BusinessPeriod,
  MonthlyPeriod,
  PeriodActor,
  PeriodAuditLog,
  PeriodStatusValue,
} from "@/types/period-close";
import {
  addBusinessDays,
  nextCalendarMonth,
} from "@/lib/period-close/constants";

export function canTransitionPeriodStatus(
  from: PeriodStatusValue,
  to: PeriodStatusValue,
): boolean {
  const allowed: Record<PeriodStatusValue, PeriodStatusValue[]> = {
    open: ["closing"],
    closing: ["closed", "open"],
    closed: ["reopened"],
    reopened: ["closing"],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function createDayPeriod(options: {
  id: string;
  branchId: string;
  businessDate: string;
  actor: PeriodActor;
  openedAt: string;
}): BusinessPeriod {
  return {
    id: options.id,
    branchId: options.branchId,
    businessDate: options.businessDate,
    status: PeriodStatus.open,
    openedAt: options.openedAt,
    openedBy: options.actor.userId,
    openedByName: options.actor.userName,
    closeCount: 0,
  };
}

export function createMonthlyPeriod(options: {
  id: string;
  branchId: string;
  year: number;
  month: number;
  actor: PeriodActor;
  startedAt: string;
}): MonthlyPeriod {
  return {
    id: options.id,
    branchId: options.branchId,
    year: options.year,
    month: options.month,
    status: PeriodStatus.open,
    startedAt: options.startedAt,
    startedBy: options.actor.userId,
    startedByName: options.actor.userName,
    closeCount: 0,
  };
}

export function markPeriodClosing<T extends { status: PeriodStatusValue }>(
  period: T,
): T {
  if (
    period.status !== PeriodStatus.open &&
    period.status !== PeriodStatus.reopened
  ) {
    throw {
      code: "INVALID_STATE",
      message: `Period cannot enter closing from status "${period.status}".`,
    };
  }
  return { ...period, status: PeriodStatus.closing };
}

export function markDayClosed(
  period: BusinessPeriod,
  actor: PeriodActor,
  closedAt: string,
): BusinessPeriod {
  if (period.status !== PeriodStatus.closing) {
    throw {
      code: "INVALID_STATE",
      message: "Day must be in Closing status before it can be closed.",
    };
  }

  const originalClosedAt = period.originalClosedAt ?? closedAt;
  const originalClosedBy = period.originalClosedBy ?? actor.userId;
  const originalClosedByName = period.originalClosedByName ?? actor.userName;

  return {
    ...period,
    status: PeriodStatus.closed,
    closedAt,
    closedBy: actor.userId,
    closedByName: actor.userName,
    originalClosedAt,
    originalClosedBy,
    originalClosedByName,
    closeCount: period.closeCount + 1,
    reopenedAt: undefined,
    reopenedBy: undefined,
    reopenedByName: undefined,
    reopenReason: undefined,
  };
}

export function markMonthClosed(
  period: MonthlyPeriod,
  actor: PeriodActor,
  closedAt: string,
): MonthlyPeriod {
  if (period.status !== PeriodStatus.closing) {
    throw {
      code: "INVALID_STATE",
      message: "Month must be in Closing status before it can be closed.",
    };
  }

  return {
    ...period,
    status: PeriodStatus.closed,
    closedAt,
    closedBy: actor.userId,
    closedByName: actor.userName,
    originalClosedAt: period.originalClosedAt ?? closedAt,
    originalClosedBy: period.originalClosedBy ?? actor.userId,
    originalClosedByName: period.originalClosedByName ?? actor.userName,
    closeCount: period.closeCount + 1,
    reopenedAt: undefined,
    reopenedBy: undefined,
    reopenedByName: undefined,
    reopenReason: undefined,
  };
}

export function markDayReopened(
  period: BusinessPeriod,
  actor: PeriodActor,
  reopenedAt: string,
  reason: string,
): BusinessPeriod {
  if (period.status !== PeriodStatus.closed) {
    throw {
      code: "INVALID_STATE",
      message: "Only a closed day can be reopened.",
    };
  }
  if (!reason.trim()) {
    throw {
      code: "VALIDATION_ERROR",
      message: "A reopen reason is required.",
    };
  }

  return {
    ...period,
    status: PeriodStatus.reopened,
    reopenedAt,
    reopenedBy: actor.userId,
    reopenedByName: actor.userName,
    reopenReason: reason.trim(),
  };
}

export function markMonthReopened(
  period: MonthlyPeriod,
  actor: PeriodActor,
  reopenedAt: string,
  reason: string,
): MonthlyPeriod {
  if (period.status !== PeriodStatus.closed) {
    throw {
      code: "INVALID_STATE",
      message: "Only a closed month can be reopened.",
    };
  }
  if (!reason.trim()) {
    throw {
      code: "VALIDATION_ERROR",
      message: "A reopen reason is required.",
    };
  }

  return {
    ...period,
    status: PeriodStatus.reopened,
    reopenedAt,
    reopenedBy: actor.userId,
    reopenedByName: actor.userName,
    reopenReason: reason.trim(),
  };
}

export function nextOpenDayPeriod(
  closed: BusinessPeriod,
  actor: PeriodActor,
  openedAt: string,
  idFactory: () => string,
): BusinessPeriod {
  return createDayPeriod({
    id: idFactory(),
    branchId: closed.branchId,
    businessDate: addBusinessDays(closed.businessDate, 1),
    actor,
    openedAt,
  });
}

export function nextOpenMonthlyPeriod(
  closed: MonthlyPeriod,
  actor: PeriodActor,
  startedAt: string,
  idFactory: () => string,
): MonthlyPeriod {
  const next = nextCalendarMonth(closed.year, closed.month);
  return createMonthlyPeriod({
    id: idFactory(),
    branchId: closed.branchId,
    year: next.year,
    month: next.month,
    actor,
    startedAt,
  });
}

export function createPeriodAuditEntry(options: {
  id: string;
  periodType: typeof PeriodType.day | typeof PeriodType.month;
  periodId: string;
  action: PeriodAuditLog["action"];
  actor: PeriodActor;
  performedAt: string;
  reason?: string;
  details?: Record<string, unknown>;
}): PeriodAuditLog {
  return {
    id: options.id,
    periodType: options.periodType,
    periodId: options.periodId,
    action: options.action,
    userId: options.actor.userId,
    userName: options.actor.userName,
    reason: options.reason,
    details: options.details,
    performedAt: options.performedAt,
  };
}

export function findActiveOpenDay(
  periods: BusinessPeriod[],
  branchId: string,
): BusinessPeriod | undefined {
  return periods.find(
    (period) =>
      period.branchId === branchId &&
      (period.status === PeriodStatus.open || period.status === PeriodStatus.reopened),
  );
}

export function findActiveOpenMonth(
  periods: MonthlyPeriod[],
  branchId: string,
): MonthlyPeriod | undefined {
  return periods.find(
    (period) =>
      period.branchId === branchId &&
      (period.status === PeriodStatus.open || period.status === PeriodStatus.reopened),
  );
}
