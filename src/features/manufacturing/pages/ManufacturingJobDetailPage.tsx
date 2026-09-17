import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityLog } from "@/components/ui/ActivityLog";
import { AttachmentPanel } from "@/components/ui/AttachmentPanel";
import { Button } from "@/components/ui/Button";
import { NotesPanel } from "@/components/ui/NotesPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import {
  TaskActionDialogs,
  type TaskDialogMode,
} from "@/features/manufacturing/components/TaskActionDialogs";
import { CompleteJobDialog } from "@/features/manufacturing/components/CompleteJobDialog";
import {
  useCompleteManufacturingJob,
  useManufacturingJob,
  useManufacturingTaskAction,
  useStartManufacturingJob,
} from "@/features/manufacturing/hooks/useManufacturing";
import { useUsers } from "@/features/admin/hooks/useUsers";
import {
  areMaterialsReady,
  calculateJobProgress,
  isJobDelayed,
  taskQuantityLabel,
} from "@/features/manufacturing/utils/jobUtils";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  allowedTaskActions,
  calculateJobLaborBreakdown,
  calculateTaskLaborCost,
  formatDurationHours,
  isProductionJobCompletable,
} from "@/lib/manufacturingTasks";
import type { ManufacturingTask, ManufacturingTaskAction } from "@/types/manufacturing";
import { ManufacturingJobStatus, ManufacturingTaskStatus, Priority } from "@/types/status";

export function ManufacturingJobDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: job, isLoading, error, refetch } = useManufacturingJob(id);
  const startJob = useStartManufacturingJob();
  const completeJob = useCompleteManufacturingJob();
  const taskAction = useManufacturingTaskAction();
  const { data: usersData } = useUsers({ page: 1, pageSize: 50 });

  const [activeTab, setActiveTab] = useState("tasks");
  const [dialogTask, setDialogTask] = useState<ManufacturingTask | null>(null);
  const [dialogMode, setDialogMode] = useState<TaskDialogMode>(null);
  const [completeOpen, setCompleteOpen] = useState(false);

  const progress = job ? calculateJobProgress(job) : 0;
  const materialsReady = job ? areMaterialsReady(job) : false;
  const delayed = job ? isJobDelayed(job) : false;
  const canComplete = job ? isProductionJobCompletable(job) : false;
  const labor = job ? calculateJobLaborBreakdown(job) : null;

  const activityEntries = useMemo(() => {
    if (!job) return [];
    return job.tasks
      .flatMap((task) =>
        task.history.map((entry) => ({
          id: entry.id,
          user: entry.userName,
          action: `${task.taskNumber} ${task.name}: ${entry.action.replace(/_/g, " ")}`,
          timestamp: formatDateTime(entry.occurredAt),
          comment: entry.comments,
        })),
      )
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [job]);

  const openDialog = (task: ManufacturingTask, mode: TaskDialogMode) => {
    setDialogTask(task);
    setDialogMode(mode);
  };

  const runAction = async (action: ManufacturingTaskAction, successMessage: string) => {
    if (!job) return;
    try {
      await taskAction.mutateAsync({ id: job.id, action });
      toast.success(successMessage);
      setDialogMode(null);
      setDialogTask(null);
      void refetch();
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update task";
      toast.error(message);
    }
  };

  const handleQuickAction = async (
    task: ManufacturingTask,
    type: "pause" | "skip" | "block" | "resume",
  ) => {
    await runAction(
      { type, taskId: task.id },
      `Task "${task.name}" updated`,
    );
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={job ? `${job.productName} - ${job.jobNumber}` : "Production Job"}
        description={
          job
            ? `${job.productSku} · ${job.productVersionLabel} · ${job.customerName}`
            : undefined
        }
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Production Jobs", href: ROUTES.manufacturing.jobs },
          { label: job?.jobNumber ?? "Details" },
        ]}
        actions={
          <Link to={ROUTES.manufacturing.jobs}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load job details" : null}
        onRetry={() => void refetch()}
      >
        {job && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8">
              <SummaryCard title="Quantity" value={String(job.quantity)} />
              <SummaryCard title="Overall Status" value={statusLabel(ManufacturingJobStatus, job.status)} />
              <SummaryCard title="Progress" value={`${progress}%`} />
              <SummaryCard title="Estimated Cost" value={formatCurrency(job.estimatedCost)} />
              <SummaryCard title="Actual Cost" value={formatCurrency(job.actualCost)} />
              <SummaryCard title="Labour Cost" value={formatCurrency(labor?.laborCost ?? 0)} />
              <SummaryCard
                title="Overtime"
                value={labor && labor.overtimeHours > 0 ? formatDurationHours(labor.overtimeHours) : "None"}
              />
              <SummaryCard title="Priority" value={statusLabel(Priority, job.priority)} />
            </div>

            {(delayed || !materialsReady) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {delayed && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Job is past required completion date
                  </div>
                )}
                {!materialsReady && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Materials not fully reserved
                  </div>
                )}
              </div>
            )}

            <Tabs value={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab value="tasks">Manufacturing Tasks</Tab>
                <Tab value="overview">Overview</Tab>
                <Tab value="materials">Materials</Tab>
                <Tab value="quality">Quality</Tab>
                <Tab value="rework">Rework</Tab>
                <Tab value="history">Task History</Tab>
                <Tab value="attachments">Attachments</Tab>
              </TabList>

              <TabPanel value="tasks">
                <div className="mb-3 flex flex-wrap gap-2">
                  {(job.status === "ready_to_start" || job.status === "planned" || job.status === "draft") && (
                    <Button
                      size="sm"
                      leftIcon={<Play className="h-4 w-4" />}
                      loading={startJob.isPending}
                      onClick={() => {
                        void startJob.mutateAsync(job.id).then(() => {
                          toast.success("Production job started");
                          void refetch();
                        });
                      }}
                    >
                      Start Job
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="success"
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    loading={completeJob.isPending}
                    disabled={!canComplete || job.status === "completed"}
                    onClick={() => setCompleteOpen(true)}
                  >
                    Complete Job
                  </Button>
                  {!canComplete && (
                    <p className="self-center text-xs text-muted-foreground">
                      Complete all required tasks and pass QC before closing the job.
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Sequence</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Est. Time</th>
                        <th className="px-4 py-3 text-right">Actual Time</th>
                        <th className="px-4 py-3 text-right">OT</th>
                        <th className="px-4 py-3 text-right">Labour</th>
                        <th className="px-4 py-3">Assigned To</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.tasks.map((task) => {
                        const actions = allowedTaskActions(task);
                        const taskLabor = task.actualHours ? calculateTaskLaborCost(task) : null;
                        const prereqNames = task.prerequisiteTaskIds
                          .map((prereqId) => job.tasks.find((item) => item.id === prereqId)?.name)
                          .filter(Boolean);
                        return (
                          <tr key={task.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3 font-mono text-xs">{task.sequence}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {task.taskNumber} {task.name}
                                {task.isRework && (
                                  <span className="ml-2 text-[10px] uppercase text-warning">Rework</span>
                                )}
                                {!task.isRequired && (
                                  <span className="ml-2 text-[10px] uppercase text-muted-foreground">Optional</span>
                                )}
                              </div>
                              {task.description && (
                                <div className="text-xs text-muted-foreground">{task.description}</div>
                              )}
                              {prereqNames.length > 0 && (
                                <div className="text-[11px] text-muted-foreground">
                                  Depends on: {prereqNames.join(", ")}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {taskQuantityLabel(task)}
                              {task.rejectedQuantity > 0 && (
                                <div className="text-[11px] text-muted-foreground">
                                  Rej {task.rejectedQuantity}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                variant={statusVariant(ManufacturingTaskStatus, task.status)}
                                size="sm"
                              >
                                {statusLabel(ManufacturingTaskStatus, task.status)}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-3 text-right">{formatDurationHours(task.estimatedHours)}</td>
                            <td className="px-4 py-3 text-right">{formatDurationHours(task.actualHours)}</td>
                            <td className="px-4 py-3 text-right">
                              {taskLabor && taskLabor.overtimeHours > 0
                                ? formatDurationHours(taskLabor.overtimeHours)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {taskLabor ? formatCurrency(taskLabor.laborCost) : "-"}
                            </td>
                            <td className="px-4 py-3">{task.assignedToName ?? task.operatorName ?? "-"}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {actions.start && (
                                  <Button size="sm" variant="outline" leftIcon={<Play className="h-3 w-3" />} onClick={() => openDialog(task, "start")}>
                                    Start
                                  </Button>
                                )}
                                {actions.resume && (
                                  <Button size="sm" variant="outline" leftIcon={<Play className="h-3 w-3" />} onClick={() => void handleQuickAction(task, "resume")}>
                                    Resume
                                  </Button>
                                )}
                                {actions.pause && (
                                  <Button size="sm" variant="outline" leftIcon={<Pause className="h-3 w-3" />} onClick={() => void handleQuickAction(task, "pause")}>
                                    Pause
                                  </Button>
                                )}
                                {actions.complete && (
                                  <Button size="sm" variant="success" leftIcon={<CheckCircle className="h-3 w-3" />} onClick={() => openDialog(task, "complete")}>
                                    Complete
                                  </Button>
                                )}
                                {actions.hold && (
                                  <Button size="sm" variant="ghost" onClick={() => openDialog(task, "hold")}>
                                    Hold
                                  </Button>
                                )}
                                {actions.notes && (
                                  <Button size="sm" variant="ghost" leftIcon={<StickyNote className="h-3 w-3" />} onClick={() => openDialog(task, "notes")}>
                                    Notes
                                  </Button>
                                )}
                                {actions.rework && (
                                  <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="h-3 w-3" />} onClick={() => openDialog(task, "rework")}>
                                    Rework
                                  </Button>
                                )}
                                {actions.skip && (
                                  <Button size="sm" variant="ghost" leftIcon={<SkipForward className="h-3 w-3" />} onClick={() => void handleQuickAction(task, "skip")}>
                                    Skip
                                  </Button>
                                )}
                                {task.status !== "completed" && task.status !== "skipped" && task.status !== "blocked" && (
                                  <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3 w-3" />} onClick={() => void handleQuickAction(task, "block")}>
                                    Block
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabPanel>

              <TabPanel value="overview">
                <div className="grid gap-6 lg:grid-cols-2">
                  <dl className="space-y-3 rounded-lg border border-border bg-card p-5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Production Job</dt>
                      <dd className="font-medium">{job.jobNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Sales Order</dt>
                      <dd className="font-medium">{job.salesOrderNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Product</dt>
                      <dd className="font-medium">{job.productName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Product Version</dt>
                      <dd className="font-medium">{job.productVersionLabel}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Quantity</dt>
                      <dd className="font-medium">{job.quantity}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <StatusBadge variant={statusVariant(ManufacturingJobStatus, job.status)} dot size="sm">
                          {statusLabel(ManufacturingJobStatus, job.status)}
                        </StatusBadge>
                      </dd>
                    </div>
                  </dl>
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-3 text-sm font-semibold">Schedule & Cost</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Start Date</dt>
                        <dd>{formatDateTime(job.plannedStartDate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Required Completion</dt>
                        <dd>{formatDateTime(job.plannedEndDate)}</dd>
                      </div>
                      {job.actualStartDate && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Actual Start</dt>
                          <dd>{formatDateTime(job.actualStartDate)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Regular labour</dt>
                        <dd>
                          {formatDurationHours(labor?.regularHours ?? 0)} ·{" "}
                          {formatCurrency(labor?.regularCost ?? 0)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Overtime</dt>
                        <dd>
                          {formatDurationHours(labor?.overtimeHours ?? 0)} ·{" "}
                          {formatCurrency(labor?.overtimeCost ?? 0)}
                          {labor && labor.overtimeHours > 0
                            ? ` (${labor.overtimeMultiplier}×)`
                            : ""}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Labour cost</dt>
                        <dd>{formatCurrency(labor?.laborCost ?? 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Estimated Cost</dt>
                        <dd>{formatCurrency(job.estimatedCost)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Actual Cost</dt>
                        <dd>{formatCurrency(job.actualCost)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                {job.notes && (
                  <div className="mt-4 rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">{job.notes}</p>
                  </div>
                )}
              </TabPanel>

              <TabPanel value="materials">
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3 text-right">Required</th>
                        <th className="px-4 py-3 text-right">Reserved</th>
                        <th className="px-4 py-3 text-right">Issued</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.materialRequirements.map((mr) => (
                        <tr key={mr.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">{mr.inventoryItemSku}</td>
                          <td className="px-4 py-3">{mr.inventoryItemName}</td>
                          <td className="px-4 py-3 text-right">{mr.requiredQuantity} {mr.unit}</td>
                          <td className="px-4 py-3 text-right">{mr.reservedQuantity} {mr.unit}</td>
                          <td className="px-4 py-3 text-right">{mr.issuedQuantity} {mr.unit}</td>
                          <td className="px-4 py-3">
                            <StatusBadge variant={mr.status === "issued" ? "success" : "neutral"} size="sm">
                              {mr.status}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {job.materialOutcome && (
                  <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Material outcome</h3>
                    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs text-muted-foreground">Finished material</dt>
                        <dd className="font-medium">{job.materialOutcome.finishedMaterialQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Reusable scrap</dt>
                        <dd className="font-medium">{job.materialOutcome.reusableScrapQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Recoverable</dt>
                        <dd className="font-medium">{job.materialOutcome.recoverableQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Permanent waste</dt>
                        <dd className="font-medium">{job.materialOutcome.permanentWasteQuantity}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Scrap lots keep carried material cost — no new purchase was posted.
                    </p>
                  </div>
                )}
              </TabPanel>

              <TabPanel value="quality">
                {job.qualityInspection ? (
                  <div className="rounded-lg border border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{job.qualityInspection.inspectionNumber}</h3>
                      <StatusBadge variant="info" size="sm">
                        {job.qualityInspection.status}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inspector: {job.qualityInspection.inspectorName}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {job.qualityInspection.checklistItems.map((item) => (
                        <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          {item.name}
                          <StatusBadge
                            variant={item.passed === true ? "success" : item.passed === false ? "danger" : "neutral"}
                            size="sm"
                          >
                            {item.passed === true ? "Pass" : item.passed === false ? "Fail" : "Pending"}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={ROUTES.manufacturing.quality}
                      className="mt-4 inline-block text-sm text-primary hover:underline"
                    >
                      Open quality inspection workspace
                    </Link>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    QC is tracked as a manufacturing task for this product version. Complete the QC task or record an inspection from the Quality workspace.
                  </p>
                )}
              </TabPanel>

              <TabPanel value="rework">
                {job.reworks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No rework recorded. Original task history is preserved when rework is created.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {job.reworks.map((rework) => {
                      const original = job.tasks.find((task) => task.id === rework.originalTaskId);
                      const reworkTask = job.tasks.find((task) => task.id === rework.reworkTaskId);
                      return (
                        <div key={rework.id} className="rounded-lg border border-border bg-card p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{rework.reworkNumber}</p>
                            <StatusBadge variant={rework.result === "passed" ? "success" : "warning"} size="sm">
                              {rework.result ?? "pending"}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-muted-foreground">
                            Original: {original?.taskNumber} {original?.name} → Rework: {reworkTask?.taskNumber} {reworkTask?.name}
                          </p>
                          <p className="mt-1">Reason: {rework.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty {rework.quantity}
                            {rework.additionalTimeHours != null ? ` · Extra time ${formatDurationHours(rework.additionalTimeHours)}` : ""}
                            {rework.additionalCost != null ? ` · Extra cost ${formatCurrency(rework.additionalCost)}` : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabPanel>

              <TabPanel value="history">
                <ActivityLog entries={activityEntries} emptyMessage="No task history recorded yet." />
                <div className="mt-4">
                  <NotesPanel notes={[]} />
                </div>
              </TabPanel>

              <TabPanel value="attachments">
                <AttachmentPanel
                  attachments={[
                    {
                      id: "mfg-att-1",
                      name: "Job Spec Sheet.pdf",
                      size: 256_000,
                      type: "pdf",
                    },
                    {
                      id: "mfg-att-2",
                      name: "Production Drawing.pdf",
                      size: 512_000,
                      type: "pdf",
                    },
                    {
                      id: "mfg-att-3",
                      name: "Material List.xlsx",
                      size: 84_000,
                      type: "xlsx",
                    },
                  ]}
                />
              </TabPanel>
            </Tabs>
          </>
        )}
      </PageContent>

      <TaskActionDialogs
        task={dialogTask}
        mode={dialogMode}
        users={(usersData?.items ?? []).map((user) => ({ id: user.id, name: user.displayName }))}
        loading={taskAction.isPending}
        onClose={() => {
          setDialogMode(null);
          setDialogTask(null);
        }}
        onSubmit={(action) => {
          void runAction(action, "Task updated");
        }}
      />

      <CompleteJobDialog
        job={job ?? null}
        open={completeOpen}
        loading={completeJob.isPending}
        onClose={() => setCompleteOpen(false)}
        onSubmit={(completion) => {
          if (!job) return;
          void completeJob
            .mutateAsync({ id: job.id, completion })
            .then(() => {
              toast.success("Production job completed — scrap inventory posted at carried cost");
              setCompleteOpen(false);
              void refetch();
            })
            .catch((err: { message?: string }) => {
              toast.error(err?.message ?? "Job cannot be completed yet");
            });
        }}
      />
    </PageContainer>
  );
}
