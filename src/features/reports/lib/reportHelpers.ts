import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ReportKpi, ReportRow } from "@/types/report";

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

export function daysPastDue(dueDate: string | undefined, asOf = new Date()): number {
  if (!dueDate) return 0;
  const due = parseISO(dueDate);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(asOf, due));
}

export function overdueDays(endDate: string | undefined, asOf = new Date()): number {
  if (!endDate) return 0;
  const due = parseISO(endDate);
  if (Number.isNaN(due.getTime())) return 0;
  return Math.max(0, differenceInCalendarDays(asOf, due));
}

export function agingBucket(days: number): string {
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  return "90+ days";
}

export function groupedRows<T>(
  items: T[],
  keyOf: (item: T) => string,
  build: (key: string, group: T[]) => ReportRow,
): ReportRow[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item) || "unknown";
    const current = groups.get(key);
    if (current) current.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([key, group]) => build(key, group));
}
