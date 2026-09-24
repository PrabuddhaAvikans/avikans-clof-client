/**
 * Adapters from live ManufacturingJob state into period-close snapshots.
 * Progress is read from task units — never reset or force-completed on close.
 */

import { applyPauseTask } from "@/lib/manufacturingTasks";
import {
  ensureTaskUnits,
  workerProgressFromUnits,
} from "@/lib/taskUnits";
import type {
  ActiveWorkerSession,
} from "@/lib/period-close/workerSessions";
import type {
  MonthlyProductionSnapshotSource,
  ProductionSnapshotSource,
} from "@/lib/period-close/snapshots";
import type {
  ManufacturingJob,
  ManufacturingTask,
  TaskActionActor,
  TaskUnit,
} from "@/types/manufacturing";
import type { ManufacturingJobStatusValue } from "@/types/status";

const ACTIVE_JOB_STATUSES = new Set<ManufacturingJobStatusValue>([
  "planned",
  "materials_pending",
  "ready_to_start",
  "in_progress",
  "on_hold",
  "quality_check",
  "rework",
]);

const OPEN_JOB_STATUSES = new Set<ManufacturingJobStatusValue>([
  "draft",
  "planned",
  "materials_pending",
  "ready_to_start",
  "in_progress",
  "on_hold",
  "quality_check",
  "rework",
]);

function isEnabledTask(task: ManufacturingTask): boolean {
  return task.isEnabled !== false;
}

function unitsForTask(task: ManufacturingTask): TaskUnit[] {
  return ensureTaskUnits(task);
}

function unitPercentsForWorker(units: TaskUnit[], workerId: string): number[] {
  return units
    .filter((unit) => unit.assignments?.some((a) => a.userId === workerId))
    .map((unit) => unit.progressPercentage ?? 0);
}

function taskWorkedMinutes(task: ManufacturingTask): number {
  const hours = Number(task.actualHours) || 0;
  return Math.round(hours * 60);
}

/**
 * Build end-of-day production snapshot sources from live jobs.
 * Includes in-progress AND completed jobs so Day Close reflects finished work.
 * One row per worker when units are allocated; otherwise one row per task.
 */
export function jobsToProductionSnapshotSources(
  jobs: ManufacturingJob[],
): ProductionSnapshotSource[] {
  const sources: ProductionSnapshotSource[] = [];

  for (const job of jobs) {
    if (!ACTIVE_JOB_STATUSES.has(job.status) && job.status !== "completed") {
      continue;
    }

    for (const task of job.tasks) {
      if (!isEnabledTask(task)) continue;

      // Skip untouched pending tasks on open jobs; still include on completed jobs.
      if (
        job.status !== "completed" &&
        task.status === "pending" &&
        (task.overallProgress ?? 0) <= 0
      ) {
        continue;
      }

      const units = unitsForTask(task);
      const workers = workerProgressFromUnits(units);
      const activeWorkers = workers.filter(
        (worker) =>
          worker.assignedQuantity > 0 &&
          (worker.progressPercentage > 0 ||
            worker.status === "in_progress" ||
            worker.status === "paused" ||
            worker.status === "completed"),
      );

      if (activeWorkers.length > 0) {
        for (const worker of activeWorkers) {
          const percents = unitPercentsForWorker(units, worker.userId);
          if (percents.length === 0) continue;
          sources.push({
            productionOrderId: job.id,
            productionOrderNumber: job.jobNumber,
            operationId: task.id,
            operationName: task.name,
            workerId: worker.userId,
            workerName: worker.userName,
            unitProgressPercentages: percents,
            workedMinutes: Math.round((worker.actualHours || 0) * 60),
            producedQty: worker.completedQuantity,
            rejectedQty: worker.rejectedQuantity,
            jobStatus: job.status,
            taskStatus: task.status,
          });
        }
        continue;
      }

      if (units.length === 0 && (task.overallProgress ?? 0) <= 0 && job.status !== "completed") {
        continue;
      }

      const percents =
        units.length > 0
          ? units.map((unit) => unit.progressPercentage ?? 0)
          : Array.from({ length: Math.max(1, task.plannedQuantity || job.quantity || 1) }, () =>
              job.status === "completed" ? 100 : (task.overallProgress ?? 0),
            );

      sources.push({
        productionOrderId: job.id,
        productionOrderNumber: job.jobNumber,
        operationId: task.id,
        operationName: task.name,
        unitProgressPercentages: percents,
        workedMinutes: taskWorkedMinutes(task),
        producedQty:
          job.status === "completed"
            ? task.plannedQuantity || job.quantity || task.completedQuantity || 0
            : task.completedQuantity ?? 0,
        rejectedQty: task.rejectedQuantity ?? 0,
        jobStatus: job.status,
        taskStatus: task.status,
      });
    }
  }

  return sources;
}

/**
 * Derive active worker "sessions" from in-progress assignments / tasks.
 * Manufacturing has no separate session table — assignments are the source of truth.
 */
export function jobsToActiveWorkerSessions(
  jobs: ManufacturingJob[],
): ActiveWorkerSession[] {
  const sessions: ActiveWorkerSession[] = [];

  for (const job of jobs) {
    if (job.status !== "in_progress" && job.status !== "on_hold") continue;

    for (const task of job.tasks) {
      if (!isEnabledTask(task)) continue;
      if (task.status !== "in_progress") continue;

      const units = unitsForTask(task);
      const workers = workerProgressFromUnits(units);
      const liveWorkers = workers.filter(
        (worker) =>
          worker.status === "in_progress" ||
          (worker.inProgressQuantity > 0 && worker.status !== "completed"),
      );

      if (liveWorkers.length === 0) {
        // Task running without unit allocation — treat assigned operator / first contributor as session.
        const fallbackId = task.operatorId ?? task.assignedTo ?? "unassigned";
        const fallbackName =
          task.operatorName ?? task.assignedToName ?? "Unassigned worker";
        sessions.push({
          sessionId: `${task.id}:${fallbackId}`,
          workerId: fallbackId,
          workerName: fallbackName,
          productionOrderId: job.id,
          operationId: task.id,
          operationName: task.name,
          progressPercentage: task.overallProgress ?? 0,
          startedAt: task.startedAt ?? job.actualStartDate ?? job.updatedAt,
        });
        continue;
      }

      for (const worker of liveWorkers) {
        sessions.push({
          sessionId: `${task.id}:${worker.userId}`,
          workerId: worker.userId,
          workerName: worker.userName,
          productionOrderId: job.id,
          operationId: task.id,
          operationName: task.name,
          progressPercentage: worker.progressPercentage,
          startedAt:
            worker.startedAt ?? task.startedAt ?? job.actualStartDate ?? job.updatedAt,
        });
      }
    }
  }

  return sessions;
}

/**
 * Month-end WIP sources from open production jobs (cost-to-date, not % × selling price).
 */
export function jobsToMonthlyProductionSources(
  jobs: ManufacturingJob[],
): MonthlyProductionSnapshotSource[] {
  const sources: MonthlyProductionSnapshotSource[] = [];

  for (const job of jobs) {
    if (!OPEN_JOB_STATUSES.has(job.status)) continue;

    for (const task of job.tasks) {
      if (!isEnabledTask(task)) continue;

      const units = unitsForTask(task);
      const totalQty = units.length || task.plannedQuantity || job.quantity || 0;
      const completedQty =
        units.length > 0
          ? units.filter((u) => (u.progressPercentage ?? 0) >= 100).length
          : task.completedQuantity ?? 0;
      const workInProgressQty = Math.max(0, totalQty - completedQty);
      const progressPercentage =
        units.length > 0
          ? Math.round(
              (units.reduce((sum, u) => sum + (u.progressPercentage ?? 0), 0) /
                units.length) *
                100,
            ) / 100
          : task.overallProgress ?? job.progressPercent ?? 0;

      const materialConsumed = (task.materialsUsed ?? []).reduce(
        (sum, m) => sum + (m.quantity || 0),
        0,
      );
      const materialConsumedValue = (task.materialsUsed ?? []).reduce(
        (sum, m) => sum + (m.cost || 0),
        0,
      );
      const laborHours =
        (task.actualHours || 0) +
        (task.overtimeHours || 0);
      const laborCostToDate =
        task.actualCost ??
        (task.contributors ?? []).reduce((sum, c) => sum + (c.laborCost || 0), 0);

      // Skip untouched pending tasks with zero progress to keep WIP focused.
      if (progressPercentage <= 0 && task.status === "pending") continue;

      sources.push({
        productionOrderId: job.id,
        productionOrderNumber: job.jobNumber,
        operationId: task.id,
        operationName: task.name,
        totalQty,
        completedQty,
        workInProgressQty,
        progressPercentage,
        materialConsumed,
        laborHours,
        estimatedCost: job.estimatedCost || 0,
        actualCostToDate: job.actualCost || laborCostToDate + materialConsumedValue,
        materialConsumedValue,
        laborCostToDate,
      });
    }
  }

  return sources;
}

export function countInProgressProductionJobs(jobs: ManufacturingJob[]): number {
  return jobs.filter((job) => OPEN_JOB_STATUSES.has(job.status)).length;
}

export function summarizeLiveProductionActivity(jobs: ManufacturingJob[]): {
  productionJobs: number;
  completedJobs: number;
  openJobs: number;
  completedProductionQty: number;
  partialProductionQty: number;
  activeSessionCount: number;
} {
  const open = jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status));
  const completed = jobs.filter((job) => job.status === "completed");
  const tracked = [...open, ...completed];

  let completedProductionQty = 0;
  let partialProductionQty = 0;

  for (const job of tracked) {
    for (const task of job.tasks) {
      if (!isEnabledTask(task)) continue;
      const units = unitsForTask(task);
      if (units.length > 0) {
        completedProductionQty += units.filter((u) => (u.progressPercentage ?? 0) >= 100).length;
        partialProductionQty += units.filter((u) => {
          const p = u.progressPercentage ?? 0;
          return p > 0 && p < 100;
        }).length;
      } else if (job.status === "completed") {
        completedProductionQty += task.plannedQuantity || task.completedQuantity || 0;
      } else {
        completedProductionQty += task.completedQuantity ?? 0;
        partialProductionQty += task.partiallyCompletedQuantity ?? 0;
      }
    }
  }

  return {
    productionJobs: tracked.length,
    completedJobs: completed.length,
    openJobs: open.length,
    completedProductionQty,
    partialProductionQty,
    activeSessionCount: jobsToActiveWorkerSessions(jobs).length,
  };
}

/**
 * Pause in-progress manufacturing tasks for Day Close.
 * Preserves unit progress; does not mark tasks or jobs completed.
 */
export function pauseActiveManufacturingForDayClose(
  jobs: ManufacturingJob[],
  actor: TaskActionActor,
  notes = "Paused automatically by Day Close checkpoint",
): {
  updatedJobs: ManufacturingJob[];
  pausedTaskIds: string[];
} {
  const pausedTaskIds: string[] = [];
  const updatedJobs = jobs.map((job) => {
    let next = job;
    for (const task of job.tasks) {
      if (task.status !== "in_progress") continue;
      try {
        next = applyPauseTask(
          next,
          { type: "pause", taskId: task.id, notes },
          actor,
        );
        pausedTaskIds.push(task.id);
      } catch {
        // Skip tasks that cannot be paused (race / already changed).
      }
    }
    return next;
  });

  return { updatedJobs, pausedTaskIds };
}
