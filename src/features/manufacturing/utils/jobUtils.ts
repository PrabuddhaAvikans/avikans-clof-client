import type { ManufacturingJob } from "@/types/manufacturing";

export function calculateJobProgress(job: ManufacturingJob): number {
  if (job.operations.length === 0) {
    return job.status === "completed" ? 100 : 0;
  }
  const completed = job.operations.filter((op) => op.status === "completed").length;
  return Math.round((completed / job.operations.length) * 100);
}

export function areMaterialsReady(job: ManufacturingJob): boolean {
  if (job.materialRequirements.length === 0) {
    return true;
  }
  return job.materialRequirements.every(
    (mr) =>
      mr.status === "issued" ||
      mr.status === "reserved" ||
      mr.reservedQuantity >= mr.requiredQuantity,
  );
}

export function isJobDelayed(job: ManufacturingJob): boolean {
  if (job.status === "completed" || job.status === "cancelled") {
    return false;
  }
  return new Date(job.plannedEndDate) < new Date();
}

export function getJobWorkshops(job: ManufacturingJob): string[] {
  return [...new Set(job.operations.map((op) => op.workstation))];
}

export function getPrimaryWorkshop(job: ManufacturingJob): string {
  const inProgress = job.operations.find((op) => op.status === "in_progress");
  if (inProgress) {
    return inProgress.workstation;
  }
  const pending = job.operations.find((op) => op.status === "pending");
  return pending?.workstation ?? job.operations[0]?.workstation ?? "—";
}
