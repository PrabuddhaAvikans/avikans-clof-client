import { generateId, nowIso } from "@/services/http";
import type { ProductOperation } from "@/types/product";
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
  return Math.max(0, task.plannedQuantity - task.completedQuantity);
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

export function calculateTaskProgressPercent(tasks: ManufacturingTask[]): number {
  const required = requiredTasks(tasks).filter((task) => !task.isRework || task.status !== "cancelled");
  const tracked = required.length > 0 ? required : tasks.filter((task) => task.isEnabled);
  if (tracked.length === 0) return 0;

  const hasWeights = tracked.some((task) => task.estimatedHours > 0);
  if (hasWeights) {
    const totalWeight = tracked.reduce(
      (sum, task) => sum + Math.max(task.estimatedHours, 0.01),
      0,
    );
    const earned = tracked.reduce((sum, task) => {
      const weight = Math.max(task.estimatedHours, 0.01);
      if (task.status === "completed" || task.status === "skipped") return sum + weight;
      const ratio =
        task.plannedQuantity > 0
          ? Math.min(1, task.completedQuantity / task.plannedQuantity)
          : 0;
      return sum + weight * ratio;
    }, 0);
    return roundProgress((earned / totalWeight) * 100);
  }

  const completed = tracked.filter((task) => task.status === "completed").length;
  return roundProgress((completed / tracked.length) * 100);
}

export function calculateJobEstimatedCost(job: Pick<ManufacturingJob, "tasks" | "quantity">): number {
  return round2(
    job.tasks.reduce((sum, task) => {
      if (!task.isEnabled || task.isRework) return sum;
      const labour = task.estimatedHours * (task.labourCostRate ?? 0);
      const machine = task.machineCost ?? 0;
      return sum + labour + machine;
    }, 0),
  );
}

export function calculateJobActualCost(job: Pick<ManufacturingJob, "tasks" | "reworks">): number {
  const taskCost = job.tasks.reduce((sum, task) => {
    const hours = task.actualHours ?? 0;
    const labour = hours * (task.labourCostRate ?? 0);
    const materials = task.materialsUsed.reduce((m, item) => m + (item.cost ?? 0), 0);
    return sum + labour + materials + (task.actualCost ?? 0);
  }, 0);
  const reworkCost = job.reworks.reduce(
    (sum, rework) => sum + (rework.additionalCost ?? 0),
    0,
  );
  return round2(taskCost + reworkCost);
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
  const tasks = applyTaskReadiness(job.tasks, actor);
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
      labourCostRate: op.labourCostRate,
      machineName: op.machineName,
      machineCost,
      plannedQuantity: quantity,
      completedQuantity: 0,
      rejectedQuantity: 0,
      reworkQuantity: 0,
      wasteQuantity: 0,
      startedQuantity: 0,
      status: "pending",
      notes: op.notes,
      prerequisiteTaskIds: [],
      history: [
        createHistoryEntry(id, actor, "created", undefined, "pending", "Generated from product version operation", createdAt),
      ],
      materialsUsed: [],
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
  if (task.status === "on_hold") {
    return applyResumeTask(job, { type: "resume", taskId: task.id, notes: action.notes }, actor);
  }
  if (task.status !== "ready" && task.status !== "rework_required") {
    invalidState(`Task "${task.name}" must be Ready before it can be started.`);
  }
  if (!arePrerequisitesMet(task, job.tasks)) {
    invalidState(`Task "${task.name}" is waiting on prerequisite tasks.`);
  }

  const now = nowIso();
  const quantityStarted = action.quantityStarted ?? remainingQuantity(task);
  const operatorId = action.operatorId ?? action.assignedTo ?? actor.userId;
  const operatorName = action.operatorName ?? action.assignedToName ?? actor.userName;

  const updatedTask = withHistory(
    {
      ...task,
      assignedTo: action.assignedTo ?? task.assignedTo,
      assignedToName: action.assignedToName ?? task.assignedToName,
      operatorId,
      operatorName,
      machineName: action.machineName ?? task.machineName,
      startedQuantity: quantityStarted,
      startedAt: task.startedAt ?? now,
      pausedAt: undefined,
      notes: action.notes ?? task.notes,
    },
    actor,
    task.status === "rework_required" ? "started" : "started",
    "in_progress",
    action.notes ??
      `Started qty ${quantityStarted}${action.machineName ? ` on ${action.machineName}` : ""}`,
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
  const updated = withHistory(
    { ...task, pausedAt: nowIso() },
    actor,
    "paused",
    "ready",
    action.notes,
  );
  return refreshJobDerivedFields({
    ...job,
    tasks: job.tasks.map((item) => (item.id === task.id ? updated : item)),
  }, actor);
}

export function applyResumeTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "resume" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status !== "on_hold" && task.status !== "ready" && task.status !== "blocked") {
    invalidState(`Task "${task.name}" cannot be resumed.`);
  }
  const updated = withHistory(
    { ...task, pausedAt: undefined },
    actor,
    "resumed",
    "in_progress",
    action.notes,
  );
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
  const updated = withHistory(
    { ...task, pausedAt: nowIso() },
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

function hoursFromStart(startedAt: string | undefined, fallback: number): number {
  if (!startedAt) return fallback;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  return round2(Math.max(elapsed, 0.01));
}

export function applyCompleteTask(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "complete" }>,
  actor: TaskActionActor,
): ManufacturingJob {
  const task = findTask(job, action.taskId);
  if (task.status !== "in_progress" && task.status !== "ready" && task.status !== "rework_required") {
    invalidState(`Task "${task.name}" must be in progress before it can be completed.`);
  }

  const addedCompleted = Math.max(0, action.completedQuantity);
  const completedQuantity = Math.min(
    task.plannedQuantity,
    task.completedQuantity + addedCompleted,
  );
  const addedRejected = Math.max(0, action.rejectedQuantity ?? 0);
  const addedWaste = Math.max(0, action.wasteQuantity ?? 0);
  const addedRework = Math.max(0, action.reworkQuantity ?? 0);
  const remaining = Math.max(0, task.plannedQuantity - completedQuantity);
  const fullyDone = remaining === 0;
  const actualHours =
    action.actualHours ??
    hoursFromStart(task.startedAt, task.actualHours ?? task.estimatedHours);
  const materialsUsed: TaskMaterialUsage[] = [
    ...task.materialsUsed,
    ...(action.materialsUsed ?? []),
  ];
  const materialCost = (action.materialsUsed ?? []).reduce(
    (sum, item) => sum + (item.cost ?? 0),
    0,
  );

  const nextStatus: ManufacturingTaskStatus = fullyDone ? "completed" : "in_progress";
  const updated = withHistory(
    {
      ...task,
      completedQuantity,
      rejectedQuantity: task.rejectedQuantity + addedRejected,
      wasteQuantity: task.wasteQuantity + addedWaste,
      reworkQuantity: task.reworkQuantity + addedRework,
      actualHours,
      actualCost: round2((task.actualCost ?? 0) + materialCost),
      materialsUsed,
      notes: action.notes ?? task.notes,
      completedAt: fullyDone ? nowIso() : undefined,
      operatorId: task.operatorId ?? actor.userId,
      operatorName: task.operatorName ?? actor.userName,
    },
    actor,
    fullyDone ? "completed" : "quantity_updated",
    nextStatus,
    action.notes ??
      `Completed ${addedCompleted} of ${task.plannedQuantity} (remaining ${remaining})`,
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
          ? { ...rework, result: "passed", completedAt: nowIso(), additionalTimeHours: actualHours }
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
    labourCostRate: original.labourCostRate,
    machineName: original.machineName,
    machineCost: original.machineCost,
    assignedTo: original.assignedTo,
    assignedToName: original.assignedToName,
    plannedQuantity: quantity,
    completedQuantity: 0,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    wasteQuantity: 0,
    startedQuantity: 0,
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
    complete: task.status === "in_progress" || task.status === "ready",
    hold: task.status === "ready" || task.status === "in_progress",
    skip: !task.isRequired && (task.status === "pending" || task.status === "ready"),
    notes: task.status !== "cancelled",
    rework: task.status === "completed" || task.status === "rework_required",
    resume: task.status === "on_hold" || task.status === "blocked",
  };
}
