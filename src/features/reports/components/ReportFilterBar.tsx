import { type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import {
  DATE_PRESETS,
  activeFilterChips,
  uniqueColumnValues,
  type AmountRange,
  type DatePresetId,
} from "@/features/reports/lib/reportFilters";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/ui/DateRangePicker";
import type { ReportColumn, ReportRow } from "@/types/report";
import { getStatusLabel } from "@/types/status";

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-foreground">{children}</p>;
}

export type ReportFilterBarProps = {
  search: string;
  onSearch: (value: string) => void;
  dateKey?: string;
  dateLabel?: string;
  preset: DatePresetId;
  onPreset: (preset: DatePresetId) => void;
  range: DateRange;
  onRange: (range: DateRange) => void;
  rows: ReportRow[];
  columns: ReportColumn[];
  statusColumns: ReportColumn[];
  dimensionColumns: ReportColumn[];
  amountColumn?: ReportColumn;
  discrete: Record<string, string>;
  onDiscrete: (key: string, value: string) => void;
  amount: AmountRange;
  onAmount: (amount: AmountRange) => void;
  onReset: () => void;
  onClearChip: (id: string) => void;
};

export function ReportFilterBar({
  search,
  onSearch,
  dateKey,
  dateLabel = "Date",
  preset,
  onPreset,
  range,
  onRange,
  rows,
  columns,
  statusColumns,
  dimensionColumns,
  amountColumn,
  discrete,
  onDiscrete,
  amount,
  onAmount,
  onReset,
  onClearChip,
}: ReportFilterBarProps) {
  const chips = activeFilterChips({
    search,
    range,
    preset,
    discrete,
    columns,
    amountKey: amountColumn?.key,
    amount,
    amountLabel: amountColumn?.label,
  });

  const [primaryStatus, ...extraStatus] = statusColumns;
  const primaryValues = primaryStatus ? uniqueColumnValues(rows, primaryStatus.key) : [];
  const showPrimaryChips = primaryStatus && primaryValues.length > 0 && primaryValues.length <= 8;
  const statusSelects = showPrimaryChips ? extraStatus : statusColumns;
  const showDates = Boolean(dateKey);
  const showAdvanced =
    dimensionColumns.length > 0 || Boolean(amountColumn) || statusSelects.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        Filters
        {chips.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {chips.length} active
          </span>
        )}
        <span className="font-normal text-muted-foreground">
          Results update as you type or tap. No apply step.
        </span>
      </div>

      <SearchBar
        label="Search this report"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        onClear={() => onSearch("")}
        placeholder="Names, numbers, status, people..."
      />

      {showDates && (
        <div className="space-y-1.5">
          <FieldLabel>Period</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((item) => (
              <Chip key={item.id} active={preset === item.id} onClick={() => onPreset(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <DatePicker
                label={`${dateLabel} from`}
                value={range.from ?? ""}
                max={range.to}
                onChange={(event) => onRange({ ...range, from: event.target.value || undefined })}
              />
              <DatePicker
                label="To"
                value={range.to ?? ""}
                min={range.from}
                onChange={(event) => onRange({ ...range, to: event.target.value || undefined })}
              />
            </div>
          ) : (range.from || range.to) ? (
            <p className="text-[11px] text-muted-foreground">
              {range.from ?? "…"} to {range.to ?? "today"}
            </p>
          ) : null}
        </div>
      )}

      {showPrimaryChips && primaryStatus && (
        <div className="space-y-1.5">
          <FieldLabel>{primaryStatus.label}</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!discrete[primaryStatus.key]} onClick={() => onDiscrete(primaryStatus.key, "")}>
              All
            </Chip>
            {primaryValues.map((value) => (
              <Chip
                key={value}
                active={discrete[primaryStatus.key] === value}
                onClick={() =>
                  onDiscrete(
                    primaryStatus.key,
                    discrete[primaryStatus.key] === value ? "" : value,
                  )
                }
              >
                {getStatusLabel({}, value)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="space-y-1.5">
          <FieldLabel>Advanced</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {statusSelects.map((column) => {
              const values = uniqueColumnValues(rows, column.key);
              if (values.length === 0) return null;
              return (
                <Select
                  key={column.key}
                  label={column.label}
                  value={discrete[column.key] ?? ""}
                  onChange={(event) => onDiscrete(column.key, event.target.value)}
                  options={[
                    { value: "", label: `All ${column.label.toLowerCase()}` },
                    ...values.map((value) => ({
                      value,
                      label: getStatusLabel({}, value),
                    })),
                  ]}
                />
              );
            })}
            {dimensionColumns.map((column) => (
              <Select
                key={column.key}
                label={column.label}
                value={discrete[column.key] ?? ""}
                onChange={(event) => onDiscrete(column.key, event.target.value)}
                options={[
                  { value: "", label: `All ${column.label.toLowerCase()}` },
                  ...uniqueColumnValues(rows, column.key).map((value) => ({
                    value,
                    label: value,
                  })),
                ]}
              />
            ))}
            {amountColumn && (
              <>
                <Input
                  type="number"
                  label={`${amountColumn.label} min`}
                  value={amount.min ?? ""}
                  onChange={(event) => onAmount({ ...amount, min: event.target.value })}
                  placeholder="0"
                />
                <Input
                  type="number"
                  label={`${amountColumn.label} max`}
                  value={amount.max ?? ""}
                  onChange={(event) => onAmount({ ...amount, max: event.target.value })}
                  placeholder="Any"
                />
              </>
            )}
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onClearChip(chip.id)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 text-[11px] text-foreground hover:bg-muted"
            >
              {chip.label}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
