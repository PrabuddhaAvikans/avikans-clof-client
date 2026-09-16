import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProductionJobDetailsPanel } from "@/features/manufacturing/components/ProductionJobDetailsPanel";
import { ProductionJobsTable } from "@/features/manufacturing/components/ProductionJobsTable";
import { ProductionKpiCards } from "@/features/manufacturing/components/ProductionKpiCards";
import { ProductionTimeline } from "@/features/manufacturing/components/ProductionTimeline";
import {
  useHoldProductionJob,
  useProductionJobs,
  useProductionSnapshot,
  useReleaseToQc,
  useStartProduction,
  useUpdateProductionStage,
} from "@/features/manufacturing/hooks/useProductionTracking";
import { manufacturingService } from "@/services";
import type { ProductionJob } from "@/types/production-tracking";
import { ManufacturingJobStatus, Priority } from "@/types/status";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  ...Object.entries(ManufacturingJobStatus).map(([value, def]) => ({
    value,
    label: def.label,
  })),
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  ...Object.entries(Priority).map(([value, def]) => ({
    value,
    label: def.label,
  })),
];

const controlClass = "h-8 text-[12px]";

export function ManufacturingJobsPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [line, setLine] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLine, setAppliedLine] = useState("");
  const [appliedSupervisorId, setAppliedSupervisorId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedPriority, setAppliedPriority] = useState("");
  const [appliedDelayedOnly, setAppliedDelayedOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductionJob | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [overrideMaterials, setOverrideMaterials] = useState(false);

  const { data: snapshot, isLoading, error, refetch } = useProductionSnapshot();

  const { data: jobsData, refetch: refetchJobs } = useProductionJobs({
    page: 1,
    pageSize: 50,
    search: appliedSearch || undefined,
    line: appliedLine || undefined,
    supervisorId: appliedSupervisorId || undefined,
    status: appliedStatus || undefined,
    priority: appliedPriority || undefined,
    delayedOnly: appliedDelayedOnly || undefined,
  });

  const startMutation = useStartProduction();
  const updateStageMutation = useUpdateProductionStage();
  const holdMutation = useHoldProductionJob();
  const releaseMutation = useReleaseToQc();

  const jobs = useMemo(
    () => jobsData?.items ?? snapshot?.jobs ?? [],
    [jobsData?.items, snapshot?.jobs],
  );

  useEffect(() => {
    if (!selectedId && jobs.length) setSelectedId(jobs[0].id);
  }, [jobs, selectedId]);

  useEffect(() => {
    if (selectedId && jobs.length && !jobs.some((job) => job.id === selectedId)) {
      setSelectedId(jobs[0]?.id ?? null);
    }
  }, [jobs, selectedId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) ?? null,
    [jobs, selectedId],
  );

  const lineOptions = useMemo(
    () => [
      { value: "", label: "All tasks" },
      ...(snapshot?.lines ?? []).map((value) => ({ value, label: value })),
    ],
    [snapshot?.lines],
  );

  const supervisorOptions = useMemo(
    () => [
      { value: "", label: "All leads" },
      ...(snapshot?.supervisors ?? []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    [snapshot?.supervisors],
  );

  const areaOverview = useMemo(() => {
    const map = new Map<string, { active: number; queue: number }>();
    (snapshot?.jobs ?? []).forEach((job) => {
      const area = job.currentTaskName || job.line;
      const entry = map.get(area) ?? { active: 0, queue: 0 };
      if (job.status === "in_progress") entry.active += 1;
      else if (["planned", "ready_to_start", "materials_pending", "draft"].includes(job.status)) {
        entry.queue += 1;
      }
      map.set(area, entry);
    });
    return [...map.entries()].slice(0, 6).map(([name, stats]) => ({
      name,
      ...stats,
      capacity: Math.min(100, (stats.active + stats.queue) * 18 + 20),
    }));
  }, [snapshot?.jobs]);

  const requireSelection = useCallback(() => {
    if (!selectedId) {
      toast.error("Select a job first");
      return false;
    }
    return true;
  }, [selectedId]);

  const startSelectedJob = async () => {
    if (!selectedId) return;
    try {
      await startMutation.mutateAsync([selectedId]);
      toast.success("Production started");
      setStartConfirmOpen(false);
      setOverrideMaterials(false);
    } catch {
      toast.error("Failed to start production");
    }
  };

  const handleStart = async () => {
    if (!requireSelection() || !selectedJob) return;
    if (!selectedJob.materialsReady) {
      setStartConfirmOpen(true);
      return;
    }
    await startSelectedJob();
  };

  const handleUpdateStage = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      const result = await updateStageMutation.mutateAsync({ id: selectedId });
      toast.success(`Advanced to ${result.currentTaskName || result.statusLabel}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleHold = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      await holdMutation.mutateAsync({
        id: selectedId,
        reason: "Held from production workspace",
      });
      toast.success("Job placed on hold");
    } catch {
      toast.error("Failed to hold job");
    }
  };

  const handleReleaseToQc = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      await releaseMutation.mutateAsync(selectedId);
      toast.success("Released to QC");
    } catch {
      toast.error("Failed to release to QC");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await manufacturingService.delete(deleteTarget.id);
      toast.success(`Job ${deleteTarget.jobNumber} deleted`);
      setDeleteTarget(null);
      void refetch();
      void refetchJobs();
    } catch {
      toast.error("Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const applyFilters = () => {
    setAppliedSearch(search);
    setAppliedLine(line);
    setAppliedSupervisorId(supervisorId);
    setAppliedStatus(status);
    setAppliedPriority(priority);
    setAppliedDelayedOnly(delayedOnly);
  };

  const resetFilters = () => {
    setSearch("");
    setLine("");
    setSupervisorId("");
    setStatus("");
    setPriority("");
    setDelayedOnly(false);
    setAppliedSearch("");
    setAppliedLine("");
    setAppliedSupervisorId("");
    setAppliedStatus("");
    setAppliedPriority("");
    setAppliedDelayedOnly(false);
  };

  return (
    <PageContainer
      maxWidth="full"
      className="flex min-h-0 flex-col !gap-0 !px-2 !py-2 sm:!px-3 lg:!px-4"
    >
      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load production jobs." : null}
        className="flex min-h-0 flex-1 flex-col"
      >
        {snapshot && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="col-span-1 flex flex-wrap items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
              <h1 className="mr-auto text-sm font-semibold tracking-tight text-foreground">
                Production Jobs
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link to={ROUTES.manufacturing.jobsNew}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-[11px]"
                    leftIcon={<Plus className="h-3 w-3" />}
                  >
                    Create Job
                  </Button>
                </Link>
                {/* <Button
                  variant="primary"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  leftIcon={<Play className="h-3 w-3" />}
                  onClick={() => void handleStart()}
                  loading={startMutation.isPending}
                >
                  Start
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  leftIcon={<Workflow className="h-3 w-3" />}
                  onClick={() => void handleUpdateStage()}
                  loading={updateStageMutation.isPending}
                >
                  Advance Task
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  leftIcon={<Pause className="h-3 w-3" />}
                  onClick={() => void handleHold()}
                  loading={holdMutation.isPending}
                >
                  Hold
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-[11px]"
                  leftIcon={<ShieldCheck className="h-3 w-3" />}
                  onClick={() => void handleReleaseToQc()}
                  loading={releaseMutation.isPending}
                >
                  QC
                </Button> */}
                <IconButton
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  aria-label="Refresh"
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    void refetch();
                    void refetchJobs();
                    toast.success("Refreshed");
                  }}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
              <ProductionKpiCards kpis={snapshot.kpis} />
            </div>

            <div className="col-span-1 flex flex-wrap items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs…"
                className={`${controlClass} min-w-[140px] flex-1 basis-[160px] sm:max-w-[200px]`}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
                aria-label="Search jobs"
              />
              <Select
                value={line}
                onChange={(event) => setLine(event.target.value)}
                options={lineOptions}
                selectClassName={`${controlClass} py-0`}
                className="w-[118px]"
                aria-label="Filter by current task"
              />
              <Select
                value={supervisorId}
                onChange={(event) => setSupervisorId(event.target.value)}
                options={supervisorOptions}
                selectClassName={`${controlClass} py-0`}
                className="w-[128px]"
                aria-label="Filter by supervisor"
              />
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={STATUS_OPTIONS}
                selectClassName={`${controlClass} py-0`}
                className="w-[128px]"
                aria-label="Filter by status"
              />
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                options={PRIORITY_OPTIONS}
                selectClassName={`${controlClass} py-0`}
                className="w-[128px]"
                aria-label="Filter by priority"
              />
              <Checkbox
                checked={delayedOnly}
                onChange={(event) => setDelayedOnly(event.target.checked)}
                label="Delayed only"
                className="text-[12px]"
              />
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={applyFilters}
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[11px]"
                onClick={resetFilters}
              >
                Reset
              </Button>
              <p className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {jobs.length} jobs
              </p>
            </div>

            <div className="col-span-1 flex min-h-0 min-w-0 flex-col border border-border bg-card md:col-span-2 lg:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-2.5 py-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Jobs
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Scroll horizontally on narrow screens
                </p>
              </div>
              <div className="min-w-0 flex-1 overflow-auto p-1">
                <ProductionJobsTable
                  jobs={jobs}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onView={(job) => navigate(ROUTES.manufacturing.jobDetail(job.id))}
                  onDelete={setDeleteTarget}
                />
              </div>
            </div>

            <div className="col-span-1 max-h-[480px] overflow-auto border border-border bg-card p-2 md:col-span-2 lg:col-span-1 xl:col-span-1 xl:row-span-2 xl:max-h-[min(720px,calc(100dvh-220px))]">
              <ProductionJobDetailsPanel
                job={selectedJob}
                onUpdateStage={() => {
                  if (selectedId) navigate(ROUTES.manufacturing.jobDetail(selectedId));
                }}
                updating={false}
                className="h-full min-h-[240px]"
              />
            </div>

            <div className="col-span-1 border border-border bg-card p-2 md:col-span-2 lg:col-span-3 xl:col-span-3">
              <ProductionTimeline
                blocks={snapshot.timeline}
                lines={snapshot.lines}
                selectedJobId={selectedId}
                onSelectJob={setSelectedId}
              />
            </div>

            {areaOverview.length > 0 && (
              <div className="col-span-1 border border-border bg-card p-2 md:col-span-2 lg:col-span-3 xl:col-span-4">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Workshop areas
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {areaOverview.map((area) => (
                    <div key={area.name} className="border border-border bg-background p-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-medium text-foreground">
                          {area.name}
                        </p>
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
              </div>
            )}
          </div>
        )}
      </PageContent>

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
        open={startConfirmOpen}
        onClose={() => {
          setStartConfirmOpen(false);
          setOverrideMaterials(false);
        }}
        onConfirm={() => {
          if (!overrideMaterials) {
            toast.error("Confirm material override before starting");
            return;
          }
          void startSelectedJob();
        }}
        title="Start Production Job"
        description="Materials are not fully reserved. Reserve materials first or confirm override to start anyway."
        confirmLabel={overrideMaterials ? "Start Job" : "Override & Start"}
        loading={startMutation.isPending}
      >
        <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          <p className="font-medium">Materials not ready</p>
          <p className="mt-1 text-xs">
            Some material requirements have not been reserved or issued.
          </p>
          <Checkbox
            className="mt-2"
            checked={overrideMaterials}
            onChange={(event) => setOverrideMaterials(event.target.checked)}
            label="I confirm starting without full material reservation"
          />
        </div>
      </ConfirmationDialog>
    </PageContainer>
  );
}
