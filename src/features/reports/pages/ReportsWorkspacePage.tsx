import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileDown, FileSpreadsheet, RefreshCw } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { getNavIcon } from "@/components/layout/icon-map";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { ReportFilterBar } from "@/features/reports/components/ReportFilterBar";
import {
  REPORT_CATEGORY_LABELS,
  REPORT_DEFINITIONS,
  getReportDefinition,
  getReportsByCategory,
} from "@/features/reports/catalog";
import { useReport } from "@/features/reports/hooks/useReport";
import { downloadReportCsv, formatReportCell } from "@/features/reports/lib/exportCsv";
import { downloadReportPdf } from "@/features/reports/lib/exportPdf";
import {
  amountFilterColumn,
  describeActiveFilters,
  dimensionFilterColumns,
  discreteFilterColumns,
  filterReportRows,
  hasActiveFilters,
  rangeForPreset,
  summarizeFilteredRows,
  type AmountRange,
  type DatePresetId,
} from "@/features/reports/lib/reportFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { useBreakpoints } from "@/hooks/useMediaQuery";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/ui/DateRangePicker";
import type { ReportColumn, ReportId, ReportKpi, ReportRow } from "@/types/report";

const LAST_REPORT_KEY = "ats.lastReportId";
const EMPTY_ROWS: ReportRow[] = [];

function buildColumns(columns: ReportColumn[]): ColumnDef<ReportRow>[] {
  return columns.map((column) => ({
    accessorKey: column.key,
    header: column.label,
    cell: ({ row }) => {
      const value = row.original[column.key];
      if (column.type === "status" && value != null && value !== "") {
        return <MappedStatusBadge statusMap={{}} value={String(value)} dot />;
      }
      const formatted = formatReportCell(column, value);
      return (
        <span className={column.align === "right" ? "block text-right tabular-nums" : undefined}>
          {formatted || "-"}
        </span>
      );
    },
  }));
}

export function ReportsWorkspacePage() {
  const { reportId = "" } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { isDesktop } = useBreakpoints();
  const settings = useSystemSettings();
  const canExport = hasPermission("reports:export");

  const allowed = useMemo(
    () => REPORT_DEFINITIONS.filter((report) => hasPermission(report.permission)),
    [hasPermission],
  );

  const definition = getReportDefinition(reportId);
  const canViewSource = definition ? hasPermission(definition.permission) : false;
  const selectedId = canViewSource ? definition?.id : undefined;

  const { data, isLoading, error, refetch } = useReport(
    (selectedId ?? "quotation-register") as ReportId,
    Boolean(selectedId),
  );

  const [listSearch, setListSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [rowSearch, setRowSearch] = useState("");
  const [preset, setPreset] = useState<DatePresetId>("all");
  const [range, setRange] = useState<DateRange>({});
  const [discrete, setDiscrete] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<AmountRange>({});
  const listRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const resultsBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId) {
      try {
        localStorage.setItem(LAST_REPORT_KEY, selectedId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!allowed.length) return;
    let last = "";
    try {
      last = localStorage.getItem(LAST_REPORT_KEY) ?? "";
    } catch {
      last = "";
    }
    const target = allowed.some((report) => report.id === last) ? last : allowed[0].id;
    navigate(ROUTES.reports.view(target), { replace: true });
  }, [allowed, navigate, selectedId]);

  useEffect(() => {
    setRowSearch("");
    setDiscrete({});
    setAmount({});
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const container = listRef.current;
    const item = container?.querySelector<HTMLElement>(`[data-report-id="${selectedId}"]`);
    if (container && item) {
      const pane = container.getBoundingClientRect();
      const row = item.getBoundingClientRect();
      if (row.top < pane.top) {
        container.scrollTop -= pane.top - row.top + 8;
      } else if (row.bottom > pane.bottom) {
        container.scrollTop += row.bottom - pane.bottom + 8;
      }
    }
    resultsBodyRef.current?.scrollTo({ top: 0 });
    if (!isDesktop) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isDesktop, selectedId]);

  const visibleReports = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return allowed.filter((report) => {
      if (category !== "all" && report.category !== category) return false;
      if (!query) return true;
      return (
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query)
      );
    });
  }, [allowed, category, listSearch]);

  const groups = useMemo(() => getReportsByCategory(visibleReports), [visibleReports]);
  const categoryOptions = useMemo(
    () => getReportsByCategory(allowed).map((group) => group.category),
    [allowed],
  );

  const sourceRows = data?.rows ?? EMPTY_ROWS;
  const statusColumns = useMemo(
    () => discreteFilterColumns(definition?.columns ?? []),
    [definition?.columns],
  );
  const dimensionColumns = useMemo(
    () => dimensionFilterColumns(definition?.columns ?? [], data?.rows ?? EMPTY_ROWS),
    [definition?.columns, data?.rows],
  );
  const amountColumn = useMemo(
    () => amountFilterColumn(definition?.columns ?? []),
    [definition?.columns],
  );
  const dateColumnLabel = definition?.columns.find((column) => column.key === definition.dateKey)?.label;

  const filteredRows = useMemo(
    () =>
      filterReportRows(sourceRows, {
        search: rowSearch,
        dateKey: definition?.dateKey,
        range,
        discrete,
        amountKey: amountColumn?.key,
        amount,
      }),
    [amount, amountColumn?.key, definition?.dateKey, discrete, range, rowSearch, sourceRows],
  );

  const columns = useMemo(
    () => buildColumns(definition?.columns ?? data?.columns ?? []),
    [data?.columns, definition?.columns],
  );

  const filtersOn = hasActiveFilters(rowSearch, range, discrete, amount);
  const filterSummary = describeActiveFilters({
    search: rowSearch,
    range,
    preset,
    discrete,
    columns: definition?.columns ?? [],
    amountKey: amountColumn?.key,
    amount,
    amountLabel: amountColumn?.label,
  });
  const displayKpis = useMemo(() => {
    const matching: ReportKpi = {
      id: "matching-rows",
      label: "Matching rows",
      value: filteredRows.length,
      type: "number",
      description: filtersOn
        ? `of ${formatNumber(data?.rows.length ?? 0)} in this report`
        : "All rows in this report",
    };
    const totals = summarizeFilteredRows(definition?.columns ?? [], filteredRows);
    if (filtersOn) {
      return [matching, ...totals].slice(0, 4);
    }
    return [matching, ...(data?.kpis ?? []).slice(0, 3)];
  }, [data?.kpis, data?.rows.length, definition?.columns, filteredRows, filtersOn]);

  const applyPreset = (next: DatePresetId) => {
    setPreset(next);
    if (next === "custom") return;
    setRange(rangeForPreset(next));
  };

  const updateRange = (next: DateRange) => {
    setRange(next);
    setPreset(next.from || next.to ? "custom" : "all");
  };

  const resetFilters = () => {
    setRowSearch("");
    setPreset("all");
    setRange({});
    setDiscrete({});
    setAmount({});
  };

  const clearChip = (id: string) => {
    if (id === "search") setRowSearch("");
    if (id === "period") {
      setPreset("all");
      setRange({});
    }
    if (id === "amount") setAmount({});
    if (id.startsWith("discrete:")) {
      const key = id.slice("discrete:".length);
      setDiscrete((current) => ({ ...current, [key]: "" }));
    }
  };

  const exportDisabled = !filteredRows.length || !definition;

  const handleExportCsv = () => {
    if (!definition) return;
    downloadReportCsv(definition.id, definition.columns, filteredRows);
    toast.success("CSV downloaded");
  };

  const handleExportPdf = () => {
    if (!definition || !data) return;
    downloadReportPdf({
      fileStem: definition.id,
      title: definition.title,
      companyName: settings.companyName,
      generatedAt: data.generatedAt,
      filters: filterSummary,
      kpis: displayKpis,
      columns: definition.columns,
      rows: filteredRows,
    });
    toast.success("PDF downloaded");
  };

  const selectReport = (id: string) => {
    if (id === selectedId) return;
    navigate(ROUTES.reports.view(id));
  };

  return (
    <PageContainer className="flex h-full min-h-0 flex-col overflow-hidden py-3">
      <PageHeader
        className="mb-3 shrink-0"
        title="Reports"
        description="Choose a report, filter it live, then export the matching rows as PDF or CSV."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => refetch()}
              disabled={!selectedId}
            >
              Refresh
            </Button>
            {canExport && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                  disabled={exportDisabled}
                  onClick={handleExportCsv}
                >
                  CSV
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileDown className="h-4 w-4" />}
                  disabled={exportDisabled}
                  onClick={handleExportPdf}
                >
                  PDF
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:grid lg:grid-cols-12">
        <aside className="flex shrink-0 flex-col overflow-hidden lg:col-span-3 lg:h-full lg:min-h-0">
          <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs lg:h-full">
            <div className="shrink-0 space-y-2 border-b border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Report library</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {visibleReports.length} of {allowed.length}
                </p>
              </div>
              <SearchBar
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                onClear={() => setListSearch("")}
                placeholder="Find a report..."
              />
              <Select
                label="Area"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                options={[
                  { value: "all", label: "All areas" },
                  ...categoryOptions.map((id) => ({
                    value: id,
                    label: REPORT_CATEGORY_LABELS[id],
                  })),
                ]}
              />
              {!isDesktop && (
                <Select
                  label="Report"
                  value={selectedId ?? ""}
                  onChange={(event) => {
                    if (event.target.value) selectReport(event.target.value);
                  }}
                  options={visibleReports.map((report) => ({
                    value: report.id,
                    label: report.title,
                  }))}
                  placeholder="Choose report"
                />
              )}
            </div>
            <nav
              ref={listRef}
              className="hidden min-h-0 overflow-y-auto overscroll-contain p-2 lg:flex lg:flex-1 lg:flex-col"
              aria-label="Report list"
            >
              {groups.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No reports match that search.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.category} className="mb-2">
                    <p className="sticky top-0 z-10 bg-card px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                      <span className="ml-1 font-normal tabular-nums">({group.reports.length})</span>
                    </p>
                    <div className="space-y-0.5">
                      {group.reports.map((report) => {
                        const Icon = getNavIcon(report.icon);
                        const active = report.id === selectedId;
                        return (
                          <button
                            key={report.id}
                            type="button"
                            data-report-id={report.id}
                            title={report.description}
                            onClick={() => selectReport(report.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-xs border-l-2 px-2 py-1.5 text-left transition-colors",
                              active
                                ? "border-l-foreground bg-muted text-foreground"
                                : "border-l-transparent hover:bg-muted/60",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 truncate text-[13px] font-medium leading-5">
                              {report.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </div>
        </aside>

        <section
          ref={resultsRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden lg:col-span-9 lg:h-full"
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            {!definition || !canViewSource ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
                <p className="text-sm font-medium text-foreground">Choose a report to start</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {allowed.length
                    ? "Select something from the library. Filters and export appear here."
                    : "Your role does not include any reports yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-border px-4 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {REPORT_CATEGORY_LABELS[definition.category]}
                      </p>
                      <h2 className="text-sm font-semibold text-foreground">{definition.title}</h2>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {definition.description}
                      </p>
                    </div>
                    {/* {data?.generatedAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Updated {formatDateTime(data.generatedAt)}
                      </p>
                    )} */}
                  </div>
                </div>
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <ReportFilterBar
                    search={rowSearch}
                    onSearch={setRowSearch}
                    dateKey={definition.dateKey}
                    dateLabel={dateColumnLabel}
                    preset={preset}
                    onPreset={applyPreset}
                    range={range}
                    onRange={updateRange}
                    rows={sourceRows}
                    columns={definition.columns}
                    statusColumns={statusColumns}
                    dimensionColumns={dimensionColumns}
                    amountColumn={amountColumn}
                    discrete={discrete}
                    onDiscrete={(key, value) =>
                      setDiscrete((current) => ({ ...current, [key]: value }))
                    }
                    amount={amount}
                    onAmount={setAmount}
                    onReset={resetFilters}
                    onClearChip={clearChip}
                  />
                </div>

                <div
                  ref={resultsBodyRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
                >
                  <PageContent
                    isLoading={isLoading}
                    error={error?.message}
                    onRetry={() => refetch()}
                    loadingVariant="table"
                  >
                    {data && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {filtersOn
                            ? `${filteredRows.length} rows match your filters. CSV and PDF export only these rows.`
                            : `${filteredRows.length} rows. Use filters above to narrow the export.`}
                        </p>
                        {filtersOn && filteredRows.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nothing matched. Try a wider period, another status, or{" "}
                            <button type="button" className="font-medium text-foreground underline" onClick={resetFilters}>
                              clear filters
                            </button>
                            .
                          </p>
                        )}
                        <DataTable
                          data={filteredRows}
                          columns={columns}
                          pageSize={20}
                          density="compact"
                          emptyMessage="No rows for the current filters."
                          getRowId={(row) => String(row.id)}
                        />
                      </>
                    )}
                  </PageContent>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
