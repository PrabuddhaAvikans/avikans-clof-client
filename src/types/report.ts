import type { Permission } from "@/app/config/permissions";

export const REPORT_CATEGORIES = [
  "sales",
  "operations",
  "production",
  "inventory",
  "finance",
  "delivery",
  "customers",
  "products",
  "admin",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_IDS = [
  "quotation-register",
  "sales-order-register",
  "costing-register",
  "estimation-materials",
  "production-jobs",
  "quality-inspections",
  "ready-to-ship",
  "stock-valuation",
  "stock-movements",
  "reprocessing-batches",
  "low-stock",
  "invoice-register",
  "credit-notes",
  "delivery-register",
  "customer-directory",
  "product-catalog",
  "audit-activity",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export const REPORT_SOURCE_KEYS = [
  "quotations",
  "salesOrders",
  "jobs",
  "inventory",
  "movements",
  "customers",
  "products",
  "deliveries",
  "costing",
  "reprocessing",
  "invoices",
  "creditNotes",
  "auditLogs",
] as const;

export type ReportSourceKey = (typeof REPORT_SOURCE_KEYS)[number];

export type ReportValueType =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "status";

export type ReportColumn = {
  key: string;
  label: string;
  type: ReportValueType;
  align?: "left" | "right";
};

export type ReportRow = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type ReportKpi = {
  id: string;
  label: string;
  value: number;
  type: "number" | "currency" | "percent";
  description?: string;
};

export type ReportDefinition = {
  id: ReportId;
  title: string;
  description: string;
  category: ReportCategory;
  icon: string;
  permission: Permission;
  sources: ReportSourceKey[];
  columns: ReportColumn[];
  dateKey?: string;
};

export type ReportDataset = {
  reportId: ReportId;
  title: string;
  generatedAt: string;
  kpis: ReportKpi[];
  rows: ReportRow[];
  columns: ReportColumn[];
};
