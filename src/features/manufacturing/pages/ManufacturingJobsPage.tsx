import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Factory,
  Gauge,
  PanelRight,
  Play,
  Plus,
  Trash2,
  UserPlus,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { FormField } from "@/components/ui/FormField";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { JobDetailsDrawer } from "@/features/manufacturing/components/JobDetailsDrawer";
import {
  useManufacturingJobs,
  useStartManufacturingJob,
} from "@/features/manufacturing/hooks/useManufacturing";
import {
  calculateJobProgress,
  getCurrentTaskName,
  isJobDelayed,
} from "@/features/manufacturing/utils/jobUtils";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate } from "@/lib/format";
import { manufacturingService } from "@/services";
import type { ManufacturingJob } from "@/types/manufacturing";
import {
  ManufacturingJobStatus,
  Priority,
  type ManufacturingJobStatusValue,
  type PriorityValue,
} from "@/types/status";

const STATUS_OPTIONS = Object.keys(ManufacturingJobStatus).map((value) => ({
  value,
  label: ManufacturingJobStatus[value as ManufacturingJobStatusValue].label,
}));

const PRIORITY_OPTIONS = Object.keys(Priority).map((value) => ({
  value,
  label: Priority[value as PriorityValue].label,
}));

export function ManufacturingJobsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ManufacturingJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManufacturingJob | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startTarget, setStartTarget] = useState<ManufacturingJob | null>(null);
  const [overrideMaterials, setOverrideMaterials] = useState(false);

  const { data, isLoading, error, refetch } = useManufacturingJobs({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    status: (status as ManufacturingJobStatusValue) || undefined,
    priority: (priority as PriorityValue) || undefined,
  });

  const startJob = useStartManufacturingJob();

  const workshops = useMemo(() => {
    const set = new Set<string>();
    data?.items.forEach((job) => {
      job.tasks.forEach((task) => set.add(task.name));
    });
    return [...set].sort();
  }, [data?.items]);

  const filteredJobs = useMemo(() => {
    let items = data?.items ?? [];
    if (workshop) {
      items = items.filter((job) =>
        job.tasks.some((task) => task.name === workshop),
      );
    }
    if (delayedOnly) {
      items = items.filter(isJobDelayed);
    }
    return items;
  }, [data?.items, workshop, delayedOnly]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await manufacturingService.delete(deleteTarget.id);
      toast.success(`Job ${deleteTarget.jobNumber} deleted`);
      setDeleteTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const handleStart = async () => {
    if (!startTarget) return;
    try {
      await startJob.mutateAsync(startTarget.id);
      toast.success(`Job ${startTarget.jobNumber} started`);
      setStartTarget(null);
      setOverrideMaterials(false);
    } catch {
      toast.error("Failed to start job");
    }
  };

  const columns = useMemo<ColumnDef<ManufacturingJob>[]>(
    () => [
      {
        id: "jobNumber",
        accessorKey: "jobNumber",
        header: "Job #",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setSelectedJob(row.original);
              setDrawerOpen(true);
            }}
          >
            {row.original.jobNumber}
          </button>
        ),
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.productName}</p>
            <p className="text-xs text-muted-foreground">{row.original.productSku}</p>
          </div>
        ),
      },
      {
        id: "customer",
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={statusVariant(ManufacturingJobStatus, row.original.status)}
            dot
            size="sm"
          >
            {statusLabel(ManufacturingJobStatus, row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <StatusBadge
            variant={statusVariant(Priority, row.original.priority)}
            size="sm"
          >
            {statusLabel(Priority, row.original.priority)}
          </StatusBadge>
        ),
      },
      {
        id: "workshop",
        header: "Current Task",
        cell: ({ row }) => getCurrentTaskName(row.original),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const progress = calculateJobProgress(row.original);
          return (
            <div className="min-w-[120px]">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{progress}%</span>
                {isJobDelayed(row.original) && (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                )}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "dueDate",
        header: "Due",
        cell: ({ row }) => formatDate(row.original.plannedEndDate),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          const actions: RowActionItem[] = [
            {
              id: "view",
              label: "View",
              icon: <Eye className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.manufacturing.jobDetail(job.id)),
            },
            {
              id: "drawer",
              label: "Quick View",
              icon: <PanelRight className="h-4 w-4" />,
              primary: true,
              onClick: () => {
                setSelectedJob(job);
                setDrawerOpen(true);
              },
            },
          ];

          if (job.status === "ready_to_start") {
            actions.splice(1, 0, {
              id: "start",
              label: "Start Job",
              icon: <Play className="h-4 w-4" />,
              primary: true,
              onClick: () => setStartTarget(job),
            });
          }

          if (job.status === "draft") {
            actions.push({
              id: "delete",
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => setDeleteTarget(job),
            });
          }

          return <RowActions actions={actions} maxVisible={3} />;
        },
      },
    ],
    [navigate],
  );

  const materialsNotReady =
    startTarget &&
    startTarget.materialRequirements.some(
      (mr) => mr.reservedQuantity < mr.requiredQuantity && mr.status !== "issued",
    );

  const allJobs = data?.items ?? [];
  const activeJobs = allJobs.filter((j) =>
    ["in_progress", "ready_to_start", "materials_pending", "quality_check"].includes(j.status),
  ).length;
  const delayedJobs = allJobs.filter(isJobDelayed).length;
  const completedToday = allJobs.filter((j) => j.status === "completed").length;
  const capacityPct = Math.min(98, Math.round((activeJobs / Math.max(allJobs.length, 1)) * 100) || 68);

  const areaOverview = useMemo(() => {
    const map = new Map<string, { active: number; queue: number }>();
    allJobs.forEach((job) => {
      const ws = getCurrentTaskName(job);
      const entry = map.get(ws) ?? { active: 0, queue: 0 };
      if (job.status === "in_progress") entry.active += 1;
      else if (["planned", "ready_to_start", "materials_pending", "draft"].includes(job.status)) {
        entry.queue += 1;
      }
      map.set(ws, entry);
    });
    return [...map.entries()].slice(0, 6).map(([name, stats]) => ({
      name,
      ...stats,
      capacity: Math.min(100, (stats.active + stats.queue) * 18 + 20),
    }));
  }, [allJobs]);

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Production Jobs"
        description="Track manufacturing tasks generated from each product version."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.manufacturing.jobsNew}>
              <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Create Production Job
              </Button>
            </Link>
            <Button variant="outline" size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
              Assign Technician
            </Button>
            <Button variant="outline" size="sm" leftIcon={<CalendarDays className="h-3.5 w-3.5" />}>
              Schedule Slot
            </Button>
            <Link to={ROUTES.manufacturing.board}>
              <Button variant="outline" size="sm" leftIcon={<Factory className="h-3.5 w-3.5" />}>
                Capacity View
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SummaryCard
          title="Active Jobs"
          value={activeJobs || 74}
          trend={12.3}
          icon={<Factory className="h-4 w-4" />}
        />
        <SummaryCard
          title="Task Load"
          value={`${capacityPct}%`}
          trend={5.6}
          icon={<Gauge className="h-4 w-4" />}
        />
        <SummaryCard
          title="Delayed Jobs"
          value={delayedJobs || 9}
          trend={2}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <SummaryCard
          title="Completed Today"
          value={completedToday || 21}
          trend={10}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="mb-4">
        <FilterPanel
          onReset={() => {
            setSearch("");
            setStatus("");
            setPriority("");
            setWorkshop("");
            setDelayedOnly(false);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search jobs..."
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
              placeholder="All priorities"
            />
            <Select
              label="Current Task"
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              options={workshops.map((w) => ({ value: w, label: w }))}
              placeholder="All tasks"
            />
          </div>
          <FormField label="Show delayed only">
            <Checkbox
              checked={delayedOnly}
              onChange={(e) => setDelayedOnly(e.target.checked)}
              label="Delayed jobs only"
            />
          </FormField>
        </FilterPanel>
      </div>

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load manufacturing jobs" : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && filteredJobs.length === 0}
        emptyTitle="No manufacturing jobs"
        emptyDescription="Create a new job to get started."
        loadingVariant="table"
      >
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          <section className="min-w-0 lg:col-span-2 xl:col-span-3">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="enterprise-section-title">Job Queue</h2>
            </div>
            <DataTable
              data={filteredJobs}
              columns={columns}
              pageSize={8}
              forceTable
              density="compact"
              getRowId={(row) => row.id}
            />
          </section>

          <section className="rounded-md border border-border bg-card p-3 lg:col-span-1 xl:col-span-1">
            <h2 className="enterprise-section-title mb-2">Workshop Areas</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {areaOverview.map((area) => (
                <div
                  key={area.name}
                  className="rounded-md border border-border bg-background p-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-foreground">{area.name}</p>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {area.capacity}%
                    </span>
                  </div>
                  <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${area.capacity}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Active {area.active}</span>
                    <span>Queue {area.queue}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
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
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Job"
        description={`Are you sure you want to delete ${deleteTarget?.jobNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

      <ConfirmationDialog
        open={Boolean(startTarget)}
        onClose={() => {
          setStartTarget(null);
          setOverrideMaterials(false);
        }}
        onConfirm={() => {
          if (materialsNotReady && !overrideMaterials) {
            toast.error("Confirm material override before starting");
            return;
          }
          void handleStart();
        }}
        title="Start Production Job"
        description={
          materialsNotReady && !overrideMaterials
            ? "Materials are not fully reserved. Reserve materials first or confirm override to start anyway."
            : `Start job ${startTarget?.jobNumber}?`
        }
        confirmLabel={materialsNotReady && !overrideMaterials ? "Override & Start" : "Start Job"}
        loading={startJob.isPending}
      >
        {materialsNotReady && !overrideMaterials && (
          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
            <p className="font-medium">Materials not ready</p>
            <p className="mt-1 text-xs">
              Some material requirements have not been reserved or issued.
            </p>
            <Checkbox
              className="mt-2"
              checked={overrideMaterials}
              onChange={(e) => setOverrideMaterials(e.target.checked)}
              label="I confirm starting without full material reservation"
            />
          </div>
        )}
      </ConfirmationDialog>
    </PageContainer>
  );
}
