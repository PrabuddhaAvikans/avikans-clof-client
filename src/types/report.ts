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
  "quotation-conversion",
  "quotation-follow-up",
  "sales-order-register",
  "sales-order-fulfillment",
  "sales-by-customer",
  "sales-by-product",
  "open-sales-orders",
  "costing-register",
  "costing-margin",
  "estimation-materials",
  "coating-costs",
  "customization-approvals",
  "production-jobs",
  "production-wip",
  "production-cost-variance",
  "labor-hours-cost",
  "task-performance",
  "quality-inspections",
  "rework-register",
  "scrap-waste",
  "material-requirements",
  "ready-to-ship",
  "stock-valuation",
  "low-stock",
  "stock-movements",
  "stock-reservation",
  "reprocessing-batches",
  "reprocessing-yield",
  "invoice-register",
  "receivables-aging",
  "credit-notes",
  "delivery-register",
  "on-time-delivery",
  "delivery-exceptions",
  "customer-directory",
  "customer-revenue",
  "product-catalog",
  "product-standard-cost",
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
