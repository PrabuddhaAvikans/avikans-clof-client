import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
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
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { PeriodStatusBadge } from "@/features/period-close/components/PeriodStatusBadge";
import { ReopenPeriodDialog } from "@/features/period-close/components/ReopenPeriodDialog";
import { ValidationIssueList } from "@/features/period-close/components/ValidationIssueList";
import {
  useCloseMonth,
  useCurrentMonthClose,
  useMonthCloseWorkspace,
  useReopenMonth,
  useRunMonthValidation,
} from "@/features/period-close/hooks/usePeriodClose";
import { formatMonthLabel } from "@/features/period-close/lib/periodLabels";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import {
  workspacePanelBody,
  workspacePanelShell,
} from "@/lib/panelLayout";
import { PeriodStatus } from "@/types/period-close";

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

  const blockingCount = useMemo(
    () => workspace?.validations.filter((item) => item.isBlocking).length ?? 0,
    [workspace?.validations],
  );

  const handleValidate = async () => {
    if (!period) return;
    try {
      await runValidation.mutateAsync(period.id);
      toast.success("Monthly Close validation completed");
      setTab("validation");
    } catch {
      toast.error("Failed to run Monthly Close validation");
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
      navigate(ROUTES.periodClose.month);
      await currentQuery.refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Monthly Close failed";
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
        title="Monthly Close"
        description="Lock the month after required day closures. WIP comes from live Manufacturing — open production continues into the next month."
        breadcrumbs={[
          { label: "Period Close" },
          { label: "Monthly Close" },
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
                Run validation
              </Button>
            )}
            {period && isOpenLike && canClose && (
              <Button
                size="sm"
                leftIcon={<Lock className="h-4 w-4" />}
                onClick={() => setConfirmCloseOpen(true)}
                disabled={blockingCount > 0}
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
                Reopen month
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
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
              <div>
                <p className="text-xs text-muted-foreground">Accounting period</p>
                <p className="text-lg font-semibold tracking-tight">{monthLabel}</p>
              </div>
              <PeriodStatusBadge status={period.status} />
              {blockingCount > 0 ? (
                <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                  {blockingCount} blocking issue{blockingCount === 1 ? "" : "s"}
                </span>
              ) : isOpenLike ? (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Ready to close
                </span>
              ) : null}
              <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Days closed {workspace.closedDayCount} · Remaining {workspace.openDayCount}
                </span>
                <span>Opened by {period.openedByName}</span>
                {period.closedByName && period.closedAt && (
                  <span>
                    Closed by {period.closedByName} · {formatDateTime(period.closedAt)}
                  </span>
                )}
                <Link
                  to={ROUTES.periodClose.day}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Day Close
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-card p-4 shadow-xs">
                <h3 className="text-sm font-semibold">Monthly financial summary</h3>
                {summary ? (
                  <dl className="mt-3 space-y-2 text-sm">
                    <Row label="Sales" value={formatCurrency(summary.salesTotal)} />
                    <Row label="Purchases" value={formatCurrency(summary.purchaseTotal)} />
                    <Row label="Payments" value={formatCurrency(summary.paymentTotal)} />
                    <Row label="Credit notes" value={formatCurrency(summary.creditNotes)} />
                    <Row label="Expenses" value={formatCurrency(summary.expenseTotal)} />
                    <Row
                      label="Gross profit"
                      value={formatCurrency(summary.grossProfit)}
                      strong
                    />
                    <Row
                      label="Net margin"
                      value={formatCurrency(summary.netMargin)}
                      strong
                    />
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Summaries are generated at Monthly Close from transaction references.
                  </p>
                )}
              </section>
              <section className="rounded-lg border border-border bg-card p-4 shadow-xs">
                <h3 className="text-sm font-semibold">Closing rules</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>All required business days must normally be closed first.</li>
                  <li>In-progress production is a warning, never a block.</li>
                  <li>Corrections after close should use adjustments in the open period.</li>
                  <li>Closed months reject new transactions with that business date.</li>
                </ul>
              </section>
            </div>

            <div className={workspacePanelShell}>
              <Tabs value={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border px-2">
                  <TabList className="border-b-0">
                    <Tab value="validation">
                      Validation{blockingCount > 0 ? ` (${blockingCount})` : ""}
                    </Tab>
                    <Tab value="days">Day closures</Tab>
                    <Tab value="production">WIP / Production</Tab>
                  </TabList>
                </div>

                <TabPanel value="validation" className={workspacePanelBody}>
                  <ValidationIssueList
                    issues={workspace.validations}
                    emptyMessage="No monthly validation issues. Month is ready to close."
                  />
                </TabPanel>

                <TabPanel value="days" className={workspacePanelBody}>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Business date</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Closed by</th>
                          <th className="px-3 py-2 font-medium">Closed at</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {workspace.dayPeriods
                          .slice()
                          .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
                          .map((day) => (
                            <tr key={day.id}>
                              <td className="px-3 py-2">
                                <Link
                                  to={ROUTES.periodClose.dayDetail(day.id)}
                                  className="font-medium tabular-nums underline-offset-2 hover:underline"
                                >
                                  {day.businessDate}
                                </Link>
                              </td>
                              <td className="px-3 py-2">
                                <PeriodStatusBadge status={day.status} />
                              </td>
                              <td className="px-3 py-2">{day.closedByName ?? "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {day.closedAt ? formatDateTime(day.closedAt) : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </TabPanel>

                <TabPanel value="production" className={workspacePanelBody}>
                  {workspace.productionSnapshots.length === 0 ? (
                    <EmptySnap message="No open manufacturing WIP to snapshot. Active Production jobs appear here at month end." />
                  ) : (
                    <div className="space-y-3">
                      {isOpenLike && (
                        <p className="text-sm text-muted-foreground">
                          Live WIP from Manufacturing. Monthly Close stores this without forcing
                          jobs to complete. WIP cost uses cost-to-date (materials + labour).
                        </p>
                      )}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full text-left text-sm">
                          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 font-medium">Job</th>
                              <th className="px-3 py-2 font-medium">Operation</th>
                              <th className="px-3 py-2 font-medium">Progress</th>
                              <th className="px-3 py-2 font-medium">WIP qty</th>
                              <th className="px-3 py-2 font-medium">Material</th>
                              <th className="px-3 py-2 font-medium">Labour hrs</th>
                              <th className="px-3 py-2 font-medium">WIP cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {workspace.productionSnapshots.map((snap) => (
                              <tr key={snap.id}>
                                <td className="px-3 py-2">
                                  <Link
                                    to={ROUTES.manufacturing.jobDetail(snap.productionOrderId)}
                                    className="font-medium tabular-nums underline-offset-2 hover:underline"
                                  >
                                    {snap.productionOrderNumber}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">{snap.operationName}</td>
                                <td className="px-3 py-2 tabular-nums">
                                  {formatPercent(snap.progressPercentage)}
                                </td>
                                <td className="px-3 py-2 tabular-nums">{snap.workInProgressQty}</td>
                                <td className="px-3 py-2 tabular-nums">
                                  {formatNumber(snap.materialConsumed)}
                                </td>
                                <td className="px-3 py-2 tabular-nums">
                                  {formatNumber(snap.laborHours)}
                                </td>
                                <td className="px-3 py-2 font-medium tabular-nums">
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
          </div>
        )}
      </PageContent>

      <ConfirmationDialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={() => void handleClose()}
        title={`Close ${monthLabel}?`}
        description="Locks the month for normal posting, stores month-end snapshots, and opens the next month. Production progress continues; corrections should use adjustments."
        confirmLabel="Close month"
        loading={closeMonth.isPending}
      >
        {blockingCount > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
            <ShieldAlert className="h-4 w-4" />
            {blockingCount} blocking issue(s) must be fixed first.
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
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
        description="Exceptional authorized reopen. Prefer posting adjustments in the current open period. Day reopen may still be required for dated corrections."
        originalClosedBy={period?.originalClosedByName}
        originalClosedAt={
          period?.originalClosedAt ? formatDateTime(period.originalClosedAt) : undefined
        }
      />
    </PageContainer>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

function EmptySnap({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
