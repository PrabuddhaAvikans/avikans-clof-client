import { generateId, nowIso } from "@/services/http";
import type { ProductOperation } from "@/types/product";
import type { ActiveSessionSwitch } from "@/types/employee-work";
import type {
  ManufacturingJob,
  ManufacturingRework,
  ManufacturingTask,
  ManufacturingTaskAction,
  ManufacturingTaskHistoryAction,
  ManufacturingTaskHistoryEntry,
  QualityInspection,
  TaskActionActor,
  TaskMaterialUsage,
} from "@/types/manufacturing";
import type { ManufacturingTaskStatus } from "@/types/manufacturing";
import { loadCostingRates } from "@/lib/costingRates";
import {
  addLaborBreakdowns,
  calculateEstimatedLaborCost,
  calculateLaborCost,
  emptyLaborBreakdown,
  resolveLabourRatePerHour,
  type LaborCostBreakdown,
} from "@/lib/laborCost";
import {
  allocateByShares,
  defaultCompleteContributors,
  quantityTotal,
  resetContributorProgress,
  resolveTaskContributors,
  setContributorStatus,
  uniqueContributorInputs,
} from "@/lib/taskContributors";
import {
  allocateUnitsToWorkers,
  applyUnitsToTask,
  availableQuantity as availableUnitQuantity,
  completedUnitCount,
  createTaskUnits,
  defaultUnitProgressForComplete,
  ensureTaskUnits,
  overallUnitProgress,
  setWorkerAssignmentStatus,
  taskStatusFromUnits,
  updateAssignedUnitProgress,
  validateUnitContributorInputs,
  workerProgressFromUnits,
} from "@/lib/taskUnits";

const TERMINAL_STATUSES: ManufacturingTaskStatus[] = [
  "completed",
  "skipped",
  "cancelled",
];

const SATISFIED_PREREQ_STATUSES: ManufacturingTaskStatus[] = [
  "completed",
  "skipped",
];

export function remainingQuantity(task: ManufacturingTask): number {
  const units = ensureTaskUnits(task);
  if (units.length > 0) {
    return Math.max(0, units.length - completedUnitCount(units));
  }
  return Math.max(0, task.plannedQuantity - task.completedQuantity);
}

/** Quantities not yet allocated to any worker — used when starting work. */
export function availableQuantity(task: ManufacturingTask): number {
  return availableUnitQuantity(ensureTaskUnits(task));
}

export function remainingEstimatedHours(task: Pick<ManufacturingTask, "estimatedHours" | "plannedQuantity" | "completedQuantity" | "units" | "id">): number {
  const units = task.units?.length ? task.units : undefined;
  const planned = Math.max(0, (units?.length ?? task.plannedQuantity) || 0);
  const completed = units ? completedUnitCount(units) : Math.max(0, task.completedQuantity || 0);
  const remaining = Math.max(0, planned - completed);
  if (planned <= 0) return round2(Math.max(0, task.estimatedHours || 0));
  return round2(((task.estimatedHours || 0) * remaining) / planned);
}

export function isQcOperation(op: {
  name: string;
  isQualityCheck?: boolean;
}): boolean {
  if (op.isQualityCheck) return true;
  return /\bqc\b|quality/i.test(op.name);
}

export function isTestingOperation(op: { name: string }): boolean {
  return /\btest/i.test(op.name);
}

export function formatDurationHours(hours: number | undefined | null): string {
  if (hours == null || Number.isNaN(hours)) return "-";
  if (hours === 0) return "0m";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatOvertimeBreakdown(labor: {
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  overtimeHours?: number;
}): string {
  const normal = labor.normalOvertimeHours ?? 0;
  const double = labor.doubleOvertimeHours ?? 0;
  const parts: string[] = [];
  if (normal > 0) parts.push(`${formatDurationHours(normal)} OT`);
  if (double > 0) parts.push(`${formatDurationHours(double)} DOT`);
  if (parts.length > 0) return parts.join(" · ");
  if ((labor.overtimeHours ?? 0) > 0) return formatDurationHours(labor.overtimeHours);
  return "None";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundProgress(value: number): number {
  return Math.round(value * 100) / 100;
}

function invalidState(message: string): never {
  throw { code: "INVALID_STATE", message };
}

function findTask(job: ManufacturingJob, taskId: string): ManufacturingTask {
  const task = job.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw { code: "NOT_FOUND", message: `Manufacturing task '${taskId}' was not found.` };
  }
  return task;
}

export function createHistoryEntry(
  taskId: string,
  actor: TaskActionActor,
  action: ManufacturingTaskHistoryAction,
  oldStatus?: ManufacturingTaskStatus,
  newStatus?: ManufacturingTaskStatus,
  comments?: string,
  occurredAt = nowIso(),
): ManufacturingTaskHistoryEntry {
  return {
    id: generateId("th"),
    taskId,
    userId: actor.userId,
    userName: actor.userName,
    occurredAt,
    action,
    oldStatus,
    newStatus,
    comments,
  };
}

function withHistory(
  task: ManufacturingTask,
  actor: TaskActionActor,
  action: ManufacturingTaskHistoryAction,
  newStatus: ManufacturingTaskStatus | undefined,
  comments?: string,
): ManufacturingTask {
  const entry = createHistoryEntry(
    task.id,
    actor,
    action,
    task.status,
    newStatus ?? task.status,
    comments,
  );
  return {
    ...task,
    status: newStatus ?? task.status,
    history: [...task.history, entry],
  };
}

export function requiredTasks(tasks: ManufacturingTask[]): ManufacturingTask[] {
  return tasks.filter(
    (task) => task.isEnabled && task.isRequired && task.status !== "cancelled",
  );
}

export function isTaskSatisfiedForCompletion(task: ManufacturingTask): boolean {
  if (!task.isEnabled) return true;
  if (!task.isRequired) {
    return TERMINAL_STATUSES.includes(task.status);
  }
  return task.status === "completed";
}

function arePrerequisitesMet(
  task: ManufacturingTask,
  tasks: ManufacturingTask[],
): boolean {
  if (task.prerequisiteTaskIds.length === 0) return true;
  return task.prerequisiteTaskIds.every((prereqId) => {
    const prereq = tasks.find((item) => item.id === prereqId);
    if (!prereq) return true;
    if (!prereq.isRequired) {
      return SATISFIED_PREREQ_STATUSES.includes(prereq.status);
    }
    return prereq.status === "completed";
  });
}

export function applyTaskReadiness(
  tasks: ManufacturingTask[],
  actor?: TaskActionActor,
): ManufacturingTask[] {
  return tasks.map((task) => {
    if (
      task.status !== "pending" &&
      task.status !== "blocked"
    ) {
      return task;
    }
    if (!arePrerequisitesMet(task, tasks)) {
      return task.status === "blocked" ? { ...task, status: "pending" } : task;
    }
    if (!actor) {
      return { ...task, status: "ready" };
    }
    return withHistory(task, actor, "ready", "ready", "Prerequisites satisfied");
  });
}

export function taskQuantityProgressPercent(
  task: Pick<
    ManufacturingTask,
    "status" | "plannedQuantity" | "completedQuantity" | "overallProgress" | "units"
  >,
): number {
  if (task.status === "completed" || task.status === "skipped") return 100;
  if (task.status === "cancelled") return 0;
  if (task.units?.length) {
    return overallUnitProgress(task.units);
  }
  if (typeof task.overallProgress === "number") {
    return roundProgress(task.overallProgress);
  }
  if (task.plannedQuantity <= 0) return 0;
  return roundProgress(
    Math.min(100, (Math.max(0, task.completedQuantity) / task.plannedQuantity) * 100),
  );
}

function earnedTaskQuantity(task: ManufacturingTask): number {
  const units = ensureTaskUnits(task);
  if (units.length > 0) {
    return units.reduce((sum, unit) => sum + unit.progressPercentage / 100, 0);
  }
  const planned = Math.max(task.plannedQuantity, 0);
  if (task.status === "completed" || task.status === "skipped") return planned;
  if (task.status === "cancelled") return 0;
  return Math.min(Math.max(task.completedQuantity, 0), planned);
}

export function calculateTaskProgressPercent(tasks: ManufacturingTask[]): number {
  const required = requiredTasks(tasks).filter((task) => !task.isRework || task.status !== "cancelled");
  const tracked = required.length > 0 ? required : tasks.filter((task) => task.isEnabled);
  if (tracked.length === 0) return 0;

  const totalQuantity = tracked.reduce((sum, task) => {
    const units = ensureTaskUnits(task);
    return sum + (units.length || Math.max(task.plannedQuantity, 0));
  }, 0);
  if (totalQuantity <= 0) {
    const completed = tracked.filter(
      (task) => task.status === "completed" || task.status === "skipped",
    ).length;
    return roundProgress((completed / tracked.length) * 100);
  }

  const earned = tracked.reduce((sum, task) => sum + earnedTaskQuantity(task), 0);
  return roundProgress((earned / totalQuantity) * 100);
}

export function calculateJobEstimatedCost(job: Pick<ManufacturingJob, "tasks" | "quantity">): number {
  const rates = loadCostingRates();
  return round2(
    job.tasks.reduce((sum, task) => {
      if (!task.isEnabled || task.isRework) return sum;
      const labour = calculateEstimatedLaborCost(task.estimatedHours, task.labourCostRate, rates);
      const machine = task.machineCost ?? 0;
      return sum + labour + machine;
    }, 0),
  );
}

export function calculateTaskLaborCost(
  task: Pick<
    ManufacturingTask,
    | "actualHours"
    | "estimatedHours"
    | "overtimeHours"
    | "normalOvertimeHours"
    | "doubleOvertimeHours"
    | "labourCostRate"
    | "contributors"
  >,
): LaborCostBreakdown {
  const people = (task.contributors ?? []).filter(
    (person) =>
      (person.actualHours ?? 0) > 0 ||
      (person.normalOvertimeHours ?? 0) > 0 ||
      (person.doubleOvertimeHours ?? 0) > 0 ||
      (person.laborCost ?? 0) > 0,
  );
  if (people.length > 0) {
    const rates = loadCostingRates();
    return people.reduce(
      (sum, person) =>
        addLaborBreakdowns(
          sum,
          calculateLaborCost({
            actualHours: person.actualHours ?? 0,
            estimatedHours: task.estimatedHours * ((person.contributionPercent || 0) / 100),
            overtimeHours: person.overtimeHours,
            normalOvertimeHours: person.normalOvertimeHours,
            doubleOvertimeHours: person.doubleOvertimeHours,
            labourCostRate: task.labourCostRate,
            rates,
          }),
          rates,
        ),
      emptyLaborBreakdown(rates),
    );
  }
  return calculateLaborCost({
    actualHours: task.actualHours ?? 0,
    estimatedHours: task.estimatedHours,
    overtimeHours: task.overtimeHours,
    normalOvertimeHours: task.normalOvertimeHours,
    doubleOvertimeHours: task.doubleOvertimeHours,
    labourCostRate: task.labourCostRate,
  });
}

export function calculateJobLaborBreakdown(
  job: Pick<ManufacturingJob, "tasks">,
): LaborCostBreakdown {
  const rates = loadCostingRates();
  return job.tasks.reduce<LaborCostBreakdown>(
    (sum, task) => {
      if (!task.isEnabled) return sum;
      const labor = calculateTaskLaborCost(task);
      if (labor.actualHours <= 0 && labor.laborCost <= 0) return sum;
      return addLaborBreakdowns(sum, labor, rates);
    },
    emptyLaborBreakdown(rates),
  );
}

export function calculateJobActualCost(job: Pick<ManufacturingJob, "tasks" | "reworks">): number {
  const laborCost = calculateJobLaborBreakdown(job).laborCost;
  const taskCost = job.tasks.reduce((sum, task) => {
    if (!task.isEnabled) return sum;
    const materials = task.materialsUsed.reduce((m, item) => m + (item.cost ?? 0), 0);
    const machine =
      task.status === "completed" || task.status === "skipped" ? (task.machineCost ?? 0) : 0;
    return sum + materials + machine;
  }, 0);
  const reworkCost = job.reworks.reduce(
    (sum, rework) => sum + (rework.additionalCost ?? 0),
    0,
  );
  return round2(laborCost + taskCost + reworkCost);
}

export function isQcPassed(job: ManufacturingJob): boolean {
  const qcTasks = job.tasks.filter((task) => task.isQcTask && task.isRequired && task.isEnabled);
  if (qcTasks.length > 0) {
    const allQcComplete = qcTasks.every((task) => task.status === "completed");
    if (!allQcComplete) return false;
    if (job.qualityInspection?.status === "failed" || job.qualityInspection?.status === "rework") {
      return false;
    }
    return true;
  }
  if (job.qualityInspection) {
    return job.qualityInspection.status === "passed";
  }
  return true;
}

export function isProductionJobCompletable(job: ManufacturingJob): boolean {
  if (job.status === "cancelled") return false;
  const required = requiredTasks(job.tasks);
  if (required.length === 0) return false;
  const allRequiredDone = required.every((task) => task.status === "completed");
  return allRequiredDone && isQcPassed(job);
}

function deriveJobStatus(job: ManufacturingJob): ManufacturingJob["status"] {
  if (job.status === "cancelled" || job.status === "draft") return job.status;
  if (isProductionJobCompletable(job)) return "completed";

  const openRework = job.tasks.some(
    (task) =>
      task.isRework &&
      task.status !== "completed" &&
      task.status !== "cancelled" &&
      task.status !== "skipped",
  );
  if (openRework || job.status === "rework") {
    if (job.tasks.some((task) => task.status === "in_progress")) return "rework";
    if (openRework) return "rework";
  }

  const qcTask = job.tasks.find((task) => task.isQcTask && task.isEnabled);
  if (
    qcTask &&
    (qcTask.status === "ready" || qcTask.status === "in_progress") &&
    job.status !== "on_hold"
  ) {
    return "quality_check";
  }

  if (job.status === "on_hold") return "on_hold";
  if (job.status === "materials_pending") return "materials_pending";

  if (job.tasks.some((task) => task.status === "in_progress")) return "in_progress";
  if (job.actualStartDate) return "in_progress";
  if (job.status === "ready_to_start" || job.status === "planned") return job.status;
  return job.status;
}

export function refreshJobDerivedFields(
  job: ManufacturingJob,
  actor?: TaskActionActor,
): ManufacturingJob {
  const tasks = applyTaskReadiness(
    job.tasks.map((task) => {
      const units = ensureTaskUnits(task);
      if (task.units?.length) return task;
      return applyUnitsToTask({ ...task, status: task.status }, units);
    }),
    actor,
  );
  const next: ManufacturingJob = {
    ...job,
    tasks,
    progressPercent: calculateTaskProgressPercent(tasks),
    estimatedCost: calculateJobEstimatedCost({ ...job, tasks }),
    actualCost: calculateJobActualCost({ ...job, tasks }),
  };
  const status = deriveJobStatus(next);
  if (status === "completed" && job.status !== "completed") {
    return {
      ...next,
      status,
      actualEndDate: job.actualEndDate ?? nowIso(),
      progressPercent: 100,
      updatedAt: nowIso(),
    };
  }
  return {
    ...next,
    status,
    actualEndDate: status === "completed" ? (job.actualEndDate ?? nowIso()) : undefined,
    updatedAt: nowIso(),
  };
}

function padTaskNumber(index: number): string {
  return `TASK-${String(index).padStart(3, "0")}`;
}

export function generateTasksFromOperations(options: {
  jobId: string;
  quantity: number;
  operations: ProductOperation[];
  actor: TaskActionActor;
  createdAt?: string;
}): ManufacturingTask[] {
  const { jobId, quantity, actor } = options;
  const createdAt = options.createdAt ?? nowIso();
  const defaultLabourRate = loadCostingRates().labourRatePerHour;
  const enabled = options.operations
    .filter((op) => op.isEnabled !== false)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);

  const operationToTaskId = new Map<string, string>();
  const tasks: ManufacturingTask[] = enabled.map((op, index) => {
    const id = generateId("tsk");
    operationToTaskId.set(op.id, id);
    const estimatedHours = round2(op.estimatedHours * quantity);
    const machineCost =
      op.machineCost != null ? round2(op.machineCost * quantity) : undefined;
    const task: ManufacturingTask = {
      id,
      taskNumber: padTaskNumber(index + 1),
      productionJobId: jobId,
      productOperationId: op.id,
      sequence: op.sequence,
      name: op.name,
      description: op.description,
      isRequired: op.isRequired !== false,
      isEnabled: op.isEnabled !== false,
      isQcTask: isQcOperation(op),
      isTestingTask: isTestingOperation(op),
      isRework: false,
      estimatedHours,
      labourCostRate: op.labourCostRate ?? defaultLabourRate,
      machineName: op.machineName,
      machineCost,
      plannedQuantity: quantity,
      completedQuantity: 0,
      partiallyCompletedQuantity: 0,
      rejectedQuantity: 0,
      reworkQuantity: 0,
      wasteQuantity: 0,
      startedQuantity: 0,
      overallProgress: 0,
      units: createTaskUnits(id, quantity),
      status: "pending",
      notes: op.notes,
      prerequisiteTaskIds: [],
      history: [
        createHistoryEntry(id, actor, "created", undefined, "pending", "Generated from product version operation", createdAt),
      ],
      materialsUsed: [],
      contributors: [],
      workstation: op.workstation,
    };
    return task;
  });

  const resolved = tasks.map((task, index) => {
    const op = enabled[index];
    let prereqOpIds: string[];
    if (op.prerequisiteOperationIds) {
      prereqOpIds = op.prerequisiteOperationIds;
    } else if (index === 0) {
      prereqOpIds = [];
    } else {
      prereqOpIds = [enabled[index - 1].id];
    }
    const prerequisiteTaskIds = prereqOpIds
      .map((opId) => operationToTaskId.get(opId))
      .filter((id): id is string => Boolean(id));
    return { ...task, prerequisiteTaskIds };
  });

  return applyTaskReadiness(resolved, actor);
}

export function applyStartProductionJob(
  job: ManufacturingJob,
  actor: TaskActionActor,
): ManufacturingJob {
  if (job.status === "completed" || job.status === "cancelled") {
    invalidState("A completed or cancelled job cannot be started.");
  }
  const started = refreshJobDerivedFields(
    {
      ...job,
      status: "in_progress",
      actualStartDate: job.actualStartDate ?? nowIso(),
    },
    actor,
  );
  return started;
}

export function applyStartTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "start" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status === "on_hold" || task.status === "paused") {
    return applyResumeTask(job, { type: "resume", taskId: task.id, notes: action.notes }, actor);
  }
  if (task.status !== "ready" && task.status !== "rework_required") {
    invalidState(`Task "${task.name}" must be Ready before it can be started.`);
  }
  if (!arePrerequisitesMet(task, job.tasks)) {
    invalidState(`Task "${task.name}" is waiting on prerequisite tasks.`);
  }

  const now = nowIso();
  const units = ensureTaskUnits(task);
  const available = availableUnitQuantity(units);
  const quantityStarted = Math.min(
    action.quantityStarted ?? available,
    available,
  );
  if (quantityStarted <= 0) {
    invalidState(
      `No available quantity left to start on "${task.name}". Allocated ${task.plannedQuantity - available} of ${task.plannedQuantity}.`,
    );
  }
  const operatorId = action.operatorId ?? action.assignedTo ?? actor.userId;
  const operatorName = action.operatorName ?? action.assignedToName ?? actor.userName;
  const existingContributors = resolveTaskContributors(task);
  const selectedPeople =
    action.contributors && action.contributors.length > 0
      ? action.contributors
      : existingContributors.length > 0
        ? existingContributors
        : [{ userId: operatorId, userName: operatorName, contributionPercent: 0 }];

  // Allocate physical units without double-counting. Split started qty across selected people.
  const perPerson =
    selectedPeople.length <= 1
      ? [quantityStarted]
      : (() => {
          const base = Math.floor(quantityStarted / selectedPeople.length);
          const parts = selectedPeople.map(() => base);
          parts[0] += quantityStarted - base * selectedPeople.length;
          return parts;
        })();

  const allocated = allocateUnitsToWorkers(
    units,
    selectedPeople.map((person, index) => ({
      userId: person.userId,
      userName: person.userName,
      quantity: perPerson[index] ?? 0,
    })),
    now,
  );
  const withUnits = applyUnitsToTask(
    {
      ...task,
      machineName: action.machineName ?? task.machineName,
      startedAt: task.startedAt ?? now,
      pausedAt: undefined,
      notes: action.notes ?? task.notes,
      status: "in_progress",
    },
    allocated,
  );
  const workers = workerProgressFromUnits(allocated);
  const updatedTask = withHistory(
    withUnits,
    actor,
    "started",
    "in_progress",
    action.notes ??
      `Started qty ${quantityStarted} (${available - quantityStarted} available)${
        workers.length
          ? ` · ${workers.map((w) => `${w.userName}×${w.assignedQuantity}`).join(", ")}`
          : ""
      }`,
  );

  const nextStatus: ManufacturingJob["status"] =
    job.status === "draft" || job.status === "planned" || job.status === "ready_to_start"
      ? "in_progress"
      : job.status;

  return refreshJobDerivedFields(
    {
      ...job,
      status: nextStatus,
      actualStartDate: job.actualStartDate ?? now,
      tasks: job.tasks.map((item) => (item.id === task.id ? updatedTask : item)),
    },
    actor,
  );
}

export function applyPauseTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "pause" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status !== "in_progress") {
    invalidState(`Task "${task.name}" is not in progress.`);
  }
  const now = nowIso();
  const units = setWorkerAssignmentStatus(ensureTaskUnits(task), null, "paused", now);
  const withUnits = applyUnitsToTask({ ...task, pausedAt: now }, units);
  const updated = withHistory(withUnits, actor, "paused", "paused", action.notes);
  return refreshJobDerivedFields({
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

/**
 * Close one employee's active work on a task.
 * Progress percentages are preserved. The task is not completed or cancelled.
 * Pause keeps the assignment paused. Stop leaves the person assigned, not working.
 * The task becomes Paused only when nobody else is still in progress.
 */
export function applyReleaseWorker(
  job: ManufacturingJob,
  input: {
    taskId: string;
    employeeId: string;
    mode: "pause" | "stop";
    notes?: string;
  },
  actor: TaskActionActor,
): ManufacturingJob {
  const task = job.tasks.find((item) => item.id === input.taskId);
  if (!task) return job;
  if (task.status === "completed" || task.status === "cancelled" || task.status === "skipped") {
    return job;
  }

  const now = nowIso();
  const source = ensureTaskUnits(task);
  const before = source.map((unit) => unit.progressPercentage);
  const units = setWorkerAssignmentStatus(
    source,
    input.employeeId,
    input.mode === "pause" ? "paused" : "assigned",
    now,
  );
  const after = units.map((unit) => unit.progressPercentage);
  if (before.some((value, index) => Math.abs(value - (after[index] ?? value)) > 0.001)) {
    invalidState("Task progress cannot be changed when pausing or stopping a work session.");
  }

  const anyoneWorking = units.some((unit) =>
    unit.assignments.some((assignment) => assignment.status === "in_progress"),
  );
  const nextStatus = anyoneWorking ? task.status : "paused";
  const withUnits = applyUnitsToTask(
    { ...task, pausedAt: input.mode === "pause" ? now : task.pausedAt },
    units,
  );
  const updated = withHistory(
    withUnits,
    actor,
    input.mode === "pause" ? "paused" : "stopped",
    nextStatus,
    input.notes,
  );
  return refreshJobDerivedFields(
    {
      ...job,
      tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
    },
    actor,
  );
}

export function applyResumeTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "resume" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (
    task.status !== "on_hold" &&
    task.status !== "ready" &&
    task.status !== "blocked" &&
    task.status !== "paused"
  ) {
    invalidState(`Task "${task.name}" cannot be resumed.`);
  }
  const now = nowIso();
  const units = setWorkerAssignmentStatus(ensureTaskUnits(task), null, "in_progress", now);
  const withUnits = applyUnitsToTask({ ...task, pausedAt: undefined }, units);
  const updated = withHistory(withUnits, actor, "resumed", "in_progress", action.notes);
  return refreshJobDerivedFields({
    ...job,
    status: job.status === "on_hold" ? "in_progress" : job.status,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

export function applyHoldTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "hold" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status === "completed" || task.status === "skipped" || task.status === "cancelled") {
    invalidState(`Task "${task.name}" cannot be put on hold.`);
  }
  const now = nowIso();
  const updated = withHistory(
    {
      ...task,
      pausedAt: now,
      contributors: setContributorStatus(resolveTaskContributors(task), "on_hold", now),
    },
    actor,
    "on_hold",
    "on_hold",
    action.notes,
  );
  return refreshJobDerivedFields({
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

export function applyBlockTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "block" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status === "completed" || task.status === "skipped") {
    invalidState(`Task "${task.name}" cannot be blocked.`);
  }
  const updated = withHistory(task, actor, "blocked", "blocked", action.notes);
  return refreshJobDerivedFields({
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

export function applySkipTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "skip" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.isRequired) {
    invalidState(`Required task "${task.name}" cannot be skipped.`);
  }
  if (task.status === "completed" || task.status === "cancelled") {
    invalidState(`Task "${task.name}" cannot be skipped.`);
  }
  const updated = withHistory(
    { ...task, completedAt: nowIso() },
    actor,
    "skipped",
    "skipped",
    action.notes,
  );
  return refreshJobDerivedFields({
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

export function applyAddTaskNotes(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "notes" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  const updated = withHistory(
    { ...task, notes: action.notes },
    actor,
    "notes_added",
    task.status,
    action.notes,
  );
  return {
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
    updatedAt: nowIso(),
  };
}

export function applyCompleteTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "complete" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (
    task.status !== "in_progress" &&
    task.status !== "ready" &&
    task.status !== "paused" &&
    task.status !== "rework_required"
  ) {
    invalidState(`Task "${task.name}" must be in progress before it can be completed.`);
  }

  const addedRework = Math.max(0, action.reworkQuantity ?? 0);
  const unitsBefore = ensureTaskUnits(task);
  const remainingBefore = remainingQuantity(task);
  const availableOrOwned =
    availableUnitQuantity(unitsBefore) +
    unitsBefore.filter(
      (unit) =>
        (unit.assignments?.length ?? 0) > 0 && unit.progressPercentage < 100,
    ).length;
  const now = nowIso();

  const existingContributors = resolveTaskContributors(task);
  const contributorInputs = uniqueContributorInputs(
    action.contributors && action.contributors.length > 0
      ? action.contributors
      : defaultCompleteContributors(existingContributors, actor, {
          quantity: remainingBefore,
          estimatedHours: task.estimatedHours,
          actualHours: action.actualHours,
        }),
  );
  const peopleQuantity = quantityTotal(contributorInputs);
  const allMarkedComplete = contributorInputs.every(
    (person) => (person.progressPercentage ?? 100) >= 100,
  );
  const finishingTask =
    peopleQuantity >= remainingBefore && remainingBefore > 0
      ? allMarkedComplete
      : peopleQuantity <= 0 && remainingBefore === 0;

  validateUnitContributorInputs(contributorInputs, {
    availableOrOwned: Math.max(availableOrOwned, remainingBefore),
    finishing: finishingTask,
  });

  const progressUpdates = contributorInputs.map((person) => ({
    userId: person.userId,
    userName: person.userName,
    quantity: Math.max(0, Math.floor(person.quantity ?? 0)),
    progressPercentage: defaultUnitProgressForComplete(person, finishingTask),
    contributionPercent: person.contributionPercent ?? 100,
    actualHours: person.actualHours,
    normalOvertimeHours: person.normalOvertimeHours,
    doubleOvertimeHours: person.doubleOvertimeHours,
    rejectedQuantity: person.rejectedQuantity,
    wasteQuantity: person.wasteQuantity,
    unitNos: person.unitNos,
  }));

  // If no per-person qty was entered, finish all remaining incomplete units under the actor.
  const effectiveUpdates =
    progressUpdates.some((item) => item.quantity > 0 || (item.unitNos?.length ?? 0) > 0)
      ? progressUpdates
      : [
          {
            userId: actor.userId,
            userName: actor.userName,
            quantity: remainingBefore,
            progressPercentage: 100,
            contributionPercent: 100,
            actualHours: action.actualHours,
            normalOvertimeHours: action.normalOvertimeHours,
            doubleOvertimeHours: action.doubleOvertimeHours,
            rejectedQuantity: action.rejectedQuantity,
            wasteQuantity: action.wasteQuantity,
          },
        ];

  const nextUnits = updateAssignedUnitProgress(unitsBefore, effectiveUpdates, now, task);
  const withUnits = applyUnitsToTask(
    {
      ...task,
      notes: action.notes ?? task.notes,
      reworkQuantity: task.reworkQuantity + addedRework,
      materialsUsed: [...task.materialsUsed, ...(action.materialsUsed ?? [])],
      actualCost: round2(
        (task.actualCost ?? 0) +
          (action.materialsUsed ?? []).reduce((sum, item) => sum + (item.cost ?? 0), 0),
      ),
    },
    nextUnits,
  );

  const fullyDone = withUnits.status === "completed";
  const nextStatus = taskStatusFromUnits(withUnits, nextUnits);
  const workers = workerProgressFromUnits(nextUnits);
  const addedCompleted = Math.max(0, withUnits.completedQuantity - task.completedQuantity);
  const remaining = Math.max(0, withUnits.plannedQuantity - withUnits.completedQuantity);
  const contributionNote = workers.length
    ? ` · ${workers
        .map(
          (w) =>
            `${w.userName} ${w.completedQuantity}/${w.assignedQuantity} (${w.progressPercentage}%)`,
        )
        .join(", ")}`
    : "";

  const updated = withHistory(
    {
      ...withUnits,
      status: nextStatus,
      completedAt: fullyDone ? now : undefined,
      rejectedQuantity:
        task.rejectedQuantity +
        Math.max(
          0,
          workers.reduce((sum, w) => sum + w.rejectedQuantity, 0) - task.rejectedQuantity,
        ),
      wasteQuantity:
        task.wasteQuantity +
        Math.max(
          0,
          workers.reduce((sum, w) => sum + w.wasteQuantity, 0) - task.wasteQuantity,
        ),
    },
    actor,
    fullyDone ? "completed" : "quantity_updated",
    nextStatus,
    action.notes ??
      `Qty progress ${withUnits.overallProgress}% · completed ${addedCompleted} (remaining ${remaining}${
        withUnits.partiallyCompletedQuantity
          ? `, partial ${withUnits.partiallyCompletedQuantity}`
          : ""
      })${contributionNote}`,
  );

  let nextJob: ManufacturingJob = {
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  };

  if (fullyDone && task.isRework) {
    nextJob = {
      ...nextJob,
      reworks: nextJob.reworks.map((rework) =>
        rework.reworkTaskId === task.id
          ? {
              ...rework,
              result: "passed",
              completedAt: nowIso(),
              additionalTimeHours: updated.actualHours,
            }
          : rework,
      ),
    };
  }

  if (fullyDone && task.isQcTask && !job.qualityInspection) {
    nextJob = {
      ...nextJob,
      qualityInspection: {
        id: generateId("qi"),
        inspectionNumber: `QI-${job.jobNumber}`,
        inspectorId: actor.userId,
        inspectorName: actor.userName,
        status: "passed",
        checklistItems: [],
        inspectedAt: nowIso(),
        notes: action.notes,
      },
    };
  }

  return refreshJobDerivedFields(nextJob, actor);
}

function nextReworkNumber(job: ManufacturingJob, original: ManufacturingTask): string {
  const count = job.tasks.filter(
    (task) => task.isRework && task.originalTaskId === original.id,
  ).length;
  return `${original.taskNumber}-R${count + 1}`;
}

function collectDownstreamTaskIds(
  originId: string,
  tasks: ManufacturingTask[],
): Set<string> {
  const ids = new Set<string>();
  const visit = (id: string) => {
    for (const task of tasks) {
      if (task.prerequisiteTaskIds.includes(id) && !ids.has(task.id)) {
        ids.add(task.id);
        visit(task.id);
      }
    }
  };
  visit(originId);
  return ids;
}

export function applyRecordRework(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "rework" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const original = findTask(job, action.taskId);
  const now = nowIso();
  const reworkId = generateId("tsk");
  const reworkNumber = nextReworkNumber(job, original);
  const quantity = Math.max(1, Math.min(action.quantity, original.plannedQuantity));

  const reworkTask: ManufacturingTask = {
    id: reworkId,
    taskNumber: reworkNumber,
    productionJobId: job.id,
    productOperationId: original.productOperationId,
    sequence: original.sequence,
    name: `${original.name} (Rework)`,
    description: original.description,
    isRequired: true,
    isEnabled: true,
    isQcTask: original.isQcTask,
    isTestingTask: original.isTestingTask,
    isRework: true,
    originalTaskId: original.id,
    estimatedHours: round2(
      original.plannedQuantity > 0
        ? (original.estimatedHours / original.plannedQuantity) * quantity
        : original.estimatedHours,
    ),
    labourCostRate: original.labourCostRate ?? resolveLabourRatePerHour(),
    machineName: original.machineName,
    machineCost: original.machineCost,
    assignedTo: original.assignedTo,
    assignedToName: original.assignedToName,
    contributors: resetContributorProgress(original.contributors),
    plannedQuantity: quantity,
    completedQuantity: 0,
    partiallyCompletedQuantity: 0,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    wasteQuantity: 0,
    startedQuantity: 0,
    overallProgress: 0,
    units: createTaskUnits(reworkId, quantity),
    status: "ready",
    notes: action.notes,
    prerequisiteTaskIds: [],
    history: [
      createHistoryEntry(
        reworkId,
        actor,
        "created",
        undefined,
        "ready",
        action.reason,
        now,
      ),
      createHistoryEntry(reworkId, actor, "ready", "pending", "ready", action.reason, now),
    ],
    materialsUsed: [],
    workstation: original.workstation,
  };

  const reworkRecord: ManufacturingRework = {
    id: generateId("rwk"),
    reworkNumber,
    originalTaskId: original.id,
    reworkTaskId: reworkId,
    reason: action.reason,
    quantity,
    result: "pending",
    createdAt: now,
    notes: action.notes,
  };

  const downstreamIds = collectDownstreamTaskIds(original.id, job.tasks);
  const updatedOriginal = withHistory(
    original,
    actor,
    "rework_required",
    original.status,
    `Rework ${reworkNumber}: ${action.reason}`,
  );

  const updatedTasks = job.tasks.map((task) => {
    if (task.id === original.id) return updatedOriginal;
    if (!downstreamIds.has(task.id) || task.isRework) return task;
    const withPrereq = {
      ...task,
      prerequisiteTaskIds: task.prerequisiteTaskIds.includes(reworkId)
        ? task.prerequisiteTaskIds
        : [...task.prerequisiteTaskIds, reworkId],
      completedQuantity: 0,
      startedQuantity: 0,
      completedAt: undefined,
      startedAt: undefined,
      actualHours: undefined,
      overtimeHours: undefined,
      normalOvertimeHours: undefined,
      doubleOvertimeHours: undefined,
      contributors: resetContributorProgress(task.contributors),
    };
    if (
      task.status === "completed" ||
      task.status === "ready" ||
      task.status === "in_progress" ||
      task.status === "skipped"
    ) {
      return withHistory(
        withPrereq,
        actor,
        "reopened",
        "pending",
        `Reopened because ${original.name} requires rework`,
      );
    }
    return withPrereq;
  });

  return refreshJobDerivedFields(
    {
      ...job,
      status: "rework",
      qualityInspection:
        job.qualityInspection &&
        (original.isQcTask || [...downstreamIds].some((id) =>
          job.tasks.find((task) => task.id === id)?.isQcTask,
        ))
          ? { ...job.qualityInspection, status: "rework" }
          : job.qualityInspection,
      tasks: [...updatedTasks, reworkTask],
      reworks: [...job.reworks, reworkRecord],
    },
    actor,
  );
}

export function applyQcResult(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "qc" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const inspection: QualityInspection = {
    ...action.inspection,
    inspectedAt: action.inspection.inspectedAt ?? nowIso(),
    inspectorId: action.inspection.inspectorId || actor.userId,
    inspectorName: action.inspection.inspectorName || actor.userName,
  };

  let next: ManufacturingJob = {
    ...job,
    qualityInspection: inspection,
  };

  const qcTask = next.tasks.find((task) => task.isQcTask && task.isEnabled && !task.isRework)
    ?? next.tasks.find((task) => task.isQcTask && task.isEnabled);

  if (action.result === "passed") {
    next = {
      ...next,
      qualityInspection: { ...inspection, status: "passed" },
    };
    if (qcTask && qcTask.status !== "completed") {
      const toComplete =
        qcTask.status === "in_progress" || qcTask.status === "ready"
          ? qcTask
          : withHistory(qcTask, actor, "started", "in_progress", "QC inspection started");
      const withStarted = {
        ...next,
        tasks: next.tasks.map((task) => (task.id === qcTask.id ? toComplete : task)),
      };
      next = applyCompleteTask(
        withStarted,
        {
          type: "complete",
          taskId: qcTask.id,
          completedQuantity: remainingQuantity(toComplete),
          notes: inspection.notes,
        },
        actor,
      );
    }
    return refreshJobDerivedFields(next, actor);
  }

  next = {
    ...next,
    qualityInspection: { ...inspection, status: action.result === "failed" ? "failed" : "rework" },
    status: "rework",
  };

  if (qcTask && qcTask.status !== "rework_required") {
    const flagged = withHistory(
      qcTask,
      actor,
      "rework_required",
      "rework_required",
      inspection.notes ?? "QC failed",
    );
    next = {
      ...next,
      tasks: next.tasks.map((task) => (task.id === qcTask.id ? flagged : task)),
    };
  }

  const failedTaskId = action.failedTaskId;
  if (failedTaskId) {
    next = applyRecordRework(
      next,
      {
        type: "rework",
        taskId: failedTaskId,
        reason: action.reason ?? inspection.notes ?? "QC failed",
        quantity: action.quantity ?? (remainingQuantity(findTask(next, failedTaskId)) || next.quantity),
        notes: inspection.notes,
      },
      actor,
    );
  }

  return refreshJobDerivedFields(next, actor);
}

export function applyHoldProductionJob(
  job: ManufacturingJob,
  reason: string | undefined,
  actor: TaskActionActor,
): ManufacturingJob {
  if (job.status === "completed" || job.status === "cancelled") {
    invalidState("A completed or cancelled job cannot be put on hold.");
  }
  return {
    ...job,
    status: "on_hold",
    notes: reason ? [job.notes, reason].filter(Boolean).join("\n") : job.notes,
    updatedAt: nowIso(),
    tasks: job.tasks.map((task) =>
      task.status === "in_progress"
        ? withHistory(task, actor, "on_hold", "on_hold", reason)
        : task,
    ),
  };
}

export function applyTaskAction(
  job: ManufacturingJob,
  action: ManufacturingTaskAction,
  actor: TaskActionActor,
): ManufacturingJob {
  switch (action.type) {
    case "start":
      return applyStartTask(job, action, actor);
    case "pause":
      return applyPauseTask(job, action, actor);
    case "resume":
      return applyResumeTask(job, action, actor);
    case "hold":
      return applyHoldTask(job, action, actor);
    case "block":
      return applyBlockTask(job, action, actor);
    case "complete":
      return applyCompleteTask(job, action, actor);
    case "skip":
      return applySkipTask(job, action, actor);
    case "notes":
      return applyAddTaskNotes(job, action, actor);
    case "rework":
      return applyRecordRework(job, action, actor);
    case "qc":
      return applyQcResult(job, action, actor);
    default:
      invalidState("Unknown manufacturing task action.");
  }
}

export function currentTask(job: ManufacturingJob): ManufacturingTask | undefined {
  return (
    job.tasks.find((task) => task.status === "in_progress") ??
    job.tasks.find((task) => task.status === "paused") ??
    job.tasks.find((task) => task.status === "ready") ??
    job.tasks.find((task) => task.status === "rework_required")
  );
}

export function allowedTaskActions(task: ManufacturingTask): {
  start: boolean;
  pause: boolean;
  complete: boolean;
  hold: boolean;
  skip: boolean;
  notes: boolean;
  rework: boolean;
  resume: boolean;
} {
  return {
    start: task.status === "ready" || task.status === "rework_required",
    pause: task.status === "in_progress",
    complete:
      task.status === "in_progress" || task.status === "ready" || task.status === "paused",
    hold: task.status === "ready" || task.status === "in_progress" || task.status === "paused",
    skip: !task.isRequired && (task.status === "pending" || task.status === "ready"),
    notes: task.status !== "cancelled",
    rework: task.status === "completed" || task.status === "rework_required",
    resume: task.status === "on_hold" || task.status === "blocked" || task.status === "paused",
  };
}

/** Open tasks shown in the bulk-complete panel (including pending that unlock in-batch). */
export function eligibleBulkCompleteTasks(job: ManufacturingJob): ManufacturingTask[] {
  return job.tasks
    .filter(
      (task) =>
        task.status !== "completed" &&
        task.status !== "skipped" &&
        task.status !== "cancelled" &&
        (remainingQuantity(task) > 0 ||
          task.status === "pending" ||
          task.status === "ready" ||
          task.status === "rework_required"),
    )
    .sort((left, right) => left.sequence - right.sequence);
}

/**
 * A pending task can be selected when every incomplete prerequisite is also selected
 * (those finish earlier in the same batch, then this task becomes ready).
 */
export function isBulkCompleteSelectable(
  task: ManufacturingTask,
  job: ManufacturingJob,
  selectedIds: string[],
): boolean {
  if (
    task.status === "completed" ||
    task.status === "skipped" ||
    task.status === "cancelled" ||
    task.status === "on_hold" ||
    task.status === "blocked"
  ) {
    return false;
  }
  if (allowedTaskActions(task).complete) return true;

  return task.prerequisiteTaskIds.every((prereqId) => {
    const prereq = job.tasks.find((item) => item.id === prereqId);
    if (!prereq) return true;
    if (prereq.status === "completed" || prereq.status === "skipped") return true;
    return selectedIds.includes(prereqId);
  });
}

/** Incomplete prerequisites that must be included when selecting a later task. */
export function incompleteBulkPrerequisites(
  task: ManufacturingTask,
  job: ManufacturingJob,
): string[] {
  const needed: string[] = [];
  const visit = (taskId: string) => {
    const current = job.tasks.find((item) => item.id === taskId);
    if (!current) return;
    for (const prereqId of current.prerequisiteTaskIds) {
      const prereq = job.tasks.find((item) => item.id === prereqId);
      if (!prereq) continue;
      if (prereq.status === "completed" || prereq.status === "skipped") continue;
      if (!needed.includes(prereqId)) {
        needed.push(prereqId);
        visit(prereqId);
      }
    }
  };
  visit(task.id);
  return needed;
}

/**
 * Finish quantity on a task (defaults to all remaining) at 100% progress for that qty.
 * Uses people already on the task when present.
 * Optional Hours / OT / DOT are split evenly across those people.
 */
export function buildFinishRemainingTaskAction(
  task: ManufacturingTask,
  actor: TaskActionActor,
  options?: {
    notes?: string;
    /** How many items to finish now (capped to remaining). Defaults to all remaining. */
    completedQuantity?: number;
    actualHours?: number;
    normalOvertimeHours?: number;
    doubleOvertimeHours?: number;
    activeSessionSwitch?: ActiveSessionSwitch;
  },
): Extract<ManufacturingTaskAction, { type: "complete" }> {
  const remaining = remainingQuantity(task);
  const finishQty = Math.min(
    remaining,
    Math.max(
      0,
      options?.completedQuantity != null && !Number.isNaN(options.completedQuantity)
        ? Math.floor(options.completedQuantity)
        : remaining,
    ),
  );
  const existing = resolveTaskContributors(task);
  const estimatedForQty =
    remaining > 0
      ? round2((remainingEstimatedHours(task) * finishQty) / remaining)
      : remainingEstimatedHours(task);
  const hoursTotal =
    options?.actualHours != null && !Number.isNaN(options.actualHours)
      ? Math.max(0, options.actualHours)
      : estimatedForQty;
  const otTotal = Math.max(0, options?.normalOvertimeHours ?? 0);
  const dotTotal = Math.max(0, options?.doubleOvertimeHours ?? 0);

  const base = defaultCompleteContributors(existing, actor, {
    quantity: finishQty,
    estimatedHours: hoursTotal,
  });
  const shares = base.map(() => 1);
  const hourParts = allocateByShares(hoursTotal, shares);
  const otParts = allocateByShares(otTotal, shares);
  const dotParts = allocateByShares(dotTotal, shares);

  const contributors = base.map((person, index) => {
    const hours = hourParts[index] ?? 0;
    const ot = otParts[index] ?? 0;
    const dot = dotParts[index] ?? 0;
    return {
      ...person,
      progressPercentage: 100,
      actualHours: hours || undefined,
      normalOvertimeHours: ot || undefined,
      doubleOvertimeHours: dot || undefined,
      overtimeHours: ot + dot > 0 ? ot + dot : undefined,
    };
  });

  return {
    type: "complete",
    taskId: task.id,
    completedQuantity: finishQty,
    actualHours: hoursTotal || undefined,
    overtimeHours: otTotal + dotTotal > 0 ? otTotal + dotTotal : undefined,
    normalOvertimeHours: otTotal || undefined,
    doubleOvertimeHours: dotTotal || undefined,
    contributors,
    notes: options?.notes,
    activeSessionSwitch: options?.activeSessionSwitch,
  };
}
