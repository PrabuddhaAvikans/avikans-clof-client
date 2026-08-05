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
}

export interface DashboardActivityItem {
  id: string;
  description: string;
  timestamp: string;
  type: string;
  user?: string;
}

export interface DashboardNotificationPreview {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

export interface DashboardSummary {
  totalCustomers: number;
  activeQuotations: number;
  pendingApprovals: number;
  confirmedSalesOrders: number;
  manufacturingJobsInProgress: number;
  delayedJobs: number;
  deliveriesDueToday: number;
  lowStockItems: number;
  monthlySalesValue: number;
  revenueGrowthPercent: number;
  ordersGrowthPercent: number;

  activeManufacturingJobs: number;
  pendingQuotations: number;
  openSalesOrders: number;
  deliveriesInTransit: number;
  totalRevenue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  customersActive: number;
  productionCapacityPercent: number;

  monthlyQuotationValue: ChartDataPoint[];
  quotationConversion: ChartDataPoint[];
  revenueByMonth: ChartDataPoint[];
  ordersByStatus: ChartDataPoint[];
  manufacturingByStatus: ChartDataPoint[];
  deliveriesByStatus: ChartDataPoint[];
  topProducts: ChartDataPoint[];

  recentQuotations: DashboardTableRow[];
  recentlyApprovedOrders: DashboardTableRow[];
  jobsRequiringAttention: DashboardTableRow[];
  upcomingDeliveries: DashboardTableRow[];
  recentActivity: DashboardActivityItem[];
  notifications: DashboardNotificationPreview[];
}
