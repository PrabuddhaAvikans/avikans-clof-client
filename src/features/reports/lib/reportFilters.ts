import {
  endOfMonth,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import type { DateRange } from "@/components/ui/DateRangePicker";
import type { ReportColumn, ReportKpi, ReportRow } from "@/types/report";
import { getStatusLabel } from "@/types/status";

export const DATE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "quarter", label: "This quarter" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom dates" },
] as const;

export type DatePresetId = (typeof DATE_PRESETS)[number]["id"];

const SKIP_DIMENSION = /^(id|notes|details|summary|description|sku|email|phone|code|reference)/i;

function isoDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function rangeForPreset(preset: DatePresetId): DateRange {
  const today = new Date();
  const to = isoDay(today);
  switch (preset) {
    case "today":
      return { from: to, to };
    case "yesterday": {
      const day = isoDay(subDays(today, 1));
      return { from: day, to: day };
    }
    case "7d":
      return { from: isoDay(subDays(today, 6)), to };
    case "30d":
      return { from: isoDay(subDays(today, 29)), to };
    case "month":
      return { from: isoDay(startOfMonth(today)), to };
    case "lastMonth": {
      const previous = subMonths(today, 1);
      return { from: isoDay(startOfMonth(previous)), to: isoDay(endOfMonth(previous)) };
    }
    case "quarter":
      return { from: isoDay(startOfQuarter(today)), to };
    case "year":
      return { from: isoDay(startOfYear(today)), to };
    default:
      return {};
  }
}

export function inDateRange(value: unknown, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  if (value == null || value === "") return false;
  const day = String(value).slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

export function discreteFilterColumns(columns: ReportColumn[]): ReportColumn[] {
  return columns.filter((column) => column.type === "status").slice(0, 4);
}

export function uniqueColumnValues(rows: ReportRow[], key: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[key];
    if (value == null || value === "") continue;
    values.add(String(value));
  }
  return [...values].sort((a, b) =>
    getStatusLabel({}, a).localeCompare(getStatusLabel({}, b)),
  );
}

export function dimensionFilterColumns(
  columns: ReportColumn[],
  rows: ReportRow[],
): ReportColumn[] {
  return columns
    .filter((column) => column.type === "text" && !SKIP_DIMENSION.test(column.key))
    .filter((column) => {
      const count = uniqueColumnValues(rows, column.key).length;
      return count >= 2 && count <= 40;
    })
    .slice(0, 2);
}

export function amountFilterColumn(columns: ReportColumn[]): ReportColumn | undefined {
  return columns.find((column) => column.type === "currency");
}

export type AmountRange = {
  min?: string;
  max?: string;
};

export function filterReportRows(
  rows: ReportRow[],
  options: {
    search: string;
    dateKey?: string;
    range: DateRange;
    discrete: Record<string, string>;
    amountKey?: string;
    amount?: AmountRange;
  },
): ReportRow[] {
  const query = options.search.trim().toLowerCase();
  const min = options.amount?.min ? Number(options.amount.min) : null;
  const max = options.amount?.max ? Number(options.amount.max) : null;

  return rows.filter((row) => {
    if (options.dateKey && !inDateRange(row[options.dateKey], options.range)) {
      return false;
    }
    for (const [key, value] of Object.entries(options.discrete)) {
      if (!value) continue;
      if (String(row[key] ?? "") !== value) return false;
    }
    if (options.amountKey && ((min != null && !Number.isNaN(min)) || (max != null && !Number.isNaN(max)))) {
      const amount = Number(row[options.amountKey] ?? 0);
      if (min != null && !Number.isNaN(min) && amount < min) return false;
      if (max != null && !Number.isNaN(max) && amount > max) return false;
    }
    if (!query) return true;
    return Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query));
  });
}

export type FilterChip = {
  id: string;
  label: string;
};

export function activeFilterChips(options: {
  search: string;
  range: DateRange;
  preset: DatePresetId;
  discrete: Record<string, string>;
  columns: ReportColumn[];
  amountKey?: string;
  amount?: AmountRange;
  amountLabel?: string;
}): FilterChip[] {
  const chips: FilterChip[] = [];
  if (options.preset !== "all") {
    const presetLabel = DATE_PRESETS.find((item) => item.id === options.preset)?.label;
    chips.push({
      id: "period",
      label: presetLabel ?? `Dates ${options.range.from || "…"} – ${options.range.to || "…"}`,
    });
  } else if (options.range.from || options.range.to) {
    chips.push({
      id: "period",
      label: `${options.range.from || "…"} to ${options.range.to || "…"}`,
    });
  }
  for (const [key, value] of Object.entries(options.discrete)) {
    if (!value) continue;
    const label = options.columns.find((column) => column.key === key)?.label ?? key;
    chips.push({ id: `discrete:${key}`, label: `${label}: ${getStatusLabel({}, value)}` });
  }
  if (options.amountKey && (options.amount?.min || options.amount?.max)) {
    const name = options.amountLabel ?? "Amount";
    chips.push({
      id: "amount",
      label: `${name} ${options.amount?.min || "0"} – ${options.amount?.max || "∞"}`,
    });
  }
  if (options.search.trim()) {
    chips.push({ id: "search", label: `Search: ${options.search.trim()}` });
  }
  return chips;
}

export function describeActiveFilters(
  options: Parameters<typeof activeFilterChips>[0],
): string {
  const chips = activeFilterChips(options);
  return chips.map((chip) => chip.label).join(" · ") || "No filters";
}

export function hasActiveFilters(
  search: string,
  range: DateRange,
  discrete: Record<string, string>,
  amount?: AmountRange,
): boolean {
  if (search.trim()) return true;
  if (range.from || range.to) return true;
  if (amount?.min || amount?.max) return true;
  return Object.values(discrete).some(Boolean);
}

export function summarizeFilteredRows(
  columns: ReportColumn[],
  rows: ReportRow[],
): ReportKpi[] {
  const kpis: ReportKpi[] = [];
  for (const column of columns.filter((item) => item.type === "currency").slice(0, 2)) {
    kpis.push({
      id: `sum-${column.key}`,
      label: column.label,
      value: rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0),
      type: "currency",
      description: "From matching rows",
    });
  }
  return kpis;
}
