import { delay, notFoundError } from "@/services/http";
import type { ProductionTrackingService } from "@/services/interfaces/productionTrackingService";
import { applyListQuery } from "@/services/mock/helpers";
import {
  findManufacturingJob,
  getManufacturingJobs,
  replaceManufacturingJob,
} from "@/services/mock/manufacturingStore";
import { MANUFACTURING_ACTOR } from "@/services/mock/mockManufacturingService";
import {
  applyHoldProductionJob,
  applyStartProductionJob,
  applyCompleteTask,
  currentTask,
  remainingQuantity,
} from "@/lib/manufacturingTasks";
import { commitGuardedTaskActionAsync } from "@/services/mock/guardedTaskAction";
import {
  buildProductionTrackingSnapshot,
  toProductionJobView,
} from "@/lib/productionTracking";

function requireJob(id: string) {
  const job = findManufacturingJob(id);
  if (!job) notFoundError("ProductionJob", id);
  return job;
}

export const mockProductionTrackingService: ProductionTrackingService = {
  async getSnapshot() {
    await delay();
    return buildProductionTrackingSnapshot(getManufacturingJobs());
  },

  async listJobs(filters) {
    await delay();
    let items = getManufacturingJobs().map(toProductionJobView);
    if (filters.line) {
      items = items.filter((job) => job.line === filters.line);
    }
    if (filters.supervisorId) {
      items = items.filter((job) => job.supervisorId === filters.supervisorId);
    }
    if (filters.status) {
      items = items.filter((job) => job.status === filters.status);
    }
    if (filters.priority) {
      items = items.filter((job) => job.priority === filters.priority);
    }
    if (filters.delayedOnly) {
      items = items.filter((job) => (job.overdueDays ?? 0) > 0);
    }
    return applyListQuery(items, filters, [
      "jobNumber",
      "salesOrderNumber",
      "productName",
      "productSku",
      "customerName",
      "supervisorName",
      "line",
      "statusLabel",
      "currentTaskName",
    ]);
  },

  async getJobById(id) {
    await delay();
    return toProductionJobView(requireJob(id));
  },

  async startProduction(ids) {
    await delay();
    for (const id of ids) {
      const job = requireJob(id);
      if (job.status === "completed" || job.status === "cancelled") continue;
      replaceManufacturingJob(applyStartProductionJob(job, MANUFACTURING_ACTOR));
    }
  },

  async updateStage(id) {
    await delay();
    const job = requireJob(id);
    const active = currentTask(job);
    if (!active) {
      throw {
        code: "INVALID_STATE",
        message: "No manufacturing task is ready to advance.",
      };
    }
    const updated =
      active.status === "in_progress"
        ? replaceManufacturingJob(
            applyCompleteTask(
              job,
              {
                type: "complete",
                taskId: active.id,
                completedQuantity: remainingQuantity(active),
              },
              MANUFACTURING_ACTOR,
            ),
          )
        : await commitGuardedTaskActionAsync(
            job.id,
            { type: "start", taskId: active.id },
            MANUFACTURING_ACTOR,
          );
    return toProductionJobView(updated);
  },

  async holdJob(id, reason) {
    await delay();
    const updated = applyHoldProductionJob(requireJob(id), reason, MANUFACTURING_ACTOR);
    replaceManufacturingJob(updated);
    return toProductionJobView(updated);
  },

  async releaseToQc(id) {
    await delay();
    const job = requireJob(id);
    const qcTask = job.tasks.find((task) => task.isQcTask && task.isEnabled && !task.isRework);
    if (!qcTask) {
      throw {
        code: "INVALID_STATE",
        message: "This product version has no QC manufacturing task.",
      };
    }
    if (qcTask.status === "pending") {
      throw {
        code: "INVALID_STATE",
        message: "QC is not ready. Complete required prerequisite tasks first.",
      };
    }
    const updated =
      qcTask.status === "ready" || qcTask.status === "rework_required"
        ? await commitGuardedTaskActionAsync(
            job.id,
            { type: "start", taskId: qcTask.id },
            MANUFACTURING_ACTOR,
          )
        : job;
    if (updated !== job) replaceManufacturingJob(updated);
    return toProductionJobView(updated);
  },
};
