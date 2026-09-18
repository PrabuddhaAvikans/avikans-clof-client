export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface DashboardTableRow {
  id: string;
  reference: string;
  title: string;
  status: string;
  amount?: number;
  date: string;
  customer?: string;
  priority?: string;
  href?: string;
}

export interface DashboardActivityChange {
  field: string;
  from?: string;
  to?: string;
}

export interface DashboardActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: string;
  user?: string;
  href?: string;
  action?: string;
  entityLabel?: string;
  severity?: string;
  entityId?: string;
  changes?: DashboardActivityChange[];
}

export interface DashboardNotificationPreview {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface DashboardSummary {
  generatedAt: string;
  periodLabel: string;

  totalCustomers: number;
  activeQuotations: number;
  pendingApprovals: number;
  pendingEstimations: number;
  confirmedSalesOrders: number;
  openSalesOrders: number;
  manufacturingJobsInProgress: number;
  delayedJobs: number;
  qualityCheckJobs: number;
  readyToShip: number;
  deliveriesDueToday: number;
  deliveriesInTransit: number;
  upcomingDeliveryCount: number;
  lowStockItems: number;
  reprocessingInProgress: number;
  productCount: number;
  monthlySalesValue: number;
  revenueGrowthPercent: number;
  ordersGrowthPercent: number;
  productionCapacityPercent: number;

  monthlyQuotationValue: ChartDataPoint[];
  revenueByMonth: ChartDataPoint[];
  ordersByMonth: ChartDataPoint[];
  quotationConversion: ChartDataPoint[];
  ordersByStatus: ChartDataPoint[];
  manufacturingByStatus: ChartDataPoint[];
  deliveriesByStatus: ChartDataPoint[];
  inventoryByStatus: ChartDataPoint[];
  topProducts: ChartDataPoint[];

  recentQuotations: DashboardTableRow[];
  recentlyApprovedOrders: DashboardTableRow[];
  jobsRequiringAttention: DashboardTableRow[];
  upcomingDeliveries: DashboardTableRow[];
  pendingCosting: DashboardTableRow[];
  lowStockRows: DashboardTableRow[];
  recentActivity: DashboardActivityItem[];
  notifications: DashboardNotificationPreview[];
}
