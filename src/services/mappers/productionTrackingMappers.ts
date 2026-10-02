import type {
  ProductionJob,
  ProductionTrackingSnapshot,
} from "@/types/production-tracking";

export function mapProductionJob(raw: Record<string, unknown>): ProductionJob {
  return {
    id: String(raw.id),
    jobNumber: String(raw.jobNumber ?? ""),
    salesOrderNumber: String(raw.salesOrderNumber ?? ""),
    productName: String(raw.productName ?? ""),
    productSku: String(raw.productSku ?? ""),
    productImageUrl: raw.productImageUrl as string | undefined,
    customerName: String(raw.customerName ?? ""),
    quantity: Number(raw.quantity ?? 0),
    priority: (raw.priority as ProductionJob["priority"]) ?? "medium",
    currentTaskName: String(raw.currentTaskName ?? ""),
    line: String(raw.line ?? ""),
    supervisorId: String(raw.supervisorId ?? ""),
    supervisorName: String(raw.supervisorName ?? ""),
    startDate: String(raw.startDate ?? new Date().toISOString()),
    dueDate: String(raw.dueDate ?? new Date().toISOString()),
    completionPercent: Number(raw.completionPercent ?? 0),
    status: (raw.status as ProductionJob["status"]) ?? "draft",
    statusLabel: String(raw.statusLabel ?? ""),
    completedAt: raw.completedAt as string | undefined,
    stages: (raw.stages as ProductionJob["stages"]) ?? [],
    materialIssued: Number(raw.materialIssued ?? 0),
    materialConsumed: Number(raw.materialConsumed ?? 0),
    materialUnit: String(raw.materialUnit ?? "pcs"),
    materialsReady: Boolean(raw.materialsReady),
    blockers: ((raw.blockers as string[]) ?? []).map(String),
    laborHours: Number(raw.laborHours ?? 0),
    overtimeHours: Number(raw.overtimeHours ?? 0),
    normalOvertimeHours: Number(raw.normalOvertimeHours ?? 0),
    doubleOvertimeHours: Number(raw.doubleOvertimeHours ?? 0),
    laborCost: Number(raw.laborCost ?? 0),
    overtimeCost: Number(raw.overtimeCost ?? 0),
    estimatedCost: Number(raw.estimatedCost ?? 0),
    actualCost: Number(raw.actualCost ?? 0),
    qualityOpen: Number(raw.qualityOpen ?? 0),
    qualityClosed: Number(raw.qualityClosed ?? 0),
    elapsedHours: Number(raw.elapsedHours ?? 0),
    remainingHours: Number(raw.remainingHours ?? 0),
    overdueDays: raw.overdueDays as number | undefined,
  };
}

export function mapSnapshot(raw: Record<string, unknown>): ProductionTrackingSnapshot {
  const kpis = (raw.kpis as Record<string, unknown>) ?? {};
  return {
    kpis: {
      jobsInProduction: Number(kpis.jobsInProduction ?? 0),
      jobsInProductionTrend: Number(kpis.jobsInProductionTrend ?? 0),
      onHold: Number(kpis.onHold ?? 0),
      onHoldTrend: Number(kpis.onHoldTrend ?? 0),
      inQualityCheck: Number(kpis.inQualityCheck ?? 0),
      inQualityCheckTrend: Number(kpis.inQualityCheckTrend ?? 0),
      delayedJobs: Number(kpis.delayedJobs ?? 0),
      delayedJobsTrend: Number(kpis.delayedJobsTrend ?? 0),
      readyToShip: Number(kpis.readyToShip ?? 0),
      readyToShipTrend: Number(kpis.readyToShipTrend ?? 0),
    },
    jobs: ((raw.jobs as unknown[]) ?? []).map((job) =>
      mapProductionJob(job as Record<string, unknown>),
    ),
    timeline: ((raw.timeline as unknown[]) ?? []).map((block) => {
      const item = block as Record<string, unknown>;
      return {
        id: String(item.id),
        jobId: String(item.jobId),
        jobNumber: String(item.jobNumber ?? ""),
        line: String(item.line ?? ""),
        label: String(item.label ?? ""),
        startHour: Number(item.startHour ?? 0),
        endHour: Number(item.endHour ?? 0),
      };
    }),
    lines: ((raw.lines as string[]) ?? []).map(String),
    supervisors: ((raw.supervisors as { id?: string; name?: string }[]) ?? []).map((s) => ({
      id: String(s.id),
      name: String(s.name ?? ""),
    })),
  };
}
