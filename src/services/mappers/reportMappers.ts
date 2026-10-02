import type {
  ReportColumn,
  ReportDataset,
  ReportId,
  ReportKpi,
  ReportRow,
  ReportValueType,
} from "@/types/report";

export function mapColumn(raw: Record<string, unknown>): ReportColumn {
  return {
    key: String(raw.key ?? ""),
    label: String(raw.label ?? ""),
    type: (raw.type as ReportValueType) ?? "text",
    align: raw.align as ReportColumn["align"] | undefined,
  };
}

export function mapKpi(raw: Record<string, unknown>): ReportKpi {
  return {
    id: String(raw.id),
    label: String(raw.label ?? ""),
    value: Number(raw.value ?? 0),
    type: (raw.type as ReportKpi["type"]) ?? "number",
    description: raw.description as string | undefined,
  };
}

export function mapRow(raw: Record<string, unknown>): ReportRow {
  const row: ReportRow = { id: String(raw.id ?? "") };
  for (const [key, value] of Object.entries(raw)) {
    if (key === "id") continue;
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      row[key] = value as string | number | boolean | null | undefined;
    } else {
      row[key] = String(value);
    }
  }
  return row;
}

export function mapDataset(raw: Record<string, unknown>): ReportDataset {
  return {
    reportId: String(raw.reportId) as ReportId,
    title: String(raw.title ?? ""),
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    kpis: ((raw.kpis as unknown[]) ?? []).map((item) => mapKpi(item as Record<string, unknown>)),
    rows: ((raw.rows as unknown[]) ?? []).map((item) => mapRow(item as Record<string, unknown>)),
    columns: ((raw.columns as unknown[]) ?? []).map((item) =>
      mapColumn(item as Record<string, unknown>),
    ),
  };
}
