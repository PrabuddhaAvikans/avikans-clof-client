import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Eye, XCircle } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  useManufacturingJobs,
  useManufacturingTaskAction,
} from "@/features/manufacturing/hooks/useManufacturing";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDateTime } from "@/lib/format";
import type { ManufacturingJob, QualityInspection } from "@/types/manufacturing";
import { ManufacturingJobStatus } from "@/types/status";

type InspectionResult = "passed" | "failed" | "conditional" | "rework";

const DEFAULT_CHECKLIST = [
  "Dimensional accuracy within tolerance",
  "Surface finish meets specification",
  "Electrical safety test passed",
  "Packaging and labeling correct",
  "Documentation complete",
];

export function QualityInspectionPage() {
  const { data, isLoading, error, refetch } = useManufacturingJobs({
    page: 1,
    pageSize: 100,
  });
  const taskAction = useManufacturingTaskAction();

  const [selectedJob, setSelectedJob] = useState<ManufacturingJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checklist, setChecklist] = useState<
    { id: string; name: string; passed: boolean | null }[]
  >([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<InspectionResult>("passed");
  const [failedTaskId, setFailedTaskId] = useState("");

  const inspectionJobs = useMemo(
    () =>
      (data?.items ?? []).filter(
        (job) =>
          job.status === "quality_check" ||
          job.status === "rework" ||
          job.qualityInspection ||
          job.tasks.some((task) => task.isQcTask && (task.status === "ready" || task.status === "in_progress" || task.status === "rework_required")),
      ),
    [data?.items],
  );

  const openInspection = (job: ManufacturingJob) => {
    setSelectedJob(job);
    setChecklist(
      DEFAULT_CHECKLIST.map((name, index) => ({
        id: `chk-${index}`,
        name,
        passed: job.qualityInspection?.checklistItems[index]?.passed ?? null,
      })),
    );
    setNotes(job.qualityInspection?.notes ?? "");
    setResult(
      (job.qualityInspection?.status as InspectionResult) ?? "passed",
    );
    setFailedTaskId("");
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedJob) return;
    const inspection: QualityInspection = {
      id: selectedJob.qualityInspection?.id ?? `qi-${Date.now()}`,
      inspectionNumber: selectedJob.qualityInspection?.inspectionNumber ?? `QI-${selectedJob.jobNumber}`,
      inspectorId: "usr-006",
      inspectorName: "Quality Inspector",
      status: result === "passed" ? "passed" : result === "failed" ? "failed" : "rework",
      checklistItems: checklist.map((item) => ({
        ...item,
        notes: undefined,
      })),
      inspectedAt: new Date().toISOString(),
      notes,
    };

    try {
      await taskAction.mutateAsync({
        id: selectedJob.id,
        action: {
          type: "qc",
          result: result === "passed" ? "passed" : result === "failed" ? "failed" : "rework",
          inspection,
          failedTaskId: result === "passed" ? undefined : failedTaskId || undefined,
          reason: notes || (result === "passed" ? undefined : "QC failed"),
          quantity: selectedJob.quantity,
        },
      });
      toast.success(`Inspection ${result} for ${selectedJob.jobNumber}`);
      setDrawerOpen(false);
      void refetch();
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to save inspection";
      toast.error(message);
    }
  };

  const columns = useMemo<ColumnDef<ManufacturingJob>[]>(
    () => [
      {
        id: "jobNumber",
        accessorKey: "jobNumber",
        header: "Job #",
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => row.original.productName,
      },
      {
        id: "customer",
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        id: "status",
        header: "Job Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={statusVariant(ManufacturingJobStatus, row.original.status)}
            size="sm"
          >
            {statusLabel(ManufacturingJobStatus, row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "inspection",
        header: "Inspection",
        cell: ({ row }) =>
          row.original.qualityInspection ? (
            <StatusBadge variant="info" size="sm">
              {row.original.qualityInspection.status}
            </StatusBadge>
          ) : (
            <StatusBadge variant="warning" size="sm">
              Pending
            </StatusBadge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={() => openInspection(row.original)}
          >
            Inspect
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Quality Inspection"
        description="Record and review quality checks for manufacturing jobs."
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Quality Inspection" },
        ]}
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load jobs" : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && inspectionJobs.length === 0}
        emptyTitle="No jobs awaiting inspection"
        loadingVariant="table"
      >
        <DataTable data={inspectionJobs} columns={columns} getRowId={(row) => row.id} />
      </PageContent>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Inspect - ${selectedJob?.jobNumber ?? ""}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={taskAction.isPending} onClick={() => void handleSubmit()}>
              Save Inspection
            </Button>
          </>
        }
      >
        {selectedJob && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">{selectedJob.productName}</p>
              <p className="text-muted-foreground">{selectedJob.customerName}</p>
              {selectedJob.qualityInspection?.inspectedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last inspected: {formatDateTime(selectedJob.qualityInspection.inspectedAt)}
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Checklist</h3>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-sm">{item.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={item.passed === true ? "success" : "outline"}
                        leftIcon={<CheckCircle className="h-3 w-3" />}
                        onClick={() =>
                          setChecklist((prev) =>
                            prev.map((c) =>
                              c.id === item.id ? { ...c, passed: true } : c,
                            ),
                          )
                        }
                      >
                        Pass
                      </Button>
                      <Button
                        size="sm"
                        variant={item.passed === false ? "danger" : "outline"}
                        leftIcon={<XCircle className="h-3 w-3" />}
                        onClick={() =>
                          setChecklist((prev) =>
                            prev.map((c) =>
                              c.id === item.id ? { ...c, passed: false } : c,
                            ),
                          )
                        }
                      >
                        Fail
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Result</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["passed", "failed", "conditional", "rework"] as InspectionResult[]).map(
                  (r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResult(r)}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                        result === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ),
                )}
              </div>
            </div>

            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />

            {result !== "passed" && (
              <Select
                label="Problem task"
                value={failedTaskId}
                onChange={(event) => setFailedTaskId(event.target.value)}
                options={[
                  { value: "", label: "Select the task that needs rework" },
                  ...selectedJob.tasks
                    .filter((task) => !task.isRework && !task.isQcTask)
                    .map((task) => ({
                      value: task.id,
                      label: `${task.taskNumber} ${task.name}`,
                    })),
                ]}
              />
            )}

            <Link
              to={ROUTES.manufacturing.jobDetail(selectedJob.id)}
              className="text-sm text-primary hover:underline"
            >
              View full job details
            </Link>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
