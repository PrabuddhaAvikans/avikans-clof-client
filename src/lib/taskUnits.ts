import { generateId } from "@/services/http";
import { calculateLaborCost } from "@/lib/laborCost";
import { loadCostingRates } from "@/lib/costingRates";
import { roundCost } from "@/lib/bomCosting";
import {
  CONTRIBUTION_TOTAL,
  hasCompleteContribution,
  roundPercent,
  splitContributionEqually,
} from "@/lib/taskContributors";
import type {
  ManufacturingTask,
  TaskContributor,
  TaskContributorInput,
  TaskContributorStatus,
  TaskUnit,
  TaskUnitAssignment,
  TaskUnitAssignmentStatus,
  TaskUnitStatus,
  TaskWorkerProgress,
} from "@/types/manufacturing";

const TOLERANCE = 0.05;
const COMPLETE = 100;

function clampProgress(value: number): number {
  return roundPercent(Math.min(COMPLETE, Math.max(0, Number(value) || 0)));
}

function assignmentStatusFromProgress(
  progress: number,
  previous?: TaskUnitAssignmentStatus,
): TaskUnitAssignmentStatus {
  if (progress >= COMPLETE) return "completed";
  if (progress > 0) return "in_progress";
  return previous ?? "assigned";
}

function unitStatusFromProgress(
  progress: number,
  hasAssignments: boolean,
): TaskUnitStatus {
  if (progress >= COMPLETE) return "completed";
  if (progress > 0 || hasAssignments) return "in_progress";
  if (hasAssignments) return "assigned";
  return "pending";
}

export function createTaskUnits(taskId: string, totalQuantity: number): TaskUnit[] {
  const total = Math.max(0, Math.floor(totalQuantity));
  return Array.from({ length: total }, (_, index) => ({
    id: generateId("tu"),
    taskId,
    unitNo: index + 1,
    progressPercentage: 0,
    status: "pending" as const,
    assignments: [],
  }));
}

export function ensureTaskUnits(task: ManufacturingTask): TaskUnit[] {
  if (task.units?.length) {
    return task.units.map((unit) => ({
      ...unit,
      assignments: unit.assignments ?? [],
    }));
  }
  return synthesizeUnitsFromLegacy(task);
}

/** Rebuild units from older tasks that only stored aggregate qty + contributors. */
export function synthesizeUnitsFromLegacy(task: ManufacturingTask): TaskUnit[] {
  const total = Math.max(0, Math.floor(task.plannedQuantity || 0));
  const units = createTaskUnits(task.id, total);
  if (total === 0) return units;

  const completed = Math.min(total, Math.max(0, Math.floor(task.completedQuantity || 0)));
  const people = (task.contributors ?? []).filter((person) => person.userId);
  let cursor = 0;

  // Mark fully completed units first.
  for (let i = 0; i < completed; i += 1) {
    const unit = units[i];
    unit.progressPercentage = COMPLETE;
    unit.status = "completed";
  }
  cursor = completed;

  // Allocate remaining in-progress / assigned qty from contributor quantities.
  const activePeople = people.filter(
    (person) =>
      person.status === "in_progress" ||
      person.status === "completed" ||
      person.status === "paused" ||
      person.status === "on_hold" ||
      (person.quantity || 0) > 0,
  );
  const remainingSlots = Math.max(0, total - cursor);
  const explicitQty = activePeople.reduce((sum, person) => sum + Math.max(0, Math.floor(person.quantity || 0)), 0);
  const openPeople = activePeople.filter(
    (person) => person.status === "in_progress" || person.status === "paused" || person.status === "on_hold",
  );

  for (const person of activePeople) {
    let count = Math.max(0, Math.floor(person.quantity || 0));
    if (count <= 0 && openPeople.includes(person) && remainingSlots > 0) {
      // Spread leftover started units across in-progress people when qty wasn't recorded.
      const share =
        explicitQty > 0
          ? 0
          : Math.ceil(remainingSlots / Math.max(1, openPeople.length));
      count = share;
    }
    for (let i = 0; i < count && cursor < total; i += 1) {
      const unit = units[cursor];
      cursor += 1;
      if (unit.progressPercentage >= COMPLETE) continue;
      const progress =
        person.status === "completed"
          ? COMPLETE
          : person.progressPercentage != null
            ? clampProgress(person.progressPercentage)
            : 0;
      unit.progressPercentage = progress > 0 ? progress : unit.progressPercentage;
      unit.status = unitStatusFromProgress(unit.progressPercentage, true);
      unit.assignments = [
        {
          id: generateId("tua"),
          taskUnitId: unit.id,
          userId: person.userId,
          userName: person.userName,
          contributionPercentage: CONTRIBUTION_TOTAL,
          status: assignmentStatusFromProgress(unit.progressPercentage, person.status),
          actualHours: person.actualHours || 0,
          overtimeHours: person.overtimeHours || 0,
          normalOvertimeHours: person.normalOvertimeHours || 0,
          doubleOvertimeHours: person.doubleOvertimeHours || 0,
          laborCost: person.laborCost || 0,
          rejectedQuantity: person.rejectedQuantity || 0,
          wasteQuantity: person.wasteQuantity || 0,
          startedAt: person.startedAt,
          pausedAt: person.pausedAt,
          completedAt: person.completedAt,
        },
      ];
    }
  }

  // If startedQuantity exceeds allocated, mark plain in-progress units without people.
  const started = Math.min(total, Math.max(0, Math.floor(task.startedQuantity || 0)));
  for (let i = 0; i < started; i += 1) {
    const unit = units[i];
    if (unit.assignments.length === 0 && unit.progressPercentage < COMPLETE) {
      unit.status = "in_progress";
    }
  }

  return units;
}

export function isUnitAllocated(unit: TaskUnit): boolean {
  return (unit.assignments?.length ?? 0) > 0 || unit.status !== "pending";
}

export function allocatedQuantity(units: TaskUnit[]): number {
  return units.filter((unit) => (unit.assignments?.length ?? 0) > 0 || unit.status !== "pending").length;
}

export function availableQuantity(units: TaskUnit[]): number {
  return units.filter((unit) => (unit.assignments?.length ?? 0) === 0 && unit.status === "pending")
    .length;
}

export function completedUnitCount(units: TaskUnit[]): number {
  return units.filter(
    (unit) => unit.progressPercentage >= COMPLETE || unit.status === "completed",
  ).length;
}

export function partiallyCompletedUnitCount(units: TaskUnit[]): number {
  return units.filter(
    (unit) => unit.progressPercentage > 0 && unit.progressPercentage < COMPLETE,
  ).length;
}

export function overallUnitProgress(units: TaskUnit[]): number {
  if (!units.length) return 0;
  const sum = units.reduce((total, unit) => total + clampProgress(unit.progressPercentage), 0);
  return roundPercent(sum / units.length);
}

export function deriveUnitStatus(unit: TaskUnit): TaskUnitStatus {
  if (unit.status === "cancelled") return "cancelled";
  return unitStatusFromProgress(unit.progressPercentage, (unit.assignments?.length ?? 0) > 0);
}

export function syncUnitDerived(unit: TaskUnit): TaskUnit {
  const progress = clampProgress(unit.progressPercentage);
  const assignments = (unit.assignments ?? []).map((assignment) => {
    const status =
      progress >= COMPLETE
        ? ("completed" as const)
        : assignment.status === "completed" && progress < COMPLETE
          ? ("in_progress" as const)
          : assignment.status;
    return {
      ...assignment,
      status,
      completedAt:
        status === "completed" ? (assignment.completedAt ?? new Date().toISOString()) : undefined,
    };
  });
  return {
    ...unit,
    progressPercentage: progress,
    status: unitStatusFromProgress(progress, assignments.length > 0),
    assignments,
  };
}

export function unallocatedUnits(units: TaskUnit[]): TaskUnit[] {
  return units.filter((unit) => (unit.assignments?.length ?? 0) === 0 && unit.status === "pending");
}

export function allocateUnitsToWorkers(
  units: TaskUnit[],
  workers: Array<{
    userId: string;
    userName: string;
    quantity: number;
    contributionPercent?: number;
  }>,
  now: string,
): TaskUnit[] {
  const next = units.map((unit) => ({
    ...unit,
    assignments: [...(unit.assignments ?? [])],
  }));
  let pool = unallocatedUnits(next).map((unit) => unit.unitNo);

  const requested = workers.reduce((sum, worker) => sum + Math.max(0, Math.floor(worker.quantity)), 0);
  if (requested > pool.length) {
    throw {
      code: "INVALID_STATE",
      message: `Only ${pool.length} quantit${pool.length === 1 ? "y" : "ies"} available to assign (requested ${requested}).`,
    };
  }

  for (const worker of workers) {
    const qty = Math.max(0, Math.floor(worker.quantity));
    if (qty <= 0) continue;
    const take = pool.slice(0, qty);
    pool = pool.slice(qty);
    for (const unitNo of take) {
      const unit = next.find((item) => item.unitNo === unitNo);
      if (!unit) continue;
      unit.assignments = [
        {
          id: generateId("tua"),
          taskUnitId: unit.id,
          userId: worker.userId,
          userName: worker.userName,
          contributionPercentage: CONTRIBUTION_TOTAL,
          status: "in_progress",
          actualHours: 0,
          overtimeHours: 0,
          normalOvertimeHours: 0,
          doubleOvertimeHours: 0,
          laborCost: 0,
          rejectedQuantity: 0,
          wasteQuantity: 0,
          startedAt: now,
        },
      ];
      unit.status = "in_progress";
    }
  }

  return next;
}

/**
 * Share the same physical units across multiple workers.
 * In-progress updates are allowed with any share split.
 * Completing (100%) requires shares to total 100%.
 */
export function assignSharedUnits(
  units: TaskUnit[],
  unitNos: number[],
  workers: Array<{
    userId: string;
    userName: string;
    contributionPercent: number;
    actualHours?: number;
    normalOvertimeHours?: number;
    doubleOvertimeHours?: number;
    rejectedQuantity?: number;
    wasteQuantity?: number;
  }>,
  progressPercentage: number,
  now: string,
  task?: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate" | "plannedQuantity">,
): TaskUnit[] {
  if (!unitNos.length) return units;

  const progress = clampProgress(progressPercentage);
  if (
    progress >= COMPLETE &&
    !hasCompleteContribution(workers.map((w) => ({ contributionPercent: w.contributionPercent })))
  ) {
    throw {
      code: "INVALID_STATE",
      message: `Worker shares must add up to 100% to complete shared quantity (currently ${roundPercent(
        workers.reduce((sum, w) => sum + (w.contributionPercent || 0), 0),
      )}%). Save progress until shares total 100%.`,
    };
  }
  const rates = loadCostingRates();
  const hoursPerUnit =
    task && task.plannedQuantity > 0 ? (task.estimatedHours || 0) / task.plannedQuantity : 0;

  return units.map((unit) => {
    if (!unitNos.includes(unit.unitNo)) return unit;
    if ((unit.assignments?.length ?? 0) > 0) {
      const existingIds = new Set(unit.assignments.map((a) => a.userId));
      const incomingIds = new Set(workers.map((w) => w.userId));
      const conflict = [...existingIds].some((id) => !incomingIds.has(id));
      if (conflict && unit.assignments.some((a) => !incomingIds.has(a.userId))) {
        // Allow overwrite only when re-recording the same shared set; otherwise block.
        const foreign = unit.assignments.filter((a) => !incomingIds.has(a.userId));
        if (foreign.length) {
          throw {
            code: "INVALID_STATE",
            message: `Quantity ${unit.unitNo} is already assigned to ${foreign.map((a) => a.userName).join(", ")}.`,
          };
        }
      }
    }

    const assignments: TaskUnitAssignment[] = workers.map((worker) => {
      const share = (worker.contributionPercent || 0) / 100;
      const estimatedHours = roundCost(hoursPerUnit * share);
      const labor = calculateLaborCost({
        actualHours: worker.actualHours ?? estimatedHours,
        estimatedHours,
        normalOvertimeHours: worker.normalOvertimeHours,
        doubleOvertimeHours: worker.doubleOvertimeHours,
        labourCostRate: task?.labourCostRate,
        rates,
      });
      return {
        id: generateId("tua"),
        taskUnitId: unit.id,
        userId: worker.userId,
        userName: worker.userName,
        contributionPercentage: roundPercent(worker.contributionPercent),
        status: assignmentStatusFromProgress(progress),
        actualHours: labor.actualHours,
        overtimeHours: labor.overtimeHours,
        normalOvertimeHours: labor.normalOvertimeHours,
        doubleOvertimeHours: labor.doubleOvertimeHours,
        laborCost: labor.laborCost,
        rejectedQuantity: worker.rejectedQuantity ?? 0,
        wasteQuantity: worker.wasteQuantity ?? 0,
        startedAt: now,
        completedAt: progress >= COMPLETE ? now : undefined,
      };
    });

    return syncUnitDerived({
      ...unit,
      progressPercentage: progress,
      assignments,
    });
  });
}

export function updateAssignedUnitProgress(
  units: TaskUnit[],
  updates: Array<{
    userId: string;
    userName: string;
    quantity: number;
    progressPercentage: number;
    contributionPercent?: number;
    actualHours?: number;
    normalOvertimeHours?: number;
    doubleOvertimeHours?: number;
    rejectedQuantity?: number;
    wasteQuantity?: number;
    unitNos?: number[];
  }>,
  now: string,
  task?: Pick<ManufacturingTask, "estimatedHours" | "labourCostRate" | "plannedQuantity">,
): TaskUnit[] {
  let next = units.map((unit) => ({
    ...unit,
    assignments: [...(unit.assignments ?? [])],
  }));

  // Shared-unit groups: people who explicitly target the same unitNos.
  const sharedGroups = new Map<string, typeof updates>();
  const solo: typeof updates = [];

  for (const update of updates) {
    if (update.unitNos?.length) {
      const key = [...update.unitNos].sort((a, b) => a - b).join(",");
      const group = sharedGroups.get(key) ?? [];
      group.push(update);
      sharedGroups.set(key, group);
    } else {
      solo.push(update);
    }
  }

  for (const [, group] of sharedGroups) {
    const unitNos = group[0]?.unitNos ?? [];
    const progress = group.reduce(
      (max, item) => Math.max(max, item.progressPercentage),
      0,
    );
    next = assignSharedUnits(
      next,
      unitNos,
      group.map((item) => ({
        userId: item.userId,
        userName: item.userName,
        contributionPercent: item.contributionPercent ?? CONTRIBUTION_TOTAL / group.length,
        actualHours: item.actualHours,
        normalOvertimeHours: item.normalOvertimeHours,
        doubleOvertimeHours: item.doubleOvertimeHours,
        rejectedQuantity: item.rejectedQuantity,
        wasteQuantity: item.wasteQuantity,
      })),
      progress,
      now,
      task,
    );
  }

  const rates = loadCostingRates();
  const hoursPerUnit =
    task && task.plannedQuantity > 0 ? (task.estimatedHours || 0) / task.plannedQuantity : 0;

  for (const update of solo) {
    const qty = Math.max(0, Math.floor(update.quantity));
    if (qty <= 0) continue;
    const progress = clampProgress(update.progressPercentage);

    // Prefer units already assigned to this worker that are not complete,
    // lowest progress first so sequential updates can target different units.
    const owned = next
      .filter(
        (unit) =>
          unit.assignments.some((a) => a.userId === update.userId) &&
          unit.progressPercentage < COMPLETE,
      )
      .sort((a, b) => a.progressPercentage - b.progressPercentage || a.unitNo - b.unitNo);
    const free = unallocatedUnits(next);
    const targets = [...owned, ...free].slice(0, qty);

    if (targets.length < qty) {
      throw {
        code: "INVALID_STATE",
        message: `Only ${targets.length} quantit${targets.length === 1 ? "y" : "ies"} available for ${update.userName} (requested ${qty}).`,
      };
    }

    const targetNos = new Set(targets.map((unit) => unit.unitNo));
    const ratesLocal = rates;
    const hoursPer = hoursPerUnit;
    next = next.map((unit) => {
      if (!targetNos.has(unit.unitNo)) return unit;
      const share = update.contributionPercent ?? CONTRIBUTION_TOTAL;
      const estimatedHours = roundCost(hoursPer * (share / 100));
      const hoursEach =
        update.actualHours != null && qty > 0 ? update.actualHours / qty : estimatedHours;
      const otEach =
        update.normalOvertimeHours != null && qty > 0
          ? update.normalOvertimeHours / qty
          : undefined;
      const dotEach =
        update.doubleOvertimeHours != null && qty > 0
          ? update.doubleOvertimeHours / qty
          : undefined;
      const labor = calculateLaborCost({
        actualHours: hoursEach,
        estimatedHours,
        normalOvertimeHours: otEach,
        doubleOvertimeHours: dotEach,
        labourCostRate: task?.labourCostRate,
        rates: ratesLocal,
      });
      const prev = unit.assignments.find((a) => a.userId === update.userId);
      const assignment: TaskUnitAssignment = {
        id: prev?.id ?? generateId("tua"),
        taskUnitId: unit.id,
        userId: update.userId,
        userName: update.userName,
        contributionPercentage: roundPercent(share),
        status: assignmentStatusFromProgress(progress, prev?.status),
        actualHours: labor.actualHours,
        overtimeHours: labor.overtimeHours,
        normalOvertimeHours: labor.normalOvertimeHours,
        doubleOvertimeHours: labor.doubleOvertimeHours,
        laborCost: labor.laborCost,
        rejectedQuantity:
          (update.rejectedQuantity ?? 0) > 0 && qty > 0
            ? roundPercent((update.rejectedQuantity ?? 0) / qty)
            : (prev?.rejectedQuantity ?? 0),
        wasteQuantity:
          (update.wasteQuantity ?? 0) > 0 && qty > 0
            ? roundPercent((update.wasteQuantity ?? 0) / qty)
            : (prev?.wasteQuantity ?? 0),
        startedAt: prev?.startedAt ?? now,
        pausedAt: undefined,
        completedAt: progress >= COMPLETE ? now : undefined,
      };
      return syncUnitDerived({
        ...unit,
        progressPercentage: progress,
        assignments: [
          ...unit.assignments.filter((a) => a.userId !== update.userId),
          assignment,
        ],
      });
    });
  }

  return next;
}

function aggregateAssignmentStatus(
  statuses: TaskUnitAssignmentStatus[],
  completedQuantity: number,
  assignedQuantity: number,
): TaskUnitAssignmentStatus {
  if (assignedQuantity > 0 && completedQuantity === assignedQuantity) return "completed";
  if (statuses.includes("in_progress")) return "in_progress";
  if (statuses.includes("on_hold")) return "on_hold";
  if (statuses.includes("paused")) return "paused";
  return "assigned";
}

/**
 * Update who is currently working. Unit progress percentages are left unchanged.
 */
export function setWorkerAssignmentStatus(
  units: TaskUnit[],
  employeeId: string | null,
  status: "paused" | "assigned" | "in_progress" | "on_hold",
  at: string,
): TaskUnit[] {
  return units.map((unit) => {
    if (unit.progressPercentage >= COMPLETE) return syncUnitDerived(unit);
    const assignments = (unit.assignments ?? []).map((assignment) => {
      if (employeeId && assignment.userId !== employeeId) return assignment;
      if (assignment.status === "completed") return assignment;
      if (status === "in_progress") {
        return {
          ...assignment,
          status,
          pausedAt: undefined,
          startedAt: assignment.startedAt ?? at,
        };
      }
      if (status === "paused" || status === "on_hold") {
        return { ...assignment, status, pausedAt: at };
      }
      return { ...assignment, status: "assigned" as const, pausedAt: at };
    });
    return syncUnitDerived({ ...unit, assignments });
  });
}

export function workerProgressFromUnits(units: TaskUnit[]): TaskWorkerProgress[] {
  const byUser = new Map<string, TaskWorkerProgress>();
  const rawStatuses = new Map<string, TaskUnitAssignmentStatus[]>();

  for (const unit of units) {
    for (const assignment of unit.assignments ?? []) {
      const statuses = rawStatuses.get(assignment.userId) ?? [];
      statuses.push(assignment.status);
      rawStatuses.set(assignment.userId, statuses);
      const existing = byUser.get(assignment.userId);
      const unitComplete = unit.progressPercentage >= COMPLETE;
      if (!existing) {
        byUser.set(assignment.userId, {
          userId: assignment.userId,
          userName: assignment.userName,
          assignedQuantity: 1,
          completedQuantity: unitComplete ? 1 : 0,
          inProgressQuantity: !unitComplete ? 1 : 0,
          progressPercentage: unit.progressPercentage,
          status: assignment.status,
          contributionPercentage: assignment.contributionPercentage,
          actualHours: assignment.actualHours,
          overtimeHours: assignment.overtimeHours,
          normalOvertimeHours: assignment.normalOvertimeHours,
          doubleOvertimeHours: assignment.doubleOvertimeHours,
          laborCost: assignment.laborCost,
          rejectedQuantity: assignment.rejectedQuantity,
          wasteQuantity: assignment.wasteQuantity,
          startedAt: assignment.startedAt,
          pausedAt: assignment.pausedAt,
          completedAt: assignment.completedAt,
        });
        continue;
      }
      existing.assignedQuantity += 1;
      if (unitComplete) existing.completedQuantity += 1;
      else existing.inProgressQuantity += 1;
      existing.progressPercentage = roundPercent(
        existing.progressPercentage + unit.progressPercentage,
      );
      existing.actualHours = roundPercent(existing.actualHours + assignment.actualHours);
      existing.overtimeHours = roundPercent(existing.overtimeHours + assignment.overtimeHours);
      existing.normalOvertimeHours = roundPercent(
        existing.normalOvertimeHours + assignment.normalOvertimeHours,
      );
      existing.doubleOvertimeHours = roundPercent(
        existing.doubleOvertimeHours + assignment.doubleOvertimeHours,
      );
      existing.laborCost = roundPercent(existing.laborCost + assignment.laborCost);
      existing.rejectedQuantity = roundPercent(
        existing.rejectedQuantity + assignment.rejectedQuantity,
      );
      existing.wasteQuantity = roundPercent(existing.wasteQuantity + assignment.wasteQuantity);
      existing.startedAt = existing.startedAt ?? assignment.startedAt;
      if (assignment.pausedAt) existing.pausedAt = assignment.pausedAt;
      if (assignment.completedAt) existing.completedAt = assignment.completedAt;
    }
  }

  return [...byUser.values()].map((worker) => {
    const progressPercentage = roundPercent(worker.progressPercentage / worker.assignedQuantity);
    const status = aggregateAssignmentStatus(
      rawStatuses.get(worker.userId) ?? [],
      worker.completedQuantity,
      worker.assignedQuantity,
    );
    return {
      ...worker,
      progressPercentage,
      status,
      contributionPercentage: roundPercent(worker.contributionPercentage / worker.assignedQuantity),
      completedAt: status === "completed" ? worker.completedAt : undefined,
    };
  });
}

export function contributorsFromUnits(units: TaskUnit[]): TaskContributor[] {
  return workerProgressFromUnits(units).map((worker) => ({
    userId: worker.userId,
    userName: worker.userName,
    contributionPercent: worker.contributionPercentage,
    quantity: worker.assignedQuantity,
    completedQuantity: worker.completedQuantity,
    inProgressQuantity: worker.inProgressQuantity,
    progressPercentage: worker.progressPercentage,
    rejectedQuantity: worker.rejectedQuantity,
    wasteQuantity: worker.wasteQuantity,
    actualHours: worker.actualHours,
    overtimeHours: worker.overtimeHours,
    normalOvertimeHours: worker.normalOvertimeHours,
    doubleOvertimeHours: worker.doubleOvertimeHours,
    laborCost: worker.laborCost,
    status: worker.status as TaskContributorStatus,
    startedAt: worker.startedAt,
    pausedAt: worker.pausedAt,
    completedAt: worker.completedAt,
  }));
}

export function applyUnitsToTask(
  task: ManufacturingTask,
  units: TaskUnit[],
): ManufacturingTask {
  const synced = units.map(syncUnitDerived);
  const completedQuantity = completedUnitCount(synced);
  const partiallyCompletedQuantity = partiallyCompletedUnitCount(synced);
  const overallProgress = overallUnitProgress(synced);
  const contributors = contributorsFromUnits(synced);
  const primary = contributors[0];
  const allComplete =
    synced.length > 0 && completedQuantity === synced.length && overallProgress >= COMPLETE;

  return {
    ...task,
    units: synced,
    contributors,
    plannedQuantity: synced.length || task.plannedQuantity,
    completedQuantity,
    partiallyCompletedQuantity,
    overallProgress,
    startedQuantity: allocatedQuantity(synced),
    assignedTo: primary?.userId ?? task.assignedTo,
    assignedToName: primary?.userName ?? task.assignedToName,
    operatorId: primary?.userId ?? task.operatorId,
    operatorName: primary?.userName ?? task.operatorName,
    actualHours: roundPercent(contributors.reduce((sum, person) => sum + (person.actualHours || 0), 0)),
    overtimeHours: roundPercent(
      contributors.reduce((sum, person) => sum + (person.overtimeHours || 0), 0),
    ),
    normalOvertimeHours: roundPercent(
      contributors.reduce((sum, person) => sum + (person.normalOvertimeHours || 0), 0),
    ),
    doubleOvertimeHours: roundPercent(
      contributors.reduce((sum, person) => sum + (person.doubleOvertimeHours || 0), 0),
    ),
    status: allComplete ? "completed" : task.status === "completed" ? "in_progress" : task.status,
    completedAt: allComplete ? (task.completedAt ?? new Date().toISOString()) : undefined,
  };
}

export function taskStatusFromUnits(
  task: Pick<ManufacturingTask, "status" | "isRequired">,
  units: TaskUnit[],
): ManufacturingTask["status"] {
  if (task.status === "cancelled" || task.status === "skipped" || task.status === "blocked") {
    return task.status;
  }
  if (!units.length) return task.status;
  const completed = completedUnitCount(units);
  if (completed === units.length) return "completed";
  if (allocatedQuantity(units) > 0 || overallUnitProgress(units) > 0) return "in_progress";
  return task.status === "on_hold" ? "on_hold" : task.status;
}

/**
 * Validate contributor inputs for quantity-wise progress updates.
 * In-progress saves are always allowed without share totals.
 * Completing shared quantity requires shares to total 100%.
 */
export function validateUnitContributorInputs(
  inputs: TaskContributorInput[],
  options: { availableOrOwned: number; finishing: boolean },
): void {
  const people = inputs.filter((person) => person.userId);
  if (!people.length) {
    throw {
      code: "INVALID_STATE",
      message: "Assign at least one person before updating this task.",
    };
  }

  const qtyTotal = people.reduce((sum, person) => sum + (Number(person.quantity) || 0), 0);
  if (qtyTotal - options.availableOrOwned > TOLERANCE) {
    throw {
      code: "INVALID_STATE",
      message: `Person quantities must not exceed available ${options.availableOrOwned} (currently ${roundPercent(qtyTotal)}).`,
    };
  }

  for (const person of people) {
    const share = person.contributionPercent ?? CONTRIBUTION_TOTAL;
    if (share < 0 || share > COMPLETE + TOLERANCE) {
      throw {
        code: "INVALID_STATE",
        message: "Each contribution must be between 0% and 100%.",
      };
    }
  }

  const attemptingComplete = people.some((person) => {
    const progress =
      person.progressPercentage != null
        ? person.progressPercentage
        : options.finishing
          ? COMPLETE
          : 0;
    return progress >= COMPLETE - TOLERANCE;
  });

  if (!attemptingComplete) return;

  const shared = people.filter((person) => person.unitNos?.length);
  if (!shared.length) return;

  const groups = new Map<string, TaskContributorInput[]>();
  for (const person of shared) {
    const key = [...(person.unitNos ?? [])].sort((a, b) => a - b).join(",");
    const group = groups.get(key) ?? [];
    group.push(person);
    groups.set(key, group);
  }
  for (const [, group] of groups) {
    if (!hasCompleteContribution(group)) {
      throw {
        code: "INVALID_STATE",
        message: `Worker shares must add up to 100% to complete shared quantity (currently ${roundPercent(
          group.reduce((sum, person) => sum + (person.contributionPercent || 0), 0),
        )}%). Save progress until shares total 100%.`,
      };
    }
  }
}

export function defaultUnitProgressForComplete(
  person: TaskContributorInput,
  finishingTask: boolean,
): number {
  if (person.progressPercentage != null) return clampProgress(person.progressPercentage);
  return finishingTask || (person.quantity ?? 0) > 0 ? COMPLETE : 0;
}

export function splitPercentsForPeople(count: number): number[] {
  return splitContributionEqually(count);
}
