import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  Factory,
  FileText,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { ActivityLog } from "@/components/ui/ActivityLog";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { ROUTES } from "@/app/config/routes";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboard";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  getStatusVariant,
  ManufacturingJobStatus,
  QuotationStatus,
  SalesOrderStatus,
  DeliveryStatus,
} from "@/types/status";
import type { ChartDataPoint, DashboardTableRow } from "@/types/dashboard";
import type { StatusBadgeVariant } from "@/components/ui/StatusBadge";

const CHART_COLORS = ["#0a0a0a", "#404040", "#525252", "#737373", "#a3a3a3", "#c4c4c4", "#d4d4d4"];

function mapStatusVariant(variant: ReturnType<typeof getStatusVariant>): StatusBadgeVariant {
  const map: Record<string, StatusBadgeVariant> = {
    default: "neutral",
    secondary: "neutral",
    success: "success",
    warning: "warning",
    destructive: "danger",
    outline: "neutral",
    info: "info",
  };
  return map[variant] ?? "neutral";
}

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

function ChartCard({ title, children, className }: ChartCardProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-5 shadow-xs ${className ?? ""}`}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

type DashboardTableProps = {
  title: string;
  rows: DashboardTableRow[];
  showAmount?: boolean;
  statusMap?: Record<string, { label: string; variant: string }>;
  viewAllHref?: string;
};

function DashboardTable({
  title,
  rows,
  showAmount = true,
  statusMap,
  viewAllHref,
}: DashboardTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {viewAllHref && (
          <Link to={viewAllHref} className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Reference
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Details
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                Status
              </th>
              {showAmount && (
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                  Amount
                </th>
              )}
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusDef = statusMap?.[row.status];
              const variant = statusDef
                ? mapStatusVariant(statusDef.variant as ReturnType<typeof getStatusVariant>)
                : "neutral";

              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.reference}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{row.title}</p>
                    {row.customer && (
                      <p className="text-xs text-muted-foreground">{row.customer}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={variant} size="sm">
                      {statusDef?.label ?? row.status}
                    </StatusBadge>
                  </td>
                  {showAmount && (
                    <td className="px-4 py-3 text-right text-foreground">
                      {row.amount !== undefined ? formatCurrency(row.amount, "LKR") : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDate(row.date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [Number(value ?? 0), "Count"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Dashboard"
        description="Overview of sales, manufacturing, and delivery operations."
        actions={
          <>
            {/* <Link to={ROUTES.quotations.list}>
              <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
                Quotations
              </Button>
            </Link>
            <Link to={ROUTES.salesOrders.new}>
              <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="h-4 w-4" />}>
                New Order
              </Button>
            </Link> */}
            <Link to={ROUTES.products.new}>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Product
              </Button>
            </Link>
          </>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={isError ? "Failed to load dashboard data." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
        loadingLines={8}
      >
        {data && (
          <div className="space-y-3">
            {/* Summary cards */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <SummaryCard
                title="Total Customers"
                value={data.totalCustomers}
                icon={<Users className="h-5 w-5" />}
                description="Active accounts"
              />
              <SummaryCard
                title="Active Quotations"
                value={data.activeQuotations}
                icon={<FileText className="h-5 w-5" />}
                description="Open quotations"
              />
              <SummaryCard
                title="Pending Approvals"
                value={data.pendingApprovals}
                icon={<ClipboardList className="h-5 w-5" />}
                description="Awaiting review"
              />
              <SummaryCard
                title="Confirmed Sales Orders"
                value={data.confirmedSalesOrders}
                icon={<ShoppingCart className="h-5 w-5" />}
                trend={data.ordersGrowthPercent}
                trendLabel="vs last month"
              />
              <SummaryCard
                title="Jobs In Progress"
                value={data.manufacturingJobsInProgress}
                icon={<Factory className="h-5 w-5" />}
                description={`${data.productionCapacityPercent}% capacity`}
              />
              <SummaryCard
                title="Delayed Jobs"
                value={data.delayedJobs}
                icon={<AlertTriangle className="h-5 w-5" />}
                description="Requires attention"
              />
              <SummaryCard
                title="Deliveries Due Today"
                value={data.deliveriesDueToday}
                icon={<Truck className="h-5 w-5" />}
                description={`${data.deliveriesInTransit} in transit`}
              />
              <SummaryCard
                title="Low Stock Items"
                value={data.lowStockItems}
                icon={<Package className="h-5 w-5" />}
                description="Below reorder level"
              />
              <SummaryCard
                title="Monthly Sales Value"
                value={formatCurrency(data.monthlySalesValue, "LKR")}
                icon={<Wallet className="h-5 w-5" />}
                trend={data.revenueGrowthPercent}
                trendLabel="vs last month"
              />
            </div>

            {/* Quick actions */}
            {/* <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-4">
              <span className="mr-2 self-center text-sm font-medium text-muted-foreground">
                Quick actions:
              </span>
              <Link to={ROUTES.products.new}>
                <Button variant="outline" size="sm">Create Product</Button>
              </Link>
              <Link to={ROUTES.customers.new}>
                <Button variant="outline" size="sm">Add Customer</Button>
              </Link>
              <Link to={ROUTES.quotations.new}>
                <Button variant="outline" size="sm">New Quotation</Button>
              </Link>
              <Link to={ROUTES.manufacturing.jobsNew}>
                <Button variant="outline" size="sm">Create Job</Button>
              </Link>
              <Link to={ROUTES.deliveries.new}>
                <Button variant="outline" size="sm">Schedule Delivery</Button>
              </Link>
            </div> */}

            {/* Charts row 1 */}
            {/* <div className="grid gap-2 lg:grid-cols-2">
              <ChartCard title="Monthly Quotation Value">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.monthlyQuotationValue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), "LKR")} />
                    <Bar dataKey="value" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Quotation Conversion">
                <DonutChart data={data.quotationConversion} />
              </ChartCard>
            </div> */}

            {/* Charts row 2 */}
            {/* <div className="grid gap-2 lg:grid-cols-3">
              <ChartCard title="Orders by Status">
                <DonutChart data={data.ordersByStatus} />
              </ChartCard>
              <ChartCard title="Manufacturing by Status">
                <DonutChart data={data.manufacturingByStatus} />
              </ChartCard>
              <ChartCard title="Deliveries by Status">
                <DonutChart data={data.deliveriesByStatus} />
              </ChartCard>
            </div> */}

            {/* Charts row 3 */}
            {/* <div className="grid gap-2 lg:grid-cols-2">
              <ChartCard title="Revenue Trend">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0), "LKR")} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Revenue"
                      stroke="#0a0a0a"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top Selling Products">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Units sold" fill="#404040" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div> */}

            {/* Tables row */}
            {/* <div className="grid gap-2 xl:grid-cols-2">
              <DashboardTable
                title="Recent Quotations"
                rows={data.recentQuotations}
                statusMap={QuotationStatus}
                viewAllHref={ROUTES.quotations.list}
              />
              <DashboardTable
                title="Recently Approved Orders"
                rows={data.recentlyApprovedOrders}
                statusMap={SalesOrderStatus}
                viewAllHref={ROUTES.salesOrders.list}
              />
            </div> */}

            {/* <div className="grid gap-2 xl:grid-cols-2">
              <DashboardTable
                title="Jobs Requiring Attention"
                rows={data.jobsRequiringAttention}
                statusMap={ManufacturingJobStatus}
                showAmount={false}
                viewAllHref={ROUTES.manufacturing.jobs}
              />
              <DashboardTable
                title="Upcoming Deliveries"
                rows={data.upcomingDeliveries}
                statusMap={DeliveryStatus}
                showAmount={false}
                viewAllHref={ROUTES.deliveries.list}
              />
            </div> */}

            {/* Activity & notifications */}
            {/* <div className="grid gap-2 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <ActivityLog
                  entries={data.recentActivity.map((item) => ({
                    id: item.id,
                    user: item.user ?? "System",
                    action: item.description,
                    timestamp: formatDateTime(item.timestamp),
                  }))}
                />
              </div>

              <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <Link
                    to={ROUTES.admin.notifications}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data.notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`flex gap-3 px-4 py-3 ${!notification.isRead ? "bg-accent/20" : ""}`}
                    >
                      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                          {!notification.isRead && (
                            <StatusBadge variant="primary" size="sm">
                              New
                            </StatusBadge>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div> */}
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
