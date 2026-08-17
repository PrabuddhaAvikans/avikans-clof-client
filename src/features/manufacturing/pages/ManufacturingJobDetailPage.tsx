import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityLog } from "@/components/ui/ActivityLog";
import { AttachmentPanel } from "@/components/ui/AttachmentPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { NotesPanel } from "@/components/ui/NotesPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import {
  useCompleteManufacturingJob,
  useManufacturingJob,
  useStartManufacturingJob,
  useUpdateManufacturingJob,
} from "@/features/manufacturing/hooks/useManufacturing";
import {
  calculateJobProgress,
  areMaterialsReady,
  isJobDelayed,
} from "@/features/manufacturing/utils/jobUtils";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Operation } from "@/types/manufacturing";
import { ManufacturingJobStatus, Priority } from "@/types/status";

export function ManufacturingJobDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: job, isLoading, error, refetch } = useManufacturingJob(id);
  const updateJob = useUpdateManufacturingJob();
  const startJob = useStartManufacturingJob();
  const completeJob = useCompleteManufacturingJob();

  const [activeTab, setActiveTab] = useState("overview");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueOperation, setIssueOperation] = useState<Operation | null>(null);

  const progress = job ? calculateJobProgress(job) : 0;
  const materialsReady = job ? areMaterialsReady(job) : false;
  const delayed = job ? isJobDelayed(job) : false;

  const activityEntries = useMemo(() => {
    if (!job) return [];
    const entries = [
      {
        id: "created",
        user: job.createdByName,
        action: "Created job",
        timestamp: formatDateTime(job.createdAt),
      },
    ];
    if (job.actualStartDate) {
      entries.push({
        id: "started",
        user: job.assignedToName ?? "System",
        action: "Started production",
        timestamp: formatDateTime(job.actualStartDate),
      });
    }
    if (job.actualEndDate) {
      entries.push({
        id: "completed",
        user: job.assignedToName ?? "System",
        action: "Completed job",
        timestamp: formatDateTime(job.actualEndDate),
      });
    }
    return entries;
  }, [job]);

  const handleOperationAction = async (
    operation: Operation,
    action: "start" | "pause" | "complete",
  ) => {
    if (!job) return;
    const updatedOperations = job.operations.map((op) => {
      if (op.id !== operation.id) return op;
      if (action === "start") {
        return { ...op, status: "in_progress" as const, startedAt: new Date().toISOString() };
      }
      if (action === "pause") {
        return { ...op, status: "pending" as const };
      }
      return {
        ...op,
        status: "completed" as const,
        completedAt: new Date().toISOString(),
      };
    });

    try {
      await updateJob.mutateAsync({
        id: job.id,
        data: { operations: updatedOperations },
      });
      toast.success(`Operation "${operation.name}" updated`);
      void refetch();
    } catch {
      toast.error("Failed to update operation");
    }
  };

  const handleReportIssue = () => {
    if (!issueOperation) return;
    toast.warning(`Issue reported for "${issueOperation.name}"`);
    setIssueDialogOpen(false);
    setIssueOperation(null);
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={job?.jobNumber ?? "Job Details"}
        description={job ? `${job.productName} · ${job.customerName}` : undefined}
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Jobs", href: ROUTES.manufacturing.jobs },
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
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <SummaryCard title="Status" value={statusLabel(ManufacturingJobStatus, job.status)} />
              <SummaryCard title="Progress" value={`${progress}%`} />
              <SummaryCard title="Due Date" value={formatDate(job.plannedEndDate)} />
              <SummaryCard title="Team" value={job.assignedToName ?? "Unassigned"} />
              <SummaryCard
                title="Materials"
                value={materialsReady ? "Ready" : "Pending"}
                description={materialsReady ? "All reserved" : "Action needed"}
              />
              <SummaryCard
                title="Quality"
                value={job.qualityInspection?.status ?? "Not started"}
              />
            </div>

            {(delayed || !materialsReady) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {delayed && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    Job is past planned end date
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
                <Tab value="overview">Overview</Tab>
                <Tab value="operations">Operations</Tab>
                <Tab value="materials">Materials</Tab>
                <Tab value="quality">Quality</Tab>
                <Tab value="time-logs">Time Logs</Tab>
                <Tab value="issues">Issues</Tab>
                <Tab value="attachments">Attachments</Tab>
                <Tab value="activity">Activity</Tab>
              </TabList>

              <TabPanel value="overview">
                <div className="grid gap-6 lg:grid-cols-2">
                  <dl className="space-y-3 rounded-lg border border-border bg-card p-5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Job Number</dt>
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
                      <dt className="text-muted-foreground">Quantity</dt>
                      <dd className="font-medium">{job.quantity}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Priority</dt>
                      <dd>
                        <StatusBadge variant={statusVariant(Priority, job.priority)} size="sm">
                          {statusLabel(Priority, job.priority)}
                        </StatusBadge>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <StatusBadge
                          variant={statusVariant(ManufacturingJobStatus, job.status)}
                          dot
                          size="sm"
                        >
                          {statusLabel(ManufacturingJobStatus, job.status)}
                        </StatusBadge>
                      </dd>
                    </div>
                  </dl>
                  <div className="rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-3 text-sm font-semibold">Schedule</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Planned Start</dt>
                        <dd>{formatDateTime(job.plannedStartDate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Planned End</dt>
                        <dd>{formatDateTime(job.plannedEndDate)}</dd>
                      </div>
                      {job.actualStartDate && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Actual Start</dt>
                          <dd>{formatDateTime(job.actualStartDate)}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-4 flex gap-2">
                      {job.status === "ready_to_start" && (
                        <Button
                          size="sm"
                          leftIcon={<Play className="h-4 w-4" />}
                          loading={startJob.isPending}
                          onClick={() => {
                            void startJob.mutateAsync(job.id).then(() => {
                              toast.success("Job started");
                            });
                          }}
                        >
                          Start Job
                        </Button>
                      )}
                      {job.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="success"
                          leftIcon={<CheckCircle className="h-4 w-4" />}
                          loading={completeJob.isPending}
                          onClick={() => {
                            void completeJob.mutateAsync(job.id).then(() => {
                              toast.success("Job completed");
                            });
                          }}
                        >
                          Complete Job
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {job.notes && (
                  <div className="mt-4 rounded-lg border border-border bg-card p-5">
                    <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground">{job.notes}</p>
                  </div>
                )}
              </TabPanel>

              <TabPanel value="operations">
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Operation</th>
                        <th className="px-4 py-3">Workstation</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Est. Hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.operations.map((op) => (
                        <tr key={op.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">{op.sequence}</td>
                          <td className="px-4 py-3 font-medium">{op.name}</td>
                          <td className="px-4 py-3">{op.workstation}</td>
                          <td className="px-4 py-3">{op.assignedToName ?? "-"}</td>
                          <td className="px-4 py-3">{op.estimatedHours}h</td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              variant={
                                op.status === "completed"
                                  ? "success"
                                  : op.status === "in_progress"
                                    ? "info"
                                    : "neutral"
                              }
                              size="sm"
                            >
                              {op.status.replace(/_/g, " ")}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {op.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  leftIcon={<Play className="h-3 w-3" />}
                                  onClick={() => void handleOperationAction(op, "start")}
                                >
                                  Start
                                </Button>
                              )}
                              {op.status === "in_progress" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    leftIcon={<Pause className="h-3 w-3" />}
                                    onClick={() => void handleOperationAction(op, "pause")}
                                  >
                                    Pause
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    leftIcon={<CheckCircle className="h-3 w-3" />}
                                    onClick={() => void handleOperationAction(op, "complete")}
                                  >
                                    Complete
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIssueOperation(op);
                                  setIssueDialogOpen(true);
                                }}
                              >
                                Report Issue
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                          <td className="px-4 py-3 text-right">
                            {mr.requiredQuantity} {mr.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {mr.reservedQuantity} {mr.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {mr.issuedQuantity} {mr.unit}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              variant={mr.status === "issued" ? "success" : "neutral"}
                              size="sm"
                            >
                              {mr.status}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          {item.name}
                          <StatusBadge
                            variant={
                              item.passed === true
                                ? "success"
                                : item.passed === false
                                  ? "danger"
                                  : "neutral"
                            }
                            size="sm"
                          >
                            {item.passed === true
                              ? "Pass"
                              : item.passed === false
                                ? "Fail"
                                : "Pending"}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No quality inspection recorded yet.
                  </p>
                )}
              </TabPanel>

              <TabPanel value="time-logs">
                <div className="space-y-2">
                  {job.operations
                    .filter((op) => op.startedAt || op.actualHours)
                    .map((op) => (
                      <div
                        key={op.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">{op.name}</p>
                          <p className="text-xs text-muted-foreground">{op.workstation}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {op.startedAt && <p>Started: {formatDateTime(op.startedAt)}</p>}
                          {op.completedAt && <p>Completed: {formatDateTime(op.completedAt)}</p>}
                          {op.actualHours && <p>Actual: {op.actualHours}h</p>}
                        </div>
                      </div>
                    ))}
                  {job.operations.every((op) => !op.startedAt) && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No time logs recorded yet.
                    </p>
                  )}
                </div>
              </TabPanel>

              <TabPanel value="issues">
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No open issues for this job.
                </p>
              </TabPanel>

              <TabPanel value="attachments">
                <AttachmentPanel attachments={[]} />
              </TabPanel>

              <TabPanel value="activity">
                <ActivityLog entries={activityEntries} />
                <div className="mt-4">
                  <NotesPanel notes={[]} />
                </div>
              </TabPanel>
            </Tabs>
          </>
        )}
      </PageContent>

      <ConfirmationDialog
        open={issueDialogOpen}
        onClose={() => {
          setIssueDialogOpen(false);
          setIssueOperation(null);
        }}
        onConfirm={handleReportIssue}
        title="Report Issue"
        description={`Report a production issue for operation "${issueOperation?.name}"?`}
        confirmLabel="Report Issue"
        variant="danger"
      />
    </PageContainer>
  );
}
