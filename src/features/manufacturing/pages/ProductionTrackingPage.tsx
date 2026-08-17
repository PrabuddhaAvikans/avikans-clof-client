import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { OverdueMilestones } from "@/features/manufacturing/components/OverdueMilestones";
import { ProductionJobDetailsPanel } from "@/features/manufacturing/components/ProductionJobDetailsPanel";
import { ProductionJobsTable } from "@/features/manufacturing/components/ProductionJobsTable";
import { ProductionKpiCards } from "@/features/manufacturing/components/ProductionKpiCards";
import { ProductionPipeline } from "@/features/manufacturing/components/ProductionPipeline";
import { ProductionTimeline } from "@/features/manufacturing/components/ProductionTimeline";
import {
  useHoldProductionJob,
  useProductionJobs,
  useProductionSnapshot,
  useReleaseToQc,
  useStartProduction,
  useUpdateProductionStage,
} from "@/features/manufacturing/hooks/useProductionTracking";
import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGES } from "@/types/production-tracking";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "on_hold", label: "On Hold" },
  ...PRODUCTION_STAGES.map((stage) => ({
    value: stage,
    label: PRODUCTION_STAGE_LABELS[stage],
  })),
];

const controlClass = "h-8 text-[12px]";

export function ProductionTrackingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [line, setLine] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [status, setStatus] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLine, setAppliedLine] = useState("");
  const [appliedSupervisorId, setAppliedSupervisorId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { data: snapshot, isLoading, error, refetch } = useProductionSnapshot();

  const { data: jobsData } = useProductionJobs({
    page: 1,
    pageSize: 50,
    search: appliedSearch || undefined,
    line: appliedLine || undefined,
    supervisorId: appliedSupervisorId || undefined,
    status: appliedStatus || undefined,
  });

  const startMutation = useStartProduction();
  const updateStageMutation = useUpdateProductionStage();
  const holdMutation = useHoldProductionJob();
  const releaseMutation = useReleaseToQc();

  const jobs = jobsData?.items ?? snapshot?.jobs ?? [];

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
      { value: "", label: "All lines" },
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

  const requireSelection = useCallback(() => {
    if (!selectedId) {
      toast.error("Select a job first");
      return false;
    }
    return true;
  }, [selectedId]);

  const handleStart = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      await startMutation.mutateAsync([selectedId]);
      toast.success("Production started");
    } catch {
      toast.error("Failed to start production");
    }
  };

  const handleUpdateStage = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      const result = await updateStageMutation.mutateAsync({ id: selectedId });
      toast.success(`Moved to ${result.statusLabel}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleHold = async () => {
    if (!requireSelection() || !selectedId) return;
    try {
      await holdMutation.mutateAsync({
        id: selectedId,
        reason: "Held from tracking workspace",
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

  const applyFilters = () => {
    setAppliedSearch(search);
    setAppliedLine(line);
    setAppliedSupervisorId(supervisorId);
    setAppliedStatus(status);
  };

  const resetFilters = () => {
    setSearch("");
    setLine("");
    setSupervisorId("");
    setStatus("");
    setAppliedSearch("");
    setAppliedLine("");
    setAppliedSupervisorId("");
    setAppliedStatus("");
  };

  return (
    <PageContainer
      maxWidth="full"
      className="flex min-h-0 flex-col !gap-0 !px-2 !py-2 sm:!px-3 lg:!px-4"
    >
      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load production tracking." : null}
        className="flex min-h-0 flex-1 flex-col"
      >
        {snapshot && (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Title + actions - full width */}
            <div className="col-span-1 flex flex-wrap items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
              <h1 className="mr-auto text-sm font-semibold tracking-tight text-foreground">
                Production Tracking
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
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
                  Stage
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
                </Button>
                <IconButton
                  variant="outline"
                  size="sm"
                  className="h-8 w-8"
                  aria-label="Refresh"
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={() => {
                    void refetch();
                    toast.success("Refreshed");
                  }}
                />
                <div className="relative">
                  <IconButton
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                    aria-label="More"
                    icon={<MoreHorizontal className="h-3.5 w-3.5" />}
                    onClick={() => setShowMoreMenu((open) => !open)}
                  />
                  {showMoreMenu && (
                    <div className="absolute right-0 z-20 mt-1 w-40 border border-border bg-popover py-1 shadow-md">
                      <button
                        type="button"
                        className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-muted"
                        onClick={() => {
                          setShowMoreMenu(false);
                          toast.message("Export queued");
                        }}
                      >
                        Export schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI cards - responsive multi-column */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
              <ProductionKpiCards kpis={snapshot.kpis} />
            </div>

            {/* Filters + actions - same row */}
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
                aria-label="Filter by line"
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
                {jobs.length} jobs · {snapshot.overdue.length} overdue
              </p>
            </div>

            {/* Pipeline - 3 cols on xl, full on smaller */}
            <div className="col-span-1 border border-border bg-card p-2 md:col-span-2 lg:col-span-2 xl:col-span-3">
              <ProductionPipeline stages={snapshot.pipeline} />
            </div>

            {/* Overdue beside pipeline on wide screens */}
            <div className="col-span-1 border border-border bg-card p-2 md:col-span-2 lg:col-span-1 xl:col-span-1">
              <OverdueMilestones
                items={snapshot.overdue}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            {/* Jobs table - 3 of 4 on xl, 2 of 3 on lg */}
            <div className="col-span-1 flex min-h-0 min-w-0 flex-col border border-border bg-card md:col-span-2 lg:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-2.5 py-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Jobs
                </p>
                <p className="text-[10px] text-muted-foreground">Scroll horizontally on narrow screens</p>
              </div>
              <div className="min-w-0 flex-1 overflow-auto p-1">
                <ProductionJobsTable
                  jobs={jobs}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>

            {/* Job detail - side column */}
            {/* Job detail - sticky side column on large screens */}
            <div className="col-span-1 max-h-[480px] overflow-auto border border-border bg-card p-2 md:col-span-2 lg:col-span-1 xl:col-span-1 xl:row-span-2 xl:max-h-[min(720px,calc(100dvh-220px))]">
              <ProductionJobDetailsPanel
                job={selectedJob}
                onUpdateStage={() => void handleUpdateStage()}
                updating={updateStageMutation.isPending}
                className="h-full min-h-[240px]"
              />
            </div>

            {/* Timeline - under table, beside detail on xl */}
            <div className="col-span-1 border border-border bg-card p-2 md:col-span-2 lg:col-span-3 xl:col-span-3">
              <ProductionTimeline
                blocks={snapshot.timeline}
                lines={snapshot.lines}
                selectedJobId={selectedId}
                onSelectJob={setSelectedId}
              />
            </div>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
