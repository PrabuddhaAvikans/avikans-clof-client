import {
  addMonths,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ROUTES } from "@/app/config/routes";
import { auditEntityPath } from "@/features/admin/lib/auditLabels";
import { CHART_COLORS } from "@/features/dashboard/lib/chartTheme";
import { coverCompletedJobs } from "@/features/manufacturing/lib/readyToShip";
import { percent, round2 } from "@/features/reports/lib/reportHelpers";
import type { AuditLogEntry } from "@/types/audit";
import type { CostingRequest } from "@/types/costing";
import type { Customer } from "@/types/customer";
import type {
  ChartDataPoint,
  DashboardSummary,
  DashboardTableRow,
} from "@/types/dashboard";
import type { Delivery } from "@/types/delivery";
import type { InventoryItem } from "@/types/inventory";
import type { AppNotification } from "@/types/notification";
import type { Product } from "@/types/product";
import type { ProductionJob, ProductionTrackingSnapshot } from "@/types/production-tracking";
import type { Quotation } from "@/types/quotation";
import type { ReprocessingBatch } from "@/types/reprocessing";
import type { SalesOrder } from "@/types/sales-order";
import {
  DeliveryStatus,
  ManufacturingJobStatus,
  QuotationStatus,
  SalesOrderStatus,
  StockStatus,
  getStatusLabel,
  type StatusMap,
} from "@/types/status";

export type DashboardSources = {
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  production: ProductionTrackingSnapshot;
  inventory: InventoryItem[];
  lowStock: InventoryItem[];
  customers: Customer[];
  products: Product[];
  deliveries: Delivery[];
  costing: CostingRequest[];
  reprocessing: ReprocessingBatch[];
  notifications: AppNotification[];
  auditLogs: AuditLogEntry[];
};

const OPEN_QUOTE_STATUSES = new Set(["draft", "ready_to_send", "sent", "viewed"]);
const OPEN_ORDER_STATUSES = new Set([
  "draft",
  "pending_review",
  "confirmed",
  "submitted",
  "in_manufacturing",
  "ready_for_delivery",
  "partially_delivered",
]);
const CONFIRMED_ORDER_STATUSES = new Set([
  "confirmed",
  "submitted",
  "in_manufacturing",
  "ready_for_delivery",
  "partially_delivered",
]);
const PENDING_COSTING = new Set(["pending", "in_review", "changes_requested"]);
const OPEN_DELIVERY = new Set([
  "planned",
  "ready_for_dispatch",
  "dispatched",
  "in_transit",
  "partially_delivered",
]);
const ATTENTION_JOB_STATUSES = new Set([
  "on_hold",
  "rework",
  "quality_check",
  "materials_pending",
]);
const CLOSED_JOB_STATUSES = new Set(["completed", "cancelled"]);
const CLOSED_DELIVERY = new Set(["delivered", "cancelled", "failed", "returned"]);

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function latestDate(values: Array<string | undefined>): Date {
  const dates = values.map(toDate).filter((date): date is Date => date != null);
  if (!dates.length) return new Date();
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function growth(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / previous) * 100);
}

function takeSorted<T>(
  items: T[],
  read: (item: T) => string,
  count: number,
  direction: "asc" | "desc" = "desc",
): T[] {
  const sign = direction === "desc" ? -1 : 1;
  return [...items]
    .sort((a, b) => {
      const left = toDate(read(a))?.getTime() ?? 0;
      const right = toDate(read(b))?.getTime() ?? 0;
      return (left - right) * sign;
    })
    .slice(0, count);
}

function takeLatest<T>(items: T[], read: (item: T) => string, count: number): T[] {
  return takeSorted(items, read, count, "desc");
}

function chartFromStatus<T>(
  items: T[],
  read: (item: T) => string,
  statusMap: StatusMap,
): ChartDataPoint[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = read(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], index) => ({
      label: getStatusLabel(statusMap, key),
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

function monthSeries(
  months: Date[],
  items: Array<{ date?: string; amount: number }>,
): ChartDataPoint[] {
  return months.map((month) => {
    const key = format(month, "yyyy-MM");
    const value = items.reduce((sum, item) => {
      const date = toDate(item.date);
      if (!date || format(date, "yyyy-MM") !== key) return sum;
      return sum + item.amount;
    }, 0);
    return { label: format(month, "MMM"), value: round2(value) };
  });
}

function countSeries(months: Date[], items: Array<{ date?: string }>): ChartDataPoint[] {
  return monthSeries(
    months,
    items.map((item) => ({ date: item.date, amount: 1 })),
  );
}

function buildMonthWindow(anchor: Date, count = 6): Date[] {
  const end = startOfMonth(anchor);
  return Array.from({ length: count }, (_, index) => addMonths(end, index - (count - 1)));
}

export function buildDashboardSummary(sources: DashboardSources): DashboardSummary {
  const {
    quotations,
    salesOrders,
    production,
    inventory,
    lowStock,
    customers,
    products,
    deliveries,
    costing,
    reprocessing,
    notifications,
    auditLogs,
  } = sources;

  const jobs = production.jobs;
  const asOf = latestDate([
    ...quotations.map((item) => item.createdAt),
    ...salesOrders.map((item) => item.confirmedAt ?? item.createdAt),
  ]);
  const months = buildMonthWindow(asOf);
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const currentKey = format(currentMonth, "yyyy-MM");
  const previousKey = format(previousMonth, "yyyy-MM");

  const quotationAmounts = quotations.map((item) => ({
    date: item.createdAt,
    amount: item.totalAmount,
  }));
  const orderAmounts = salesOrders.map((item) => ({
    date: item.confirmedAt ?? item.createdAt,
    amount: item.totalAmount,
  }));

  const monthlyQuotationValue = monthSeries(months, quotationAmounts);
  const revenueByMonth = monthSeries(months, orderAmounts);
  const salesWithValue = [...revenueByMonth]
    .map((point, index) => ({ point, month: months[index] }))
    .reverse()
    .filter((entry) => entry.point.value > 0);
  const latestSales = salesWithValue[0];
  const monthlySalesValue = latestSales?.point.value ?? 0;
  const previousSalesValue = salesWithValue[1]?.point.value ?? 0;
  const salesMonth = latestSales?.month ?? currentMonth;

  const ordersThisMonth = salesOrders.filter((item) => {
    const date = toDate(item.confirmedAt ?? item.createdAt);
    return date ? format(date, "yyyy-MM") === currentKey : false;
  }).length;
  const ordersLastMonth = salesOrders.filter((item) => {
    const date = toDate(item.confirmedAt ?? item.createdAt);
    return date ? format(date, "yyyy-MM") === previousKey : false;
  }).length;

  const openJobs = jobs.filter((job) => !CLOSED_JOB_STATUSES.has(job.status));
  const inProgress = jobs.filter(
    (job) =>
      job.status === "in_progress" ||
      job.status === "ready_to_start" ||
      job.status === "quality_check" ||
      job.status === "rework",
  );
  const delayedJobs = jobs.filter((job) => (job.overdueDays ?? 0) > 0);
  const qualityCheckJobs = jobs.filter((job) => job.status === "quality_check");
  const shipCoverage = coverCompletedJobs(
    jobs.map((job) => ({
      id: job.id,
      salesOrderNumber: job.salesOrderNumber,
      productSku: job.productSku,
      quantity: job.quantity,
      status: job.status,
      completedAt: job.completedAt,
    })),
    deliveries,
  );
  const readyToShip = jobs.filter(
    (job) => job.status === "completed" && (shipCoverage.get(job.id)?.remainingQuantity ?? 0) > 0,
  );

  const pendingCostingItems = costing.filter((item) => PENDING_COSTING.has(item.status));
  const pendingEstimations = costing.filter((item) => item.coatingStatus === "pending");

  const topProductCounts = new Map<string, number>();
  for (const order of salesOrders) {
    for (const line of order.lineItems) {
      const label = line.productName || line.productSku;
      topProductCounts.set(label, (topProductCounts.get(label) ?? 0) + line.quantity);
    }
  }
  const topProducts = [...topProductCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label: label.length > 22 ? `${label.slice(0, 21)}…` : label,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const attentionJobs = takeSorted(
    jobs.filter(
      (job) =>
        ATTENTION_JOB_STATUSES.has(job.status) || (job.overdueDays ?? 0) > 0,
    ),
    (job) => job.dueDate,
    6,
    "asc",
  );

  return {
    generatedAt: new Date().toISOString(),
    periodLabel: format(salesMonth, "MMM yyyy"),

    totalCustomers: customers.filter((item) => item.status === "active").length,
    activeQuotations: quotations.filter((item) => OPEN_QUOTE_STATUSES.has(item.status)).length,
    pendingApprovals: pendingCostingItems.length,
    pendingEstimations: pendingEstimations.length,
    confirmedSalesOrders: salesOrders.filter((item) =>
      CONFIRMED_ORDER_STATUSES.has(item.status),
    ).length,
    openSalesOrders: salesOrders.filter((item) => OPEN_ORDER_STATUSES.has(item.status)).length,
    manufacturingJobsInProgress: inProgress.length,
    delayedJobs: delayedJobs.length,
    qualityCheckJobs: qualityCheckJobs.length,
    readyToShip: readyToShip.length,
    deliveriesDueToday: deliveries.filter((item) => {
      const date = toDate(item.scheduledDate);
      return Boolean(date && isSameDay(date, asOf) && !CLOSED_DELIVERY.has(item.status));
    }).length,
    deliveriesInTransit: deliveries.filter(
      (item) => item.status === "in_transit" || item.status === "dispatched",
    ).length,
    upcomingDeliveryCount: deliveries.filter((item) => OPEN_DELIVERY.has(item.status)).length,
    lowStockItems: lowStock.length,
    reprocessingInProgress: reprocessing.filter(
      (item) => item.status === "draft" || item.status === "in_progress",
    ).length,
    productCount: products.filter((item) => item.status === "active").length,
    monthlySalesValue,
    revenueGrowthPercent: growth(monthlySalesValue, previousSalesValue),
    ordersGrowthPercent: growth(ordersThisMonth, ordersLastMonth),
    productionCapacityPercent: Math.round(percent(inProgress.length, Math.max(openJobs.length, 1))),

    monthlyQuotationValue,
    revenueByMonth,
    ordersByMonth: countSeries(
      months,
      salesOrders.map((item) => ({ date: item.confirmedAt ?? item.createdAt })),
    ),
    quotationConversion: chartFromStatus(quotations, (item) => item.status, QuotationStatus),
    ordersByStatus: chartFromStatus(salesOrders, (item) => item.status, SalesOrderStatus),
    manufacturingByStatus: chartFromStatus(jobs, (item) => item.status, ManufacturingJobStatus),
    deliveriesByStatus: chartFromStatus(deliveries, (item) => item.status, DeliveryStatus),
    inventoryByStatus: chartFromStatus(inventory, (item) => item.stockStatus, StockStatus),
    topProducts,

    recentQuotations: takeLatest(quotations, (item) => item.updatedAt ?? item.createdAt, 5).map(
      (item) => ({
        id: item.id,
        reference: item.quotationNumber,
        title: item.lineItems[0]?.productName ?? "Quotation",
        status: item.status,
        amount: item.totalAmount,
        date: item.updatedAt ?? item.createdAt,
        customer: item.customerName,
        href: ROUTES.quotations.detail(item.id),
      }),
    ),
    recentlyApprovedOrders: takeLatest(
      salesOrders.filter((item) => item.status !== "draft" && item.status !== "cancelled"),
      (item) => item.confirmedAt ?? item.updatedAt,
      5,
    ).map((item) => ({
      id: item.id,
      reference: item.orderNumber,
      title: item.lineItems[0]?.productName ?? "Sales order",
      status: item.status,
      amount: item.totalAmount,
      date: item.confirmedAt ?? item.updatedAt,
      customer: item.customerName,
      href: ROUTES.salesOrders.detail(item.id),
    })),
    jobsRequiringAttention: attentionJobs.map(toJobRow),
    upcomingDeliveries: takeSorted(
      deliveries.filter((item) => OPEN_DELIVERY.has(item.status)),
      (item) => item.scheduledDate,
      5,
      "asc",
    ).map((item) => ({
      id: item.id,
      reference: item.deliveryNumber,
      title: item.salesOrderNumber,
      status: item.status,
      date: item.scheduledDate,
      customer: item.customerName,
      href: ROUTES.deliveries.detail(item.id),
    })),
    pendingCosting: takeLatest(pendingCostingItems, (item) => item.requestedDate, 5).map(
      (item) => ({
        id: item.id,
        reference: item.requestNumber,
        title: item.projectName,
        status: item.status,
        amount: item.proposedPrice,
        date: item.requestedDate,
        customer: item.customerName,
        href: item.salesOrderId
          ? ROUTES.costing.forOrder(item.salesOrderId)
          : ROUTES.costing.workspace,
      }),
    ),
    lowStockRows: lowStock.slice(0, 6).map((item) => ({
      id: item.id,
      reference: item.sku,
      title: item.name,
      status: item.stockStatus,
      date: item.updatedAt,
      customer: `${item.quantityAvailable} ${item.unit} available`,
      href: ROUTES.inventory.detail(item.id),
    })),
    recentActivity: takeLatest(auditLogs, (item) => item.timestamp, 24).map((item) => ({
      id: item.id,
      description: item.details,
      timestamp: item.timestamp,
      type: item.entity,
      user: item.userName,
      href: auditEntityPath(item.entity, item.entityId) ?? undefined,
      action: item.action,
      entityLabel: item.entityLabel || item.entity,
      severity: item.severity,
      entityId: item.entityId,
      changes: item.changes,
    })),
    notifications: takeLatest(notifications, (item) => item.createdAt, 6).map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      createdAt: item.createdAt,
      isRead: item.isRead,
      actionUrl: item.actionUrl,
    })),
  };
}

function toJobRow(job: ProductionJob): DashboardTableRow {
  return {
    id: job.id,
    reference: job.jobNumber,
    title: job.productName,
    status: job.status,
    date: job.dueDate,
    customer: job.customerName,
    priority: job.priority,
    href: ROUTES.manufacturing.jobDetail(job.id),
  };
}
