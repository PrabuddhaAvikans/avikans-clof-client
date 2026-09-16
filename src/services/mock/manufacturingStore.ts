import { loadSystemSettings } from "@/lib/systemSettings";
import type { ManufacturingJob } from "@/types/manufacturing";
import { cloneData } from "@/services/mock/helpers";
import { initialManufacturingJobs } from "@/services/mock/data/manufacturing";

let manufacturingJobs = cloneData(initialManufacturingJobs);

export function getManufacturingJobs(): ManufacturingJob[] {
  return manufacturingJobs;
}

export function findManufacturingJob(id: string): ManufacturingJob | undefined {
  return manufacturingJobs.find((job) => job.id === id);
}

export function replaceManufacturingJob(job: ManufacturingJob): ManufacturingJob {
  const index = manufacturingJobs.findIndex((item) => item.id === job.id);
  if (index === -1) {
    manufacturingJobs.push(job);
  } else {
    manufacturingJobs[index] = job;
  }
  return job;
}

export function addManufacturingJob(job: ManufacturingJob): ManufacturingJob {
  manufacturingJobs.push(job);
  return job;
}

export function removeManufacturingJob(id: string): boolean {
  const index = manufacturingJobs.findIndex((job) => job.id === id);
  if (index === -1) return false;
  manufacturingJobs.splice(index, 1);
  return true;
}

export function nextProductionJobNumber(): string {
  const used = manufacturingJobs
    .map((job) => Number.parseInt(job.jobNumber.replace(/\D/g, ""), 10))
    .filter((value) => Number.isFinite(value));
  const next = Math.max(1000, ...used, 1000) + 1;
  const prefix = loadSystemSettings().jobPrefix || "PJ";
  return `${prefix}-${next}`;
}
