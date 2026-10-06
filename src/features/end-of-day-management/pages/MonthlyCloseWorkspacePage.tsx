import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Factory,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { PeriodStatusBadge } from "@/features/end-of-day-management/components/PeriodStatusBadge";
import { ReopenPeriodDialog } from "@/features/end-of-day-management/components/ReopenPeriodDialog";
import { ValidationIssueList } from "@/features/end-of-day-management/components/ValidationIssueList";
import {
  useCloseMonth,
  useCurrentMonthClose,
  useMonthCloseWorkspace,
  useReopenMonth,
  useRunMonthValidation,
} from "@/features/end-of-day-management/hooks/useEndOfDayManagement";
import { formatMonthLabel } from "@/features/end-of-day-management/lib/periodLabels";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { PeriodStatus } from "@/types/end-of-day-management";

export function MonthlyCloseWorkspacePage() {
  const { periodId } = useParams<{ periodId?: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const currentQuery = useCurrentMonthClose();
  const detailQuery = useMonthCloseWorkspace(periodId ?? "");
  const workspace = periodId ? detailQuery.data : currentQuery.data;
  const isLoading = periodId ? detailQuery.isLoading : currentQuery.isLoading;
  const error = periodId ? detailQuery.error : currentQuery.error;
  const refetch = periodId ? detailQuery.refetch : currentQuery.refetch;

  const runValidation = useRunMonthValidation();
  const closeMonth = useCloseMonth();
  const reopenMonth = useReopenMonth();

  const [tab, setTab] = useState("validation");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const canClose = hasPermission("period_close:approve");
  const canReopen = hasPermission("period_close:edit");

  const period = workspace?.period;
  const summary = workspace?.summary;
  const monthLabel = period ? formatMonthLabel(period.year, period.month) : "";
  const isOpenLike =
    period?.status === PeriodStatus.open || period?.status === PeriodStatus.reopened;

  const validations = workspace?.validations ?? [];
  const dayPeriods = workspace?.dayPeriods ?? [];
  const productionSnapshots = workspace?.productionSnapshots ?? [];

  const blockingCount = useMemo(
    () => validations.filter((item) => item.isBlocking).length,
    [validations],
  );

  const handleValidate = async () => {
    if (!period) return;
    try {
      await runValidation.mutateAsync(period.id);
      toast.success("Month-End Closing validation completed");
      setTab("validation");
    } catch {
      toast.error("Failed to run Month-End Closing validation");
    }
  };

  const handleClose = async () => {
    if (!period) return;
    try {
      const result = await closeMonth.mutateAsync(period.id);
      toast.success(
        `Closed ${formatMonthLabel(result.period.year, result.period.month)}. Opened ${formatMonthLabel(result.nextPeriod.year, result.nextPeriod.month)}.`,
      );
      setConfirmCloseOpen(false);
      navigate(ROUTES.endOfDayManagement.month);
      await currentQuery.refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Month-End Closing failed";
      toast.error(message);
      setConfirmCloseOpen(false);
      setTab("validation");
      await refetch();
    }
  };

  const handleReopen = async (reason: string) => {
    if (!period) return;
    try {
      await reopenMonth.mutateAsync({ id: period.id, input: { reason } });
      toast.success(`${monthLabel} reopened`);
      setReopenOpen(false);
      await refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to reopen month";
      toast.error(message);
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Month-End Closing"
        description="Lock the month after required day closures. Open production continues into the next month."
        breadcrumbs={[
          { label: "End-of-Day Management" },
          { label: "Month-End Closing" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Factory className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.manufacturing.jobs)}
            >
              Production Jobs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            {period && isOpenLike && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleValidate()}
                loading={runValidation.isPending}
              >
                Validate
              </Button>
            )}
            {period && isOpenLike && canClose && (
              <Button
                size="sm"
                leftIcon={<Lock className="h-4 w-4" />}
                onClick={() => setConfirmCloseOpen(true)}
                disabled={blockingCount > 0 || workspace?.canClose === false}
              >
                Close month
              </Button>
            )}
            {period?.status === PeriodStatus.closed && canReopen && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setReopenOpen(true)}
              >
                Reopen
              </Button>
            )}
          </>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error?.message ?? null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        {!workspace || !period ? null : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
              <PeriodStatusBadge status={period.status} />
              {blockingCount > 0 ? (
                <StatusBadge variant="danger" size="sm" dot>
                  {blockingCount} blocker{blockingCount === 1 ? "" : "s"}
                </StatusBadge>
              ) : isOpenLike && workspace?.canClose ? (
                <StatusBadge variant="success" size="sm" dot>
                  Ready to close
                </StatusBadge>
              ) : null}
              <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Days closed {workspace.closedDayCount} · Remaining {workspace.openDayCount}
                </span>
                <Link
                  to={ROUTES.endOfDayManagement.day}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Day-End Closing
                </Link>
              </div>
            </div>

            {(blockingCount > 0 || (workspace.openDayCount ?? 0) > 0) && isOpenLike && (
              <div className="flex flex-wrap gap-2">
                {blockingCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {blockingCount} issue{blockingCount === 1 ? "" : "s"} must be cleared before close
                  </div>
                )}
                {(workspace.openDayCount ?? 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {workspace.openDayCount} business day
                    {workspace.openDayCount === 1 ? "" : "s"} still open
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <SummaryCard
                title="Sales"
                value={summary ? formatCurrency(summary.salesTotal) : "—"}
                description="Month total"
                icon={<Wallet className="h-4 w-4" />}
              />
              <SummaryCard
                title="COGS"
                value={summary ? formatCurrency(summary.costOfGoodsSold) : "—"}
                description="Cost of goods"
              />
              <SummaryCard
                title="WIP value"
                value={summary ? formatCurrency(summary.wipValue) : "—"}
                description="Open production"
                icon={<Factory className="h-4 w-4" />}
              />
              <SummaryCard
                title="Inventory value"
                value={summary ? formatCurrency(summary.inventoryValue) : "—"}
                description="Closing stock"
                icon={<Package className="h-4 w-4" />}
              />
              <SummaryCard
                title="Days closed"
                value={workspace.closedDayCount}
                description={`${workspace.openDayCount} remaining`}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SummaryCard
                title="Gross profit"
                value={summary ? formatCurrency(summary.grossProfit) : "—"}
                description={summary ? `Net ${formatCurrency(summary.netMargin)}` : undefined}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
            </div>

            <Tabs value={tab} onChange={setTab}>
              <TabList>
                <Tab value="validation">
                  Validation{blockingCount > 0 ? ` (${blockingCount})` : ""}
                </Tab>
                <Tab value="days">Day closures</Tab>
                <Tab value="production">WIP / Production</Tab>
              </TabList>

              <TabPanel value="validation" className="pt-4">
                <ValidationIssueList
                  issues={validations}
                  emptyMessage="No monthly validation issues. Month is ready to close."
                />
              </TabPanel>

              <TabPanel value="days" className="pt-4">
                <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Business date</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Closed by</th>
                        <th className="px-3 py-2.5 font-medium">Closed at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dayPeriods
                        .slice()
                        .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
                        .map((day) => (
                          <tr key={day.id}>
                            <td className="px-3 py-2.5">
                              <Link
                                to={ROUTES.endOfDayManagement.dayDetail(day.id)}
                                className="font-medium tabular-nums underline-offset-2 hover:underline"
                              >
                                {day.businessDate}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5">
                              <PeriodStatusBadge status={day.status} />
                            </td>
                            <td className="px-3 py-2.5">{day.closedByName ?? "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {day.closedAt ? formatDateTime(day.closedAt) : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </TabPanel>

              <TabPanel value="production" className="pt-4">
                {productionSnapshots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No open manufacturing WIP to snapshot.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {isOpenLike && (
                      <p className="text-sm text-muted-foreground">
                        Live WIP from Manufacturing. Month-End Closing stores this without forcing
                        jobs to complete.
                      </p>
                    )}
                    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2.5 font-medium">Job</th>
                            <th className="px-3 py-2.5 font-medium">Operation</th>
                            <th className="px-3 py-2.5 font-medium">Progress</th>
                            <th className="px-3 py-2.5 font-medium">WIP qty</th>
                            <th className="px-3 py-2.5 font-medium">Material</th>
                            <th className="px-3 py-2.5 font-medium">Labour hrs</th>
                            <th className="px-3 py-2.5 font-medium">WIP cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {productionSnapshots.map((snap) => (
                            <tr key={snap.id}>
                              <td className="px-3 py-2.5">
                                <Link
                                  to={ROUTES.manufacturing.jobDetail(snap.productionOrderId)}
                                  className="font-medium tabular-nums underline-offset-2 hover:underline"
                                >
                                  {snap.productionOrderNumber}
                                </Link>
                              </td>
                              <td className="px-3 py-2.5">{snap.operationName}</td>
                              <td className="px-3 py-2.5 tabular-nums">
                                {formatPercent(snap.progressPercentage)}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                {snap.workInProgressQty}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                {formatNumber(snap.materialConsumed)}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                {formatNumber(snap.laborHours)}
                              </td>
                              <td className="px-3 py-2.5 font-medium tabular-nums">
                                {formatCurrency(snap.wipCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabPanel>
            </Tabs>
          </div>
        )}
      </PageContent>

      <ConfirmationDialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={() => void handleClose()}
        title={`Close ${monthLabel}?`}
        description="Locks the month for normal posting, stores month-end snapshots, and opens the next month. Production progress continues."
        confirmLabel="Close month"
        loading={closeMonth.isPending}
      >
        {blockingCount > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {blockingCount} blocking issue(s) must be fixed first.
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            No blocking validation issues.
          </p>
        )}
      </ConfirmationDialog>

      <ReopenPeriodDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={(reason) => void handleReopen(reason)}
        loading={reopenMonth.isPending}
        title={`Reopen ${monthLabel}?`}
        description="Exceptional authorized reopen. Prefer posting adjustments in the current open period."
        originalClosedBy={period?.originalClosedByName}
        originalClosedAt={
          period?.originalClosedAt ? formatDateTime(period.originalClosedAt) : undefined
        }
      />
    </PageContainer>
  );
}
