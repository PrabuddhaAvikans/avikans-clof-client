import type { ManufacturingJob, ManufacturingTask } from "@/types/manufacturing";
import {
  calculateTaskProgressPercent,
  currentTask,
  remainingQuantity,
  taskQuantityProgressPercent,
} from "@/lib/manufacturingTasks";

export function calculateJobProgress(job: ManufacturingJob): number {
  if (typeof job.progressPercent === "number") {
    return job.progressPercent;
  }
  return calculateTaskProgressPercent(job.tasks ?? []);
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
  return [
    ...new Set(
      job.tasks
        .map((task) => task.workstation || task.machineName)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function getPrimaryWorkshop(job: ManufacturingJob): string {
  const active = currentTask(job);
  return active?.workstation || active?.machineName || job.tasks[0]?.workstation || "-";
}

export function getCurrentTaskName(job: ManufacturingJob): string {
  return currentTask(job)?.name ?? "-";
}

export function taskQuantityLabel(task: ManufacturingTask): string {
  return `${task.completedQuantity}/${task.plannedQuantity}`;
}

export function taskQuantityProgress(task: ManufacturingTask): number {
  return taskQuantityProgressPercent(task);
}

export function taskRemainingLabel(task: ManufacturingTask): string {
  return String(remainingQuantity(task));
}
