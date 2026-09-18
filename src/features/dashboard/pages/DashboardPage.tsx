import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/app/config/routes";
import type { Permission } from "@/app/config/permissions";
import {
  ChartCard,
  ChartKey,
  DashboardColumnChart,
  DashboardCompareTrend,
  DashboardHBarChart,
} from "@/features/dashboard/components/DashboardCharts";
import { DashboardKpiStrip } from "@/features/dashboard/components/DashboardKpiStrip";
import { DashboardActivityRail } from "@/features/dashboard/components/DashboardActivity";
import {
  DashboardCompactList,
  DashboardPanel,
} from "@/features/dashboard/components/DashboardQueues";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboard";
import { usePermissions } from "@/hooks/usePermissions";
import { useBreakpoints } from "@/hooks/useMediaQuery";
import { formatNumber } from "@/lib/format";
import type { DashboardSummary } from "@/types/dashboard";
import { CostingRequestStatus, ManufacturingJobStatus } from "@/types/status";

type Metric = {
  id: string;
  label: string;
  value: string | number;
  meta?: string;
  href?: string;
  permission?: Permission;
  bar: number;
};

function buildMetrics(data: DashboardSummary): Metric[] {
  return [
    {
      id: "costing",
      label: "Costing",
      value: data.pendingApprovals,
      meta: "Pending",
      href: ROUTES.costing.workspace,
      permission: "quotations:view",
      bar: data.pendingApprovals,
    },
    {
      id: "orders",
      label: "Orders",
      value: data.openSalesOrders,
      meta: "Open",
      href: ROUTES.salesOrders.list,
      permission: "sales_orders:view",
      bar: data.openSalesOrders,
    },
    {
      id: "jobs",
      label: "In production",
      value: data.manufacturingJobsInProgress,
      meta: "Jobs",
      href: ROUTES.manufacturing.jobs,
      permission: "manufacturing:view",
      bar: data.manufacturingJobsInProgress,
    },
    {
      id: "delayed",
      label: "Delayed",
      value: data.delayedJobs,
      meta: "Jobs",
      href: ROUTES.manufacturing.jobs,
      permission: "manufacturing:view",
      bar: data.delayedJobs,
    },
    {
      id: "stock",
      label: "Low stock",
      value: data.lowStockItems,
      meta: "Items",
      href: ROUTES.inventory.lowStock,
      permission: "inventory:view",
      bar: data.lowStockItems,
    },
    {
      id: "quotes",
      label: "Quotations",
      value: data.activeQuotations,
      meta: "Open",
      href: ROUTES.quotations.list,
      permission: "quotations:view",
      bar: data.activeQuotations,
    },
  ];
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const { hasPermission } = usePermissions();
  const { isMobile } = useBreakpoints();
  const chartHeight = isMobile ? 140 : 176;
  const smallChart = isMobile ? 132 : 156;

  const metrics = (data ? buildMetrics(data) : []).filter(
    (metric) => !metric.permission || hasPermission(metric.permission),
  );

  const canViewSales = hasPermission("quotations:view") || hasPermission("sales_orders:view");
  const canViewProduction = hasPermission("manufacturing:view");
  const canViewDelivery = hasPermission("delivery:view");

  return (
    <div className="flex min-h-0 flex-col lg:h-[calc(100dvh-6.5rem)] lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <PageContainer
          maxWidth="wide"
          className="px-3 py-3 sm:px-4 sm:py-3 lg:px-5 lg:py-3"
        >
          <PageHeader
            className="mb-3"
            title="Dashboard"
            actions={
              <Button
                variant="outline"
                size="sm"
                aria-label="Refresh dashboard"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => void refetch()}
              >
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            }
          />

          <PageContent
            isLoading={isLoading}
            error={isError ? "Failed to load dashboard data." : null}
            onRetry={() => void refetch()}
            loadingVariant="card"
            loadingLines={6}
          >
            {data && (
              <div className="space-y-3">
                <DashboardKpiStrip
                  items={metrics.map(({ permission: _permission, ...item }) => item)}
                />

                {canViewSales && (
                  <div className="grid gap-3 lg:grid-cols-12">
                    <ChartCard
                      title={`Sales vs quotations · ${data.periodLabel}`}
                      className="lg:col-span-7"
                      legend={
                        <ChartKey
                          items={[
                            { label: "Sales", color: "#0a0a0a" },
                            { label: "Quotes", color: "#737373" },
                          ]}
                        />
                      }
                    >
                      <DashboardCompareTrend
                        primary={data.revenueByMonth}
                        secondary={data.monthlyQuotationValue}
                        primaryName="Sales"
                        secondaryName="Quotes"
                        height={chartHeight}
                      />
                    </ChartCard>
                    <ChartCard title="Top products" className="lg:col-span-5">
                      <DashboardHBarChart data={data.topProducts} height={chartHeight} />
                    </ChartCard>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {canViewSales && (
                    <ChartCard title="Orders by month">
                      <DashboardColumnChart data={data.ordersByMonth} height={smallChart} />
                    </ChartCard>
                  )}
                  {canViewProduction && (
                    <ChartCard title="Production">
                      <DashboardHBarChart
                        data={data.manufacturingByStatus}
                        height={smallChart}
                        formatValue={formatNumber}
                      />
                    </ChartCard>
                  )}
                  {canViewDelivery && (
                    <ChartCard title="Deliveries">
                      <DashboardHBarChart
                        data={data.deliveriesByStatus}
                        height={smallChart}
                        formatValue={formatNumber}
                      />
                    </ChartCard>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {canViewProduction && (
                    <DashboardPanel title="Jobs needing action" href={ROUTES.manufacturing.jobs}>
                      <DashboardCompactList
                        rows={data.jobsRequiringAttention}
                        statusMap={ManufacturingJobStatus}
                      />
                    </DashboardPanel>
                  )}
                  {hasPermission("quotations:view") && (
                    <DashboardPanel title="Pending costing" href={ROUTES.costing.workspace}>
                      <DashboardCompactList
                        rows={data.pendingCosting}
                        statusMap={CostingRequestStatus}
                        showAmount={!isMobile}
                      />
                    </DashboardPanel>
                  )}
                </div>
              </div>
            )}
          </PageContent>
        </PageContainer>
      </div>

      <DashboardActivityRail
        entries={data?.recentActivity ?? []}
        href={hasPermission("audit_logs:view") ? ROUTES.admin.auditLogs : undefined}
      />
    </div>
  );
}
