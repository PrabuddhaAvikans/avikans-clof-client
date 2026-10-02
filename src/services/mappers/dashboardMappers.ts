import type {
  ChartDataPoint,
  DashboardActivityChange,
  DashboardActivityItem,
  DashboardNotificationPreview,
  DashboardSummary,
  DashboardTableRow,
  OrderFlowOverview,
  OrderFlowSeverity,
  OrderFlowStage,
  OrderFlowStageKey,
  OrderFlowStat,
} from "@/types/dashboard";

export function mapChartPoint(raw: Record<string, unknown>): ChartDataPoint {
  return {
    label: String(raw.label ?? ""),
    value: Number(raw.value ?? 0),
    color: raw.color as string | undefined,
  };
}

export function mapTableRow(raw: Record<string, unknown>): DashboardTableRow {
  return {
    id: String(raw.id),
    reference: String(raw.reference ?? ""),
    title: String(raw.title ?? ""),
    status: String(raw.status ?? ""),
    amount: raw.amount == null ? undefined : Number(raw.amount),
    date: String(raw.date ?? ""),
    customer: raw.customer as string | undefined,
    priority: raw.priority as string | undefined,
    href: raw.href as string | undefined,
  };
}

export function mapActivityChange(raw: Record<string, unknown>): DashboardActivityChange {
  return {
    field: String(raw.field ?? ""),
    from: raw.from as string | undefined,
    to: raw.to as string | undefined,
  };
}

export function mapActivityItem(raw: Record<string, unknown>): DashboardActivityItem {
  return {
    id: String(raw.id),
    description: String(raw.description ?? ""),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    type: String(raw.type ?? ""),
    user: raw.user as string | undefined,
    href: raw.href as string | undefined,
    action: raw.action as string | undefined,
    entityLabel: raw.entityLabel as string | undefined,
    severity: raw.severity as string | undefined,
    entityId: raw.entityId == null ? undefined : String(raw.entityId),
    changes: ((raw.changes as unknown[]) ?? []).map((change) =>
      mapActivityChange(change as Record<string, unknown>),
    ),
  };
}

export function mapNotification(raw: Record<string, unknown>): DashboardNotificationPreview {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    message: String(raw.message ?? ""),
    type: String(raw.type ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    isRead: Boolean(raw.isRead),
    actionUrl: raw.actionUrl as string | undefined,
  };
}

export function mapChartArray(raw: unknown): ChartDataPoint[] {
  return ((raw as unknown[]) ?? []).map((item) => mapChartPoint(item as Record<string, unknown>));
}

export function mapTableArray(raw: unknown): DashboardTableRow[] {
  return ((raw as unknown[]) ?? []).map((item) => mapTableRow(item as Record<string, unknown>));
}

function mapSeverity(value: unknown): OrderFlowSeverity {
  const severity = String(value ?? "none");
  switch (severity) {
    case "info":
    case "pending":
    case "warning":
    case "critical":
    case "success":
    case "none":
      return severity;
    default:
      return "none";
  }
}

function mapStageKey(value: unknown): OrderFlowStageKey {
  const key = String(value ?? "");
  switch (key) {
    case "quotation":
    case "sales_order":
    case "estimation":
    case "costing":
    case "production":
    case "delivery":
    case "completed":
      return key;
    default:
      return "quotation";
  }
}

export function mapOrderFlowStat(raw: Record<string, unknown>): OrderFlowStat {
  return {
    key: String(raw.key ?? ""),
    label: String(raw.label ?? ""),
    count: Number(raw.count ?? 0),
    severity: mapSeverity(raw.severity),
  };
}

function asStageRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

export function mapOrderFlowStage(raw: Record<string, unknown>): OrderFlowStage {
  return {
    stageKey: mapStageKey(raw.stageKey),
    title: String(raw.title ?? ""),
    summaryText: String(raw.summaryText ?? ""),
    total: Number(raw.total ?? 0),
    attentionCount: Number(raw.attentionCount ?? 0),
    attentionSeverity: mapSeverity(raw.attentionSeverity),
    stats: ((raw.stats as unknown[]) ?? []).map((item) =>
      mapOrderFlowStat(item as Record<string, unknown>),
    ),
    messages: ((raw.messages as unknown[]) ?? []).map((message) => String(message)),
  };
}

export function mapOrderFlow(raw: Record<string, unknown>): OrderFlowOverview {
  return {
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    quotation: mapOrderFlowStage(asStageRecord(raw.quotation)),
    salesOrder: mapOrderFlowStage(asStageRecord(raw.salesOrder)),
    estimation: mapOrderFlowStage(asStageRecord(raw.estimation)),
    costing: mapOrderFlowStage(asStageRecord(raw.costing)),
    production: mapOrderFlowStage(asStageRecord(raw.production)),
    delivery: mapOrderFlowStage(asStageRecord(raw.delivery)),
    completed: mapOrderFlowStage(asStageRecord(raw.completed)),
  };
}

export function mapSummary(raw: Record<string, unknown>): DashboardSummary {
  return {
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    periodLabel: String(raw.periodLabel ?? ""),

    totalCustomers: Number(raw.totalCustomers ?? 0),
    activeQuotations: Number(raw.activeQuotations ?? 0),
    pendingApprovals: Number(raw.pendingApprovals ?? 0),
    pendingEstimations: Number(raw.pendingEstimations ?? 0),
    confirmedSalesOrders: Number(raw.confirmedSalesOrders ?? 0),
    openSalesOrders: Number(raw.openSalesOrders ?? 0),
    manufacturingJobsInProgress: Number(raw.manufacturingJobsInProgress ?? 0),
    delayedJobs: Number(raw.delayedJobs ?? 0),
    qualityCheckJobs: Number(raw.qualityCheckJobs ?? 0),
    readyToShip: Number(raw.readyToShip ?? 0),
    deliveriesDueToday: Number(raw.deliveriesDueToday ?? 0),
    deliveriesInTransit: Number(raw.deliveriesInTransit ?? 0),
    upcomingDeliveryCount: Number(raw.upcomingDeliveryCount ?? 0),
    lowStockItems: Number(raw.lowStockItems ?? 0),
    reprocessingInProgress: Number(raw.reprocessingInProgress ?? 0),
    productCount: Number(raw.productCount ?? 0),
    monthlySalesValue: Number(raw.monthlySalesValue ?? 0),
    revenueGrowthPercent: Number(raw.revenueGrowthPercent ?? 0),
    ordersGrowthPercent: Number(raw.ordersGrowthPercent ?? 0),
    productionCapacityPercent: Number(raw.productionCapacityPercent ?? 0),

    monthlyQuotationValue: mapChartArray(raw.monthlyQuotationValue),
    revenueByMonth: mapChartArray(raw.revenueByMonth),
    ordersByMonth: mapChartArray(raw.ordersByMonth),
    quotationConversion: mapChartArray(raw.quotationConversion),
    ordersByStatus: mapChartArray(raw.ordersByStatus),
    manufacturingByStatus: mapChartArray(raw.manufacturingByStatus),
    deliveriesByStatus: mapChartArray(raw.deliveriesByStatus),
    inventoryByStatus: mapChartArray(raw.inventoryByStatus),
    topProducts: mapChartArray(raw.topProducts),

    recentQuotations: mapTableArray(raw.recentQuotations),
    recentlyApprovedOrders: mapTableArray(raw.recentlyApprovedOrders),
    jobsRequiringAttention: mapTableArray(raw.jobsRequiringAttention),
    upcomingDeliveries: mapTableArray(raw.upcomingDeliveries),
    pendingCosting: mapTableArray(raw.pendingCosting),
    lowStockRows: mapTableArray(raw.lowStockRows),
    recentActivity: ((raw.recentActivity as unknown[]) ?? []).map((item) =>
      mapActivityItem(item as Record<string, unknown>),
    ),
    notifications: ((raw.notifications as unknown[]) ?? []).map((item) =>
      mapNotification(item as Record<string, unknown>),
    ),
  };
}
