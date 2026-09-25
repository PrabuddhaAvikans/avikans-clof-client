import { nowIso } from "@/services/http";
import {
  employeesStartingWork,
  isActiveWorkConfirmationError,
  resolveConcurrentWorkPolicy,
  sessionsBlockingNewWork,
} from "@/lib/employee-work/activeWork";
import { calculateSessionWorkedMinutes } from "@/lib/employee-work/sessionTime";
import {
  applyReleaseWorker,
  applyTaskAction,
  buildFinishRemainingTaskAction,
  refreshJobDerivedFields,
  allowedTaskActions,
} from "@/lib/manufacturingTasks";
import { ensureTaskUnits, overallUnitProgress } from "@/lib/taskUnits";
import { initialUsers } from "@/services/mock/data/users";
import {
  getEmployeeWorkSessions,
  pauseEmployeeWorkSession,
  recordTaskSwitchAudit,
  replaceEmployeeWorkSessions,
  runWorkSessionTransaction,
  stopEmployeeWorkSession,
  syncEmployeeWorkSessionsFromTaskAction,
} from "@/services/mock/employeeWorkSessionStore";
import {
  findManufacturingJob,
  replaceManufacturingJob,
} from "@/services/mock/manufacturingStore";
import type {
  ActiveSessionSwitch,
  ActiveWorkConflict,
  ActiveWorkConfirmationError,
} from "@/types/employee-work";
import { ACTIVE_WORK_CONFIRMATION_CODE } from "@/types/employee-work";
import type { EmployeeWorkSession } from "@/types/employee-work";
import type {
  ManufacturingJob,
  ManufacturingTaskAction,
  TaskActionActor,
} from "@/types/manufacturing";
import { notFoundError } from "@/services/http";

function sessionVersion(session: EmployeeWorkSession): number {
  return session.rowVersion ?? 1;
}

function conflictFromSession(session: EmployeeWorkSession, asOf: string): ActiveWorkConflict {
  const job = session.productionOrderId
    ? findManufacturingJob(session.productionOrderId)
    : undefined;
  const task = job?.tasks.find((item) => item.id === session.taskId);
  const progress = task ? overallUnitProgress(ensureTaskUnits(task)) : 0;
  return {
    employeeId: session.employeeId,
    employeeName: session.employeeName,
    sessionId: session.id,
    rowVersion: sessionVersion(session),
    taskId: session.taskId,
    operation: task?.name ?? session.taskName ?? "Task",
    productionOrderId: session.productionOrderId,
    productionOrderNumber: job?.jobNumber ?? session.productionOrderNumber,
    startedAt: session.startedAt,
    workedMinutes: calculateSessionWorkedMinutes(session, asOf),
    progressPercentage: progress,
    taskStatus: task?.status,
  };
}

function confirmationError(
  conflicts: ActiveWorkConflict[],
  message?: string,
): ActiveWorkConfirmationError {
  const lead = conflicts[0];
  return {
    code: ACTIVE_WORK_CONFIRMATION_CODE,
    message:
      message ??
      (conflicts.length === 1 && lead
        ? `${lead.employeeName} is already working on another task.`
        : "One or more employees are already working on another task."),
    conflicts,
  };
}

/** Read-only check used by the start dialog before a task is saved. */
export function previewActiveWork(input: {
  employees: Array<{ employeeId: string; employeeName: string }>;
  nextTaskId: string;
  operationName?: string;
}): ActiveWorkConflict[] {
  const asOf = nowIso();
  const conflicts: ActiveWorkConflict[] = [];
  const seen = new Set<string>();

  for (const person of input.employees) {
    const policy = resolveConcurrentWorkPolicy({
      roleName: initialUsers.find((user) => user.id === person.employeeId)?.roleName,
      operationName: input.operationName,
    });
    const blocking = sessionsBlockingNewWork(
      getEmployeeWorkSessions(),
      person.employeeId,
      input.nextTaskId,
      policy,
    );
    for (const session of blocking) {
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      conflicts.push(conflictFromSession(session, asOf));
    }
  }

  return conflicts;
}

function collectConflicts(
  job: ManufacturingJob,
  action: ManufacturingTaskAction,
  actor: TaskActionActor,
  asOf: string,
): ActiveWorkConflict[] {
  if (action.type !== "start" && action.type !== "resume" && action.type !== "complete") {
    return [];
  }
  const task = job.tasks.find((item) => item.id === action.taskId);
  const people =
    action.type === "complete"
      ? (action.contributors ?? [])
          .filter((person) => person.userId)
          .map((person) => ({
            employeeId: person.userId,
            employeeName: person.userName,
          }))
      : employeesStartingWork(job, action, actor);
  const conflicts: ActiveWorkConflict[] = [];
  const seen = new Set<string>();

  for (const person of people) {
    const policy = resolveConcurrentWorkPolicy({
      roleName: initialUsers.find((user) => user.id === person.employeeId)?.roleName,
      operationName: task?.name,
    });
    const blocking = sessionsBlockingNewWork(
      getEmployeeWorkSessions(),
      person.employeeId,
      action.taskId,
      policy,
    );
    for (const session of blocking) {
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      conflicts.push(conflictFromSession(session, asOf));
    }
  }

  return conflicts;
}

function switchIsCurrent(
  conflicts: ActiveWorkConflict[],
  resolution: ActiveSessionSwitch | undefined,
): boolean {
  if (!resolution || conflicts.length === 0) return false;
  if (resolution.confirmedSessions.length !== conflicts.length) return false;
  return conflicts.every((conflict) =>
    resolution.confirmedSessions.some(
      (confirmed) =>
        confirmed.sessionId === conflict.sessionId &&
        confirmed.rowVersion === conflict.rowVersion,
    ),
  );
}

function snapshotJobs(ids: string[]): Map<string, ManufacturingJob> {
  const snapshots = new Map<string, ManufacturingJob>();
  for (const id of ids) {
    const job = findManufacturingJob(id);
    if (job) snapshots.set(id, structuredClone(job));
  }
  return snapshots;
}

function restoreJobs(snapshots: Map<string, ManufacturingJob>): void {
  for (const job of snapshots.values()) replaceManufacturingJob(job);
}

/**
 * Starts, pauses, resumes, or switches work.
 * Re-checks the active session inside the work-session transaction so two supervisors
 * cannot both create an active session for the same employee.
 * Confirmed pause/stop is applied before the new session is opened. Progress is not reset.
 */
export function commitGuardedTaskAction(
  jobId: string,
  action: ManufacturingTaskAction,
  actor: TaskActionActor,
): ManufacturingJob {
  const job = findManufacturingJob(jobId);
  if (!job) notFoundError("ProductionJob", jobId);

  const asOf = nowIso();
  const conflicts = collectConflicts(job, action, actor, asOf);
  const resolution =
    action.type === "start" || action.type === "resume" || action.type === "complete"
      ? action.activeSessionSwitch
      : undefined;

  if (conflicts.length > 0 && !switchIsCurrent(conflicts, resolution)) {
    throw confirmationError(
      conflicts,
      resolution
        ? "Active work changed while this was being confirmed. Review the current task and confirm again."
        : undefined,
    );
  }

  const sessionSnapshot = structuredClone(getEmployeeWorkSessions());
  const jobIds = new Set<string>([jobId]);
  for (const conflict of conflicts) {
    if (conflict.productionOrderId) jobIds.add(conflict.productionOrderId);
  }
  const jobSnapshots = snapshotJobs([...jobIds]);

  try {
    if (conflicts.length > 0 && resolution) {
      const task = job.tasks.find((item) => item.id === ("taskId" in action ? action.taskId : ""));
      const note = [
        resolution.action === "pause" ? "Paused to start" : "Stopped to start",
        task ? `${job.jobNumber} / ${task.name}` : job.jobNumber,
        resolution.reason,
      ]
        .filter(Boolean)
        .join(" · ");

      for (const conflict of conflicts) {
        if (conflict.productionOrderId && conflict.taskId) {
          const current = findManufacturingJob(conflict.productionOrderId);
          if (current) {
            replaceManufacturingJob(
              applyReleaseWorker(
                current,
                {
                  taskId: conflict.taskId,
                  employeeId: conflict.employeeId,
                  mode: resolution.action,
                  notes: note,
                },
                actor,
              ),
            );
          }
        }
        const meta = {
          actor,
          reason: resolution.reason,
          suppressAudit: true,
        };
        if (resolution.action === "pause") {
          pauseEmployeeWorkSession(conflict.sessionId, asOf, meta);
        } else {
          stopEmployeeWorkSession(conflict.sessionId, asOf, meta);
        }
      }
    }

    const fresh = findManufacturingJob(jobId);
    if (!fresh) notFoundError("ProductionJob", jobId);
    const updated = applyTaskAction(fresh, action, actor);
    const saved = replaceManufacturingJob(updated);
    const switching = conflicts.length > 0 && resolution;
    syncEmployeeWorkSessionsFromTaskAction(saved, action, actor, {
      suppressAudit: Boolean(switching),
    });

    if (
      switching &&
      resolution &&
      (action.type === "start" || action.type === "resume" || action.type === "complete")
    ) {
      const task = saved.tasks.find((item) => item.id === action.taskId);
      for (const conflict of conflicts) {
        recordTaskSwitchAudit({
          employeeId: conflict.employeeId,
          employeeName: conflict.employeeName,
          previousTaskId: conflict.taskId,
          previousOperation: conflict.operation,
          previousOrderNumber: conflict.productionOrderNumber,
          previousStatus: resolution.action === "pause" ? "paused" : "stopped",
          previousProgress: conflict.progressPercentage,
          newTaskId: task?.id,
          newOperation: task?.name,
          newOrderNumber: saved.jobNumber,
          action: resolution.action === "pause" ? "pause_and_start" : "stop_and_start",
          reason: resolution.reason,
          changedById: actor.userId,
          changedByName: actor.userName,
          changedAt: asOf,
        });
      }
    }

    return saved;
  } catch (error) {
    if (isActiveWorkConfirmationError(error)) throw error;
    replaceEmployeeWorkSessions(sessionSnapshot);
    restoreJobs(jobSnapshots);
    throw error;
  }
}

export function commitGuardedTaskActionAsync(
  jobId: string,
  action: ManufacturingTaskAction,
  actor: TaskActionActor,
): Promise<ManufacturingJob> {
  return runWorkSessionTransaction(() => commitGuardedTaskAction(jobId, action, actor));
}

export type BulkCompleteTaskEntry = {
  taskId: string;
  completedQuantity?: number;
  rejectedQuantity?: number;
  wasteQuantity?: number;
  contributors?: import("@/types/manufacturing").TaskContributorInput[];
  actualHours?: number;
  normalOvertimeHours?: number;
  doubleOvertimeHours?: number;
  notes?: string;
};

export type BulkCompleteTasksInput = {
  /** Prefer per-task details. Falls back to finishing remaining qty when contributors omitted. */
  tasks?: BulkCompleteTaskEntry[];
  /** @deprecated Prefer `tasks`. Kept for simple finish-all calls. */
  taskIds?: string[];
  notes?: string;
  activeSessionSwitch?: ActiveSessionSwitch;
};

function resolveBulkEntries(
  input: BulkCompleteTasksInput,
): BulkCompleteTaskEntry[] {
  if (input.tasks?.length) return input.tasks;
  return (input.taskIds ?? []).map((taskId) => ({
    taskId,
    notes: input.notes,
  }));
}

/**
 * Finish several tasks on one job in sequence order.
 * Each task can carry its own workers, quantities, and notes.
 * Active-work confirmation is collected once for the whole batch.
 */
export function commitGuardedBulkComplete(
  jobId: string,
  input: BulkCompleteTasksInput,
  actor: TaskActionActor,
): ManufacturingJob {
  const job = findManufacturingJob(jobId);
  if (!job) notFoundError("ProductionJob", jobId);

  const entries = resolveBulkEntries(input);
  const requested = [...new Set(entries.map((entry) => entry.taskId))];
  if (requested.length === 0) {
    throw { code: "INVALID_STATE", message: "Select at least one task to complete." };
  }

  const entryByTaskId = new Map(entries.map((entry) => [entry.taskId, entry]));

  for (const taskId of requested) {
    if (!job.tasks.some((task) => task.id === taskId)) {
      throw {
        code: "NOT_FOUND",
        message: `Manufacturing task '${taskId}' was not found on this job.`,
      };
    }
  }

  const asOf = nowIso();
  const ordered = [...job.tasks]
    .filter((task) => requested.includes(task.id))
    .sort((left, right) => left.sequence - right.sequence);

  const sessionSnapshot = structuredClone(getEmployeeWorkSessions());
  const jobIds = new Set<string>([jobId]);
  const conflictBySession = new Map<string, ActiveWorkConflict>();

  const buildAction = (
    task: (typeof job.tasks)[number],
    switchPayload?: ActiveSessionSwitch,
  ): ManufacturingTaskAction => {
    const entry = entryByTaskId.get(task.id) ?? { taskId: task.id };
    if (entry.contributors?.length) {
      return {
        type: "complete",
        taskId: task.id,
        completedQuantity: entry.completedQuantity,
        rejectedQuantity: entry.rejectedQuantity,
        wasteQuantity: entry.wasteQuantity,
        actualHours: entry.actualHours,
        normalOvertimeHours: entry.normalOvertimeHours,
        doubleOvertimeHours: entry.doubleOvertimeHours,
        contributors: entry.contributors,
        notes: entry.notes ?? input.notes,
        activeSessionSwitch: switchPayload,
      };
    }
    return buildFinishRemainingTaskAction(task, actor, {
      notes: entry.notes ?? input.notes,
      completedQuantity: entry.completedQuantity,
      actualHours: entry.actualHours,
      normalOvertimeHours: entry.normalOvertimeHours,
      doubleOvertimeHours: entry.doubleOvertimeHours,
      activeSessionSwitch: switchPayload,
    });
  };

  let working = refreshJobDerivedFields(structuredClone(job), actor);
  for (const task of ordered) {
    const live = working.tasks.find((item) => item.id === task.id);
    if (!live) continue;
    if (!allowedTaskActions(live).complete) {
      continue;
    }
    const action = buildAction(live);
    for (const conflict of collectConflicts(working, action, actor, asOf)) {
      if (conflict.taskId && requested.includes(conflict.taskId)) continue;
      conflictBySession.set(conflict.sessionId, conflict);
      if (conflict.productionOrderId) jobIds.add(conflict.productionOrderId);
    }
    working = applyTaskAction(working, action, actor);
  }

  const conflicts = [...conflictBySession.values()];
  if (conflicts.length > 0 && !switchIsCurrent(conflicts, input.activeSessionSwitch)) {
    throw confirmationError(
      conflicts,
      input.activeSessionSwitch
        ? "Active work changed while this was being confirmed. Review the current tasks and confirm again."
        : "One or more workers are already on another task. Confirm before completing these tasks.",
    );
  }

  const jobSnapshots = snapshotJobs([...jobIds]);

  try {
    let saved: ManufacturingJob | null = null;
    let switchAttached = false;

    for (const selected of ordered) {
      const current = findManufacturingJob(jobId);
      if (!current) notFoundError("ProductionJob", jobId);
      const refreshed = replaceManufacturingJob(refreshJobDerivedFields(current, actor));
      const task = refreshed.tasks.find((item) => item.id === selected.id);
      if (!task) {
        throw {
          code: "NOT_FOUND",
          message: `Manufacturing task '${selected.id}' was not found.`,
        };
      }
      if (!allowedTaskActions(task).complete) {
        throw {
          code: "INVALID_STATE",
          message: `Task "${task.name}" is not ready to complete. Include its prerequisite tasks in this batch, or complete them first.`,
        };
      }

      const action = buildAction(
        task,
        !switchAttached && input.activeSessionSwitch
          ? input.activeSessionSwitch
          : undefined,
      );
      saved = commitGuardedTaskAction(jobId, action, actor);
      if (action.type === "complete" && action.activeSessionSwitch) switchAttached = true;
    }

    return saved ?? findManufacturingJob(jobId)!;
  } catch (error) {
    if (isActiveWorkConfirmationError(error)) throw error;
    replaceEmployeeWorkSessions(sessionSnapshot);
    restoreJobs(jobSnapshots);
    throw error;
  }
}

export function commitGuardedBulkCompleteAsync(
  jobId: string,
  input: BulkCompleteTasksInput,
  actor: TaskActionActor,
): Promise<ManufacturingJob> {
  return runWorkSessionTransaction(() => commitGuardedBulkComplete(jobId, input, actor));
}
