import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  CheckCircle2,
  Clock3,
  Factory,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRound,
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
import { manufacturingActions } from "@/features/manufacturing/store/manufacturingSlice";
import { productionTrackingActions } from "@/features/manufacturing/store/productionTrackingSlice";
import { DayProductionPanel } from "@/features/period-close/components/DayProductionPanel";
import { EmployeeDayClosePanel } from "@/features/period-close/components/EmployeeDayClosePanel";
import { PeriodStatusBadge } from "@/features/period-close/components/PeriodStatusBadge";
import { ReopenPeriodDialog } from "@/features/period-close/components/ReopenPeriodDialog";
import { ValidationIssueList } from "@/features/period-close/components/ValidationIssueList";
import {
  useCloseDay,
  useCurrentDayClose,
  useDayCloseWorkspace,
  useReopenDay,
  useRunDayValidation,
} from "@/features/period-close/hooks/usePeriodClose";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/format";
import { formatWorkedDuration } from "@/lib/employee-work";
import {
  workspacePanelBody,
  workspacePanelShell,
} from "@/lib/panelLayout";
import { PeriodStatus, WorkerSessionCloseRule } from "@/types/period-close";

export function DayCloseWorkspacePage() {
  const { periodId } = useParams<{ periodId?: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { hasPermission } = usePermissions();

  const currentQuery = useCurrentDayClose();
  const detailQuery = useDayCloseWorkspace(periodId ?? "");
  const workspace = periodId ? detailQuery.data : currentQuery.data;
  const isLoading = periodId ? detailQuery.isLoading : currentQuery.isLoading;
  const error = periodId ? detailQuery.error : currentQuery.error;
  const refetch = periodId ? detailQuery.refetch : currentQuery.refetch;

  const runValidation = useRunDayValidation();
  const closeDay = useCloseDay();
  const reopenDay = useReopenDay();

  const [tab, setTab] = useState("employees");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [supervisorConfirmed, setSupervisorConfirmed] = useState(false);
  const [incompleteHoursExceptionConfirmed, setIncompleteHoursExceptionConfirmed] =
    useState(false);
  const [overtimeApproved, setOvertimeApproved] = useState(false);

  const canClose = hasPermission("period_close:approve");
  const canReopen = hasPermission("period_close:edit");

  const period = workspace?.period;
  const summary = workspace?.summary;
  const isOpenLike =
    period?.status === PeriodStatus.open || period?.status === PeriodStatus.reopened;
  const needsSupervisorConfirm =
    workspace?.workerSessionRule === WorkerSessionCloseRule.require_supervisor_confirm &&
    (workspace.activeSessionCount ?? 0) > 0;

  const blockingCount = useMemo(
    () => workspace?.validations.filter((item) => item.isBlocking).length ?? 0,
    [workspace?.validations],
  );

  const hardBlockingCount = useMemo(
    () =>
      workspace?.validations.filter(
        (item) =>
          item.isBlocking &&
          item.validationCode !== "ACTIVE_SESSIONS_NEED_CONFIRM" &&
          item.validationCode !== "EMPLOYEE_HOURS_NEED_EXCEPTION" &&
          item.validationCode !== "EMPLOYEE_OT_NEED_APPROVAL",
      ).length ?? 0,
    [workspace?.validations],
  );

  const completedEmployees = useMemo(
    () =>
      workspace?.employeeDaySummaries?.filter((item) => item.canClose).length ?? 0,
    [workspace?.employeeDaySummaries],
  );

  useEffect(() => {
    const onFocus = () => {
      if (isOpenLike) refetch();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isOpenLike, refetch]);

  const handleValidate = async () => {
    if (!period) return;
    try {
      await runValidation.mutateAsync(period.id);
      toast.success("Validation completed");
      setTab("validation");
    } catch {
      toast.error("Failed to run Day Close validation");
    }
  };

  const handleClose = async () => {
    if (!period) return;
    try {
      const result = await closeDay.mutateAsync({
        id: period.id,
        options: {
          supervisorConfirmed,
          incompleteHoursExceptionConfirmed,
          overtimeApproved,
        },
      });
      toast.success(
        `Day ${result.period.businessDate} closed. Next day ${result.nextPeriod.businessDate} is open.`,
      );
      setConfirmCloseOpen(false);
      setSupervisorConfirmed(false);
      setIncompleteHoursExceptionConfirmed(false);
      setOvertimeApproved(false);
      dispatch(manufacturingActions.invalidateAll());
      dispatch(productionTrackingActions.invalidateAll());
      navigate(ROUTES.periodClose.day);
      await currentQuery.refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Day Close failed";
      toast.error(message);
      setConfirmCloseOpen(false);
      setTab("validation");
      await refetch();
    }
  };

  const handleReopen = async (reason: string) => {
    if (!period) return;
    try {
      await reopenDay.mutateAsync({ id: period.id, input: { reason } });
      toast.success(`${period.businessDate} reopened`);
      setReopenOpen(false);
      await refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to reopen day";
      toast.error(message);
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Day Close"
        description="Close the business day when employees complete required hours. Unfinished jobs pause and continue tomorrow."
        breadcrumbs={[
          { label: "Period Close" },
          { label: "Day Close" },
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
                disabled={hardBlockingCount > 0}
              >
                Close day
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
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
              <div>
                <p className="text-xs text-muted-foreground">Business date</p>
                <p className="text-lg font-semibold tabular-nums tracking-tight">
                  {period.businessDate}
                </p>
              </div>
              <PeriodStatusBadge status={period.status} />
              {blockingCount > 0 ? (
                <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                  {blockingCount} blocker{blockingCount === 1 ? "" : "s"}
                </span>
              ) : isOpenLike ? (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                  Ready to close
                </span>
              ) : null}
              <Link
                to={ROUTES.periodClose.month}
                className="ml-auto text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Monthly Close
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Employee hours"
                value={`${completedEmployees}/${workspace.employeeDaySummaries?.length ?? 0}`}
                description={
                  (workspace.incompleteEmployeeCount ?? 0) > 0
                    ? `${workspace.incompleteEmployeeCount} under ${Math.round(workspace.requiredDailyWorkMinutes / 60)}h`
                    : `${Math.round(workspace.requiredDailyWorkMinutes / 60)}h required`
                }
                icon={<UserRound className="h-4 w-4" />}
              />
              <SummaryCard
                title="Overtime"
                value={formatWorkedDuration(workspace.totalOvertimeMinutes ?? 0)}
                description={
                  (workspace.overtimeEmployeeCount ?? 0) > 0
                    ? `${workspace.overtimeEmployeeCount} employee${workspace.overtimeEmployeeCount === 1 ? "" : "s"}`
                    : "None today"
                }
                icon={<Clock3 className="h-4 w-4" />}
              />
              <SummaryCard
                title="Production"
                value={summary?.productionJobs ?? "—"}
                description={
                  summary
                    ? `${summary.completedProductionQty} done · ${summary.partialProductionQty} partial`
                    : "Jobs today"
                }
                icon={<Factory className="h-4 w-4" />}
              />
              <SummaryCard
                title="Blockers"
                value={blockingCount}
                description={
                  blockingCount > 0 ? "Must clear before close" : "None"
                }
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            </div>

            <div className={workspacePanelShell}>
              <Tabs value={tab} onChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-border px-2">
                  <TabList className="border-b-0">
                    <Tab value="employees">
                      Employees
                      {(workspace.incompleteEmployeeCount ?? 0) > 0
                        ? ` (${workspace.incompleteEmployeeCount})`
                        : ""}
                    </Tab>
                    <Tab value="production">Production</Tab>
                    <Tab value="validation">
                      Validation{blockingCount > 0 ? ` (${blockingCount})` : ""}
                    </Tab>
                  </TabList>
                </div>

                <TabPanel value="employees" className={workspacePanelBody}>
                  <EmployeeDayClosePanel
                    summaries={workspace.employeeDaySummaries ?? []}
                    requiredMinutes={workspace.requiredDailyWorkMinutes}
                  />
                </TabPanel>

                <TabPanel value="production" className={workspacePanelBody}>
                  <DayProductionPanel
                    snapshots={workspace.productionSnapshots}
                    isOpenDay={isOpenLike}
                    activeSessionCount={workspace.activeSessionCount}
                  />
                </TabPanel>

                <TabPanel value="validation" className={workspacePanelBody}>
                  <ValidationIssueList
                    issues={workspace.validations}
                    emptyMessage="No blockers. You can close the day."
                  />
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
        title={`Close ${period?.businessDate ?? "this day"}?`}
        description="Pauses unfinished work and opens the next business date. Jobs are not force-completed."
        confirmLabel="Close day"
        loading={closeDay.isPending}
      >
        {needsSupervisorConfirm && (
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={supervisorConfirmed}
              onChange={(event) => setSupervisorConfirmed(event.target.checked)}
            />
            <span>Confirm active sessions may be paused.</span>
          </label>
        )}
        {workspace?.allowIncompleteEmployeeHoursException &&
          (workspace.incompleteEmployeeCount ?? 0) > 0 && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={incompleteHoursExceptionConfirmed}
                onChange={(event) =>
                  setIncompleteHoursExceptionConfirmed(event.target.checked)
                }
              />
              <span>
                Exception: close with {workspace.incompleteEmployeeCount}{" "}
                incomplete employee day
                {workspace.incompleteEmployeeCount === 1 ? "" : "s"}.
              </span>
            </label>
          )}
        {workspace?.requireOvertimeApproval &&
          (workspace.totalOvertimeMinutes ?? 0) > 0 && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={overtimeApproved}
                onChange={(event) => setOvertimeApproved(event.target.checked)}
              />
              <span>
                Approve overtime{" "}
                {formatWorkedDuration(workspace.totalOvertimeMinutes)} for{" "}
                {workspace.overtimeEmployeeCount} employee
                {workspace.overtimeEmployeeCount === 1 ? "" : "s"}.
              </span>
            </label>
          )}
        {blockingCount > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
            <ShieldAlert className="h-4 w-4" />
            {blockingCount} blocking issue(s) must be fixed first.
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Ready to close.
          </p>
        )}
      </ConfirmationDialog>

      <ReopenPeriodDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={(reason) => void handleReopen(reason)}
        loading={reopenDay.isPending}
        title={`Reopen ${period?.businessDate ?? "day"}?`}
        description="Authorized reopen only. Original close stays in the audit trail."
        originalClosedBy={period?.originalClosedByName}
        originalClosedAt={
          period?.originalClosedAt ? formatDateTime(period.originalClosedAt) : undefined
        }
      />
    </PageContainer>
  );
}
