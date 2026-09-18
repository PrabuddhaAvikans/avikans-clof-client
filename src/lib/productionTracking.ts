import { ManufacturingJobStatus } from "@/types/status";
import type { ManufacturingJob, ManufacturingTask } from "@/types/manufacturing";
import type {
  ProductionJob,
  ProductionKpis,
  ProductionTrackingSnapshot,
  TimelineBlock,
} from "@/types/production-tracking";
import {
  calculateJobLaborBreakdown,
  currentTask,
  remainingQuantity,
} from "@/lib/manufacturingTasks";

function toStageStatus(task: ManufacturingTask): string {
  if (task.status === "completed" || task.status === "skipped") return "completed";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "ready") return "ready";
  return "pending";
}

export function toProductionJobView(job: ManufacturingJob): ProductionJob {
  const active = currentTask(job);
  const currentTaskName = active?.name ?? ManufacturingJobStatus[job.status]?.label ?? job.status;
  const materialIssued = job.materialRequirements.reduce((sum, mr) => sum + mr.issuedQuantity, 0);
  const materialConsumed = job.materialRequirements.reduce(
    (sum, mr) => sum + Math.min(mr.issuedQuantity, mr.requiredQuantity),
    0,
  );
  const labor = calculateJobLaborBreakdown(job);
  const laborHours = labor.actualHours;
  const estimatedHours = job.tasks.reduce((sum, task) => sum + task.estimatedHours, 0);
  const overdueDays =
    job.status !== "completed" && job.status !== "cancelled" && new Date(job.plannedEndDate) < new Date()
      ? Math.ceil((Date.now() - new Date(job.plannedEndDate).getTime()) / 86_400_000)
      : undefined;
  const qcOpen =
    job.qualityInspection && job.qualityInspection.status !== "passed" ? 1 : 0;
  const qcClosed = job.qualityInspection?.status === "passed" ? 1 : 0;
  const blockers = job.tasks
    .filter((task) => task.status === "blocked" || task.status === "on_hold")
    .map((task) => `${task.name}: ${task.status.replace(/_/g, " ")}`);

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    salesOrderNumber: job.salesOrderNumber,
    productName: job.productName,
    productSku: job.productSku,
    customerName: job.customerName,
    quantity: job.quantity,
    priority: job.priority,
    currentTaskName,
    line: currentTaskName,
    supervisorId: job.assignedTo ?? "",
    supervisorName: job.assignedToName ?? "Unassigned",
    startDate: job.plannedStartDate,
    dueDate: job.plannedEndDate,
    completionPercent: job.progressPercent,
    status: job.status,
    statusLabel: ManufacturingJobStatus[job.status]?.label ?? job.status,
    stages: job.tasks
      .filter((task) => !task.isRework)
      .map((task) => ({
        id: task.id,
        name: task.name,
        sequence: task.sequence,
        status: toStageStatus(task),
        plannedQuantity: task.plannedQuantity,
        completedQuantity: task.completedQuantity,
        completedAt: task.completedAt,
      })),
    materialIssued,
    materialConsumed,
    materialUnit: job.materialRequirements[0]?.unit ?? "pcs",
    materialsReady:
      job.materialRequirements.length === 0 ||
      job.materialRequirements.every(
        (mr) =>
          mr.status === "issued" ||
          mr.status === "reserved" ||
          mr.reservedQuantity >= mr.requiredQuantity,
      ),
    blockers,
    laborHours,
    overtimeHours: labor.overtimeHours,
    normalOvertimeHours: labor.normalOvertimeHours,
    doubleOvertimeHours: labor.doubleOvertimeHours,
    laborCost: labor.laborCost,
    overtimeCost: labor.overtimeCost,
    estimatedCost: job.estimatedCost,
    actualCost: job.actualCost,
    qualityOpen: qcOpen,
    qualityClosed: qcClosed,
    elapsedHours: laborHours,
    remainingHours: Math.max(0, estimatedHours - laborHours),
    overdueDays,
  };
}

export function buildProductionTrackingSnapshot(
  jobs: ManufacturingJob[],
): ProductionTrackingSnapshot {
  const views = jobs.map(toProductionJobView);
  const inProduction = views.filter(
    (job) =>
      job.status === "in_progress" ||
      job.status === "ready_to_start" ||
      job.status === "quality_check" ||
      job.status === "rework",
  ).length;
  const onHold = views.filter((job) => job.status === "on_hold").length;
  const inQualityCheck = views.filter((job) => job.status === "quality_check").length;
  const delayedJobs = views.filter((job) => (job.overdueDays ?? 0) > 0).length;
  const readyToShip = views.filter((job) => job.status === "completed").length;

  const kpis: ProductionKpis = {
    jobsInProduction: inProduction,
    jobsInProductionTrend: 0,
    onHold,
    onHoldTrend: 0,
    inQualityCheck,
    inQualityCheckTrend: 0,
    delayedJobs,
    delayedJobsTrend: 0,
    readyToShip,
    readyToShipTrend: 0,
  };

  const lines = [...new Set(views.map((job) => job.line).filter(Boolean))];
  const supervisors = [
    ...new Map(
      views
        .filter((job) => job.supervisorId)
        .map((job) => [job.supervisorId, { id: job.supervisorId, name: job.supervisorName }]),
    ).values(),
  ];

  const timeline: TimelineBlock[] = views
    .filter((job) => job.status !== "completed" && job.status !== "cancelled")
    .map((job, index) => {
      const startHour = 7 + (index % 4) * 1.5;
      const span = Math.min(4, Math.max(1.5, job.remainingHours / 4));
      return {
        id: `${job.id}-tl`,
        jobId: job.id,
        jobNumber: job.jobNumber,
        line: job.line,
        label: job.currentTaskName,
        startHour,
        endHour: startHour + span,
      };
    });

  return {
    kpis,
    jobs: views,
    timeline,
    lines,
    supervisors,
  };
}

export function remainingOnCurrentTask(job: ManufacturingJob): number {
  const active = currentTask(job);
  return active ? remainingQuantity(active) : 0;
}
