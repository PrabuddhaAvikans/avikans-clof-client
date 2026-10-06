import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  AlertTriangle,
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
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { manufacturingActions } from "@/features/manufacturing/store/manufacturingSlice";
import { productionTrackingActions } from "@/features/manufacturing/store/productionTrackingSlice";
import { DayProductionPanel } from "@/features/end-of-day-management/components/DayProductionPanel";
import { EmployeeDayClosePanel } from "@/features/end-of-day-management/components/EmployeeDayClosePanel";
import { PeriodStatusBadge } from "@/features/end-of-day-management/components/PeriodStatusBadge";
import { ReopenPeriodDialog } from "@/features/end-of-day-management/components/ReopenPeriodDialog";
import { ValidationIssueList } from "@/features/end-of-day-management/components/ValidationIssueList";
import {
  useCloseDay,
  useCurrentDayClose,
  useDayCloseWorkspace,
  useReopenDay,
  useRunDayValidation,
} from "@/features/end-of-day-management/hooks/useEndOfDayManagement";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatWorkedDuration } from "@/lib/employee-work";
import { PeriodStatus, WorkerSessionCloseRule } from "@/types/end-of-day-management";

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

  const validations = workspace?.validations ?? [];
  const incompleteCount = workspace?.incompleteEmployeeCount ?? 0;

  const blockingCount = useMemo(
    () => validations.filter((item) => item.isBlocking).length,
    [validations],
  );

  const hardBlockingCount = useMemo(
    () =>
      validations.filter(
        (item) =>
          item.isBlocking &&
          item.validationCode !== "ACTIVE_SESSIONS_NEED_CONFIRM" &&
          item.validationCode !== "EMPLOYEE_HOURS_NEED_EXCEPTION" &&
          item.validationCode !== "EMPLOYEE_OT_NEED_APPROVAL",
      ).length,
    [validations],
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
      toast.error("Failed to run Day-End Closing validation");
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
        `Day ${formatDate(result.period.businessDate)} closed. Next day ${formatDate(result.nextPeriod.businessDate)} is open.`,
      );
      setConfirmCloseOpen(false);
      setSupervisorConfirmed(false);
      setIncompleteHoursExceptionConfirmed(false);
      setOvertimeApproved(false);
      dispatch(manufacturingActions.invalidateAll());
      dispatch(productionTrackingActions.invalidateAll());
      navigate(ROUTES.endOfDayManagement.day);
      await currentQuery.refetch();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Day-End Closing failed";
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
      toast.success(`${formatDate(period.businessDate)} reopened`);
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

  const displayDate = period ? formatDate(period.businessDate, "MMM d, yyyy") : "";

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Day-End Closing"
        description="Close the business day when employees complete required hours. Unfinished jobs pause and continue tomorrow."
        breadcrumbs={[
          { label: "End-of-Day Management" },
          { label: "Day-End Closing" },
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {displayDate}
              </span>
              <PeriodStatusBadge status={period.status} />
              {blockingCount > 0 ? (
                <StatusBadge variant="danger" size="sm" dot>
                  {blockingCount} blocker{blockingCount === 1 ? "" : "s"}
                </StatusBadge>
              ) : isOpenLike ? (
                <StatusBadge variant="success" size="sm" dot>
                  Ready to close
                </StatusBadge>
              ) : null}
              <Link
                to={ROUTES.endOfDayManagement.month}
                className="ml-auto text-sm font-medium text-foreground underline-offset-2 hover:underline"
              >
                Month-End Closing
              </Link>
            </div>

            {(blockingCount > 0 || incompleteCount > 0) && isOpenLike && (
              <div className="flex flex-wrap gap-2">
                {blockingCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {blockingCount} issue{blockingCount === 1 ? "" : "s"} must be cleared before close
                  </div>
                )}
                {incompleteCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {incompleteCount} employee{incompleteCount === 1 ? "" : "s"} under required hours
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Employee hours"
                value={`${completedEmployees}/${workspace.employeeDaySummaries?.length ?? 0}`}
                description={
                  incompleteCount > 0
                    ? `${incompleteCount} under ${Math.round(workspace.requiredDailyWorkMinutes / 60)}h`
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
                description={blockingCount > 0 ? "Must clear before close" : "None"}
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            </div>

            <Tabs value={tab} onChange={setTab}>
              <TabList>
                <Tab value="employees">
                  Employees
                  {incompleteCount > 0 ? ` (${incompleteCount})` : ""}
                </Tab>
                <Tab value="production">Production</Tab>
                <Tab value="validation">
                  Validation{blockingCount > 0 ? ` (${blockingCount})` : ""}
                </Tab>
              </TabList>

              <TabPanel value="employees" className="pt-4">
                <EmployeeDayClosePanel
                  summaries={workspace.employeeDaySummaries ?? []}
                  requiredMinutes={workspace.requiredDailyWorkMinutes}
                />
              </TabPanel>

              <TabPanel value="production" className="pt-4">
                <DayProductionPanel
                  snapshots={workspace.productionSnapshots ?? []}
                  isOpenDay={isOpenLike}
                  activeSessionCount={workspace.activeSessionCount ?? 0}
                />
              </TabPanel>

              <TabPanel value="validation" className="pt-4">
                <ValidationIssueList
                  issues={validations}
                  emptyMessage="No blockers. You can close the day."
                />
              </TabPanel>
            </Tabs>
          </div>
        )}
      </PageContent>

      <ConfirmationDialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={() => void handleClose()}
        title={`Close ${displayDate || "this day"}?`}
        description="Pauses unfinished work and opens the next business date. Jobs are not force-completed."
        confirmLabel="Close day"
        loading={closeDay.isPending}
      >
        <div className="mt-3 space-y-3">
          {needsSupervisorConfirm && (
            <Checkbox
              checked={supervisorConfirmed}
              onChange={(event) => setSupervisorConfirmed(event.target.checked)}
              label="Confirm active sessions may be paused"
            />
          )}
          {workspace?.allowIncompleteEmployeeHoursException && incompleteCount > 0 && (
            <Checkbox
              checked={incompleteHoursExceptionConfirmed}
              onChange={(event) =>
                setIncompleteHoursExceptionConfirmed(event.target.checked)
              }
              label={`Exception: close with ${incompleteCount} incomplete employee day${incompleteCount === 1 ? "" : "s"}`}
            />
          )}
          {workspace?.requireOvertimeApproval &&
            (workspace.totalOvertimeMinutes ?? 0) > 0 && (
              <Checkbox
                checked={overtimeApproved}
                onChange={(event) => setOvertimeApproved(event.target.checked)}
                label={`Approve overtime ${formatWorkedDuration(workspace.totalOvertimeMinutes)} for ${workspace.overtimeEmployeeCount} employee${workspace.overtimeEmployeeCount === 1 ? "" : "s"}`}
              />
            )}
          {blockingCount > 0 ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {blockingCount} blocking issue(s) must be fixed first.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Ready to close.
            </p>
          )}
        </div>
      </ConfirmationDialog>

      <ReopenPeriodDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={(reason) => void handleReopen(reason)}
        loading={reopenDay.isPending}
        title={`Reopen ${displayDate || "day"}?`}
        description="Authorized reopen only. Original close stays in the audit trail."
        originalClosedBy={period?.originalClosedByName}
        originalClosedAt={
          period?.originalClosedAt ? formatDateTime(period.originalClosedAt) : undefined
        }
      />
    </PageContainer>
  );
}
