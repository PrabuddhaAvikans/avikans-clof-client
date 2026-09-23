import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ReportKpi } from "@/types/report";

export function kpi(
  id: string,
  label: string,
  value: number,
  type: ReportKpi["type"] = "number",
  description?: string,
): ReportKpi {
  return { id, label, value, type, description };
}

export function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return round2((part / whole) * 100);
}

export function sumBy<T>(items: T[], read: (item: T) => number): number {
  return round2(items.reduce((total, item) => total + (Number(read(item)) || 0), 0));
}

export function overdueDays(endDate: string | undefined, asOf = new Date()): number {
  if (!endDate) return 0;
  const due = parseISO(endDate);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(asOf, due));
}
