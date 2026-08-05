import { delay, notFoundError, nowIso } from "@/services/http";
import type { ProductionTrackingService } from "@/services/interfaces/productionTrackingService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialProductionSnapshot } from "@/services/mock/data/production-tracking";
import type { ProductionJob } from "@/types/production-tracking";
import { PRODUCTION_STAGES, PRODUCTION_STAGE_LABELS } from "@/types/production-tracking";

let snapshot = {
  ...initialProductionSnapshot,
  jobs: cloneData(initialProductionSnapshot.jobs),
  timeline: cloneData(initialProductionSnapshot.timeline),
  overdue: cloneData(initialProductionSnapshot.overdue),
  pipeline: cloneData(initialProductionSnapshot.pipeline),
};

function findJob(id: string): ProductionJob {
  const job = snapshot.jobs.find((item) => item.id === id);
  if (!job) notFoundError("ProductionJob", id);
  return job;
}

function advanceStage(job: ProductionJob): void {
  if (job.status === "on_hold" || job.status === "packed") return;
  const index = PRODUCTION_STAGES.indexOf(job.status);
  if (index < 0 || index >= PRODUCTION_STAGES.length - 1) return;
  const next = PRODUCTION_STAGES[index + 1];
  job.status = next;
  job.statusLabel = PRODUCTION_STAGE_LABELS[next];
  job.stages = job.stages.map((stage) => {
    const stageIndex = PRODUCTION_STAGES.indexOf(stage.stage);
    if (stageIndex < index + 1) {
      return { ...stage, status: "completed", completedAt: stage.completedAt ?? nowIso() };
    }
    if (stageIndex === index + 1) {
      return { ...stage, status: "in_progress" };
    }
    return { ...stage, status: "pending", completedAt: undefined };
  });
  job.completionPercent = Math.min(100, Math.round(((index + 2) / PRODUCTION_STAGES.length) * 100));
}

export const mockProductionTrackingService: ProductionTrackingService = {
  async getSnapshot() {
    await delay();
    return {
      ...snapshot,
      jobs: cloneData(snapshot.jobs),
      timeline: cloneData(snapshot.timeline),
      overdue: cloneData(snapshot.overdue),
      pipeline: cloneData(snapshot.pipeline),
      kpis: { ...snapshot.kpis },
      lines: [...snapshot.lines],
      supervisors: [...snapshot.supervisors],
    };
  },

  async listJobs(filters) {
    await delay();
    let items = cloneData(snapshot.jobs);
    if (filters.line) {
      items = items.filter((job) => job.line === filters.line);
    }
    if (filters.supervisorId) {
      items = items.filter((job) => job.supervisorId === filters.supervisorId);
    }
    if (filters.status) {
      items = items.filter((job) => job.status === filters.status);
    }
    return applyListQuery(items, filters, [
      "jobNumber",
      "salesOrderNumber",
      "productName",
      "productSku",
      "supervisorName",
      "line",
      "statusLabel",
    ]);
  },

  async getJobById(id) {
    await delay();
    return { ...findJob(id), stages: cloneData(findJob(id).stages) };
  },

  async startProduction(ids) {
    await delay();
    for (const id of ids) {
      const job = findJob(id);
      if (job.status === "order_confirmed") {
        advanceStage(job);
      }
    }
  },

  async updateStage(id) {
    await delay();
    const job = findJob(id);
    advanceStage(job);
    return { ...job, stages: cloneData(job.stages) };
  },

  async holdJob(id, reason) {
    await delay();
    const job = findJob(id);
    job.status = "on_hold";
    job.statusLabel = "On Hold";
    if (reason) {
      job.blockers = [...job.blockers, reason];
    }
    return { ...job, stages: cloneData(job.stages) };
  },

  async releaseToQc(id) {
    await delay();
    const job = findJob(id);
    job.status = "qc";
    job.statusLabel = PRODUCTION_STAGE_LABELS.qc;
    job.completionPercent = Math.max(job.completionPercent, 90);
    job.stages = job.stages.map((stage) => {
      const stageIndex = PRODUCTION_STAGES.indexOf(stage.stage);
      const qcIndex = PRODUCTION_STAGES.indexOf("qc");
      if (stageIndex < qcIndex) {
        return { ...stage, status: "completed", completedAt: stage.completedAt ?? nowIso() };
      }
      if (stage.stage === "qc") {
        return { ...stage, status: "in_progress" };
      }
      return { ...stage, status: "pending" };
    });
    return { ...job, stages: cloneData(job.stages) };
  },
};
