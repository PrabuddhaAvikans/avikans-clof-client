import { downloadBlob, reportExportStamp } from "@/features/reports/lib/downloadFile";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { getStatusLabel } from "@/types/status";
import type { ReportColumn, ReportRow } from "@/types/report";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function formatReportCell(column: ReportColumn, value: unknown): string {
  if (value == null || value === "") return "";
  switch (column.type) {
    case "currency":
      return formatCurrency(Number(value) || 0);
    case "number":
      return formatNumber(Number(value) || 0);
    case "percent":
      return formatPercent(Number(value) || 0);
    case "date":
      return formatDate(String(value));
    case "datetime":
      return formatDateTime(String(value));
    case "status":
      return getStatusLabel({}, String(value));
    default:
      return String(value);
  }
}

export function downloadReportCsv(
  fileStem: string,
  columns: ReportColumn[],
  rows: ReportRow[],
): void {
  const header = columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvCell(formatReportCell(column, row[column.key]))).join(","),
  );
  const csv = [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${fileStem}-${reportExportStamp()}.csv`);
}
