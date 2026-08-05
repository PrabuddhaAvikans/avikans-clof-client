import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobDetailsDrawer } from "@/features/manufacturing/components/JobDetailsDrawer";
import {
  useManufacturingJobs,
  useUpdateManufacturingJob,
} from "@/features/manufacturing/hooks/useManufacturing";
import {
  calculateJobProgress,
  isJobDelayed,
} from "@/features/manufacturing/utils/jobUtils";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate } from "@/lib/format";
import type { ManufacturingJob } from "@/types/manufacturing";
import {
  ManufacturingJobStatus,
  Priority,
  type ManufacturingJobStatusValue,
} from "@/types/status";

const BOARD_COLUMNS: {
  id: string;
  status: ManufacturingJobStatusValue;
  label: string;
}[] = [
  { id: "planned", status: "planned", label: "Planned" },
  { id: "materials_pending", status: "materials_pending", label: "Materials Pending" },
  { id: "ready_to_start", status: "ready_to_start", label: "Ready" },
  { id: "in_progress", status: "in_progress", label: "In Progress" },
  { id: "quality_check", status: "quality_check", label: "Quality Check" },
  { id: "completed", status: "completed", label: "Completed" },
  { id: "on_hold", status: "on_hold", label: "On Hold" },
];

export function ProductionBoardPage() {
  const { data, isLoading, error, refetch } = useManufacturingJobs({
    page: 1,
    pageSize: 100,
  });
  const updateJob = useUpdateManufacturingJob();

  const [draggedJob, setDraggedJob] = useState<ManufacturingJob | null>(null);
  const [targetStatus, setTargetStatus] = useState<ManufacturingJobStatusValue | null>(null);
  const [selectedJob, setSelectedJob] = useState<ManufacturingJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const jobsByStatus = useMemo(() => {
    const map = new Map<ManufacturingJobStatusValue, ManufacturingJob[]>();
    for (const col of BOARD_COLUMNS) {
      map.set(col.status, []);
    }
    for (const job of data?.items ?? []) {
      const list = map.get(job.status);
      if (list) {
        list.push(job);
      } else if (job.status === "draft" || job.status === "rework") {
        map.get("planned")?.push(job);
      }
    }
    return map;
  }, [data?.items]);

  const handleDrop = (status: ManufacturingJobStatusValue) => {
    if (!draggedJob || draggedJob.status === status) {
      setDraggedJob(null);
      return;
    }
    setTargetStatus(status);
  };

  const confirmMove = async () => {
    if (!draggedJob || !targetStatus) return;
    try {
      await updateJob.mutateAsync({
        id: draggedJob.id,
        data: { status: targetStatus },
      });
      toast.success(
        `Job ${draggedJob.jobNumber} moved to ${statusLabel(ManufacturingJobStatus, targetStatus)}`,
      );
      void refetch();
    } catch {
      toast.error("Failed to update job status");
    } finally {
      setDraggedJob(null);
      setTargetStatus(null);
    }
  };

  const handleDragStart = (job: ManufacturingJob) => {
    setDraggedJob(job);
  };

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="Production Board"
        description="Kanban view of manufacturing jobs — drag cards to update status."
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Production Board" },
        ]}
        actions={
          <Link to={ROUTES.manufacturing.jobs}>
            <StatusBadge variant="neutral">List View</StatusBadge>
          </Link>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load production board" : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((column) => {
            const jobs = jobsByStatus.get(column.status) ?? [];
            return (
              <div
                key={column.id}
                className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(column.status)}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {jobs.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {jobs.map((job) => {
                    const progress = calculateJobProgress(job);
                    const delayed = isJobDelayed(job);
                    const materialsIssue = job.materialRequirements.some(
                      (mr) =>
                        mr.reservedQuantity < mr.requiredQuantity && mr.status !== "issued",
                    );
                    return (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={() => handleDragStart(job)}
                        onClick={() => {
                          setSelectedJob(job);
                          setDrawerOpen(true);
                        }}
                        className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm active:cursor-grabbing"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {job.jobNumber}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {job.productName}
                            </p>
                          </div>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mb-2 flex flex-wrap gap-1">
                          <StatusBadge
                            variant={statusVariant(Priority, job.priority)}
                            size="sm"
                          >
                            {statusLabel(Priority, job.priority)}
                          </StatusBadge>
                          {(delayed || materialsIssue) && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="mb-2">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Due {formatDate(job.plannedEndDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">{job.customerName}</p>
                      </div>
                    );
                  })}
                  {jobs.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Drop jobs here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageContent>

      <JobDetailsDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedJob(null);
        }}
      />

      <ConfirmationDialog
        open={Boolean(targetStatus && draggedJob)}
        onClose={() => {
          setTargetStatus(null);
          setDraggedJob(null);
        }}
        onConfirm={() => void confirmMove()}
        title="Update Job Status"
        description={
          draggedJob && targetStatus
            ? `Move ${draggedJob.jobNumber} to "${statusLabel(ManufacturingJobStatus, targetStatus)}"?`
            : undefined
        }
        confirmLabel="Confirm Move"
        loading={updateJob.isPending}
      />
    </PageContainer>
  );
}
