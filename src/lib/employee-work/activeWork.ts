import { isActiveWorkSession } from "@/lib/employee-work/sessionTime";
import { loadSystemSettings } from "@/lib/systemSettings";
import { resolveTaskContributors } from "@/lib/taskContributors";
import { ensureTaskUnits, workerProgressFromUnits } from "@/lib/taskUnits";
import type {
  ActiveWorkConfirmationError,
  ConcurrentWorkPolicy,
  EmployeeWorkSession,
} from "@/types/employee-work";
import { ACTIVE_WORK_CONFIRMATION_CODE } from "@/types/employee-work";
import type {
  ManufacturingJob,
  ManufacturingTask,
  ManufacturingTaskAction,
  TaskActionActor,
} from "@/types/manufacturing";

/**
 * Optional exceptions to the system-wide concurrent-work setting.
 * A matching operation rule wins over a role rule. Otherwise the system setting applies.
 * Example:
 * { roleName: "Machine Operator", allowConcurrentWork: true, maxConcurrentTasks: 2 }
 */
export type ConcurrentWorkRule = {
  roleName?: string;
  operationName?: string;
  allowConcurrentWork: boolean;
  maxConcurrentTasks: number;
};

export const CONCURRENT_WORK_RULES: ConcurrentWorkRule[] = [];

export function activeSessionLimit(policy: ConcurrentWorkPolicy): number {
  if (!policy.allowConcurrentWork) return 1;
  return Math.max(1, Math.floor(policy.maxConcurrentTasks));
}

export function resolveConcurrentWorkPolicy(input?: {
  roleName?: string;
  operationName?: string;
}): ConcurrentWorkPolicy {
  const settings = loadSystemSettings();
  const fallback: ConcurrentWorkPolicy = {
    allowConcurrentWork: settings.allowConcurrentWork,
    maxConcurrentTasks: settings.allowConcurrentWork
      ? Math.max(1, settings.maxConcurrentTasks)
      : 1,
  };
  const operation = input?.operationName?.trim().toLowerCase();
  const match =
    CONCURRENT_WORK_RULES.find(
      (rule) =>
        rule.operationName &&
        operation &&
        rule.operationName.trim().toLowerCase() === operation,
    ) ??
    CONCURRENT_WORK_RULES.find(
      (rule) => rule.roleName && input?.roleName && rule.roleName === input.roleName,
    );
  if (!match) return fallback;
  return {
    allowConcurrentWork: match.allowConcurrentWork,
    maxConcurrentTasks: match.allowConcurrentWork
      ? Math.max(1, match.maxConcurrentTasks)
      : 1,
  };
}

/**
 * Active sessions that must be paused or stopped before `nextTaskId` can start.
 * An employee already active on that same task is not a conflict.
 * When several sessions must be released, the most recently started ones are returned.
 */
export function sessionsBlockingNewWork(
  sessions: EmployeeWorkSession[],
  employeeId: string,
  nextTaskId: string,
  policy: ConcurrentWorkPolicy,
): EmployeeWorkSession[] {
  const active = sessions
    .filter(
      (session) => session.employeeId === employeeId && isActiveWorkSession(session),
    )
    .sort((left, right) => (left.startedAt < right.startedAt ? 1 : -1));
  if (active.some((session) => session.taskId === nextTaskId)) return [];
  const overflow = active.length + 1 - activeSessionLimit(policy);
  if (overflow <= 0) return [];
  return active.slice(0, overflow);
}

export function isActiveWorkConfirmationError(
  error: unknown,
): error is ActiveWorkConfirmationError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Partial<ActiveWorkConfirmationError>;
  return (
    candidate.code === ACTIVE_WORK_CONFIRMATION_CODE &&
    Array.isArray(candidate.conflicts)
  );
}

function uniquePeople(
  people: Array<{ employeeId: string; employeeName: string }>,
): Array<{ employeeId: string; employeeName: string }> {
  const seen = new Set<string>();
  const next: Array<{ employeeId: string; employeeName: string }> = [];
  for (const person of people) {
    if (!person.employeeId || seen.has(person.employeeId)) continue;
    seen.add(person.employeeId);
    next.push(person);
  }
  return next;
}

function peopleOnTask(task: ManufacturingTask): Array<{ employeeId: string; employeeName: string }> {
  const fromUnits = workerProgressFromUnits(ensureTaskUnits(task))
    .filter((worker) => worker.status !== "completed")
    .map((worker) => ({ employeeId: worker.userId, employeeName: worker.userName }));
  if (fromUnits.length) return uniquePeople(fromUnits);
  const fromContributors = resolveTaskContributors(task)
    .filter((person) => person.status !== "completed")
    .map((person) => ({ employeeId: person.userId, employeeName: person.userName }));
  return uniquePeople(fromContributors);
}

/**
 * Employees who will receive a new active work session for this start or resume.
 * Mirrors task start allocation: explicit assignees, otherwise people already on the task, otherwise the actor.
 */
export function employeesStartingWork(
  job: ManufacturingJob,
  action: Extract<ManufacturingTaskAction, { type: "start" | "resume" }>,
  actor: TaskActionActor,
): Array<{ employeeId: string; employeeName: string }> {
  const task = job.tasks.find((item) => item.id === action.taskId);
  if (!task) return [];

  const resuming =
    action.type === "resume" || task.status === "paused" || task.status === "on_hold";
  if (resuming) {
    const existing = peopleOnTask(task);
    if (existing.length) return existing;
    const id = task.operatorId ?? task.assignedTo ?? actor.userId;
    const name = task.operatorName ?? task.assignedToName ?? actor.userName;
    return [{ employeeId: id, employeeName: name }];
  }

  if (action.type === "start" && action.contributors && action.contributors.length > 0) {
    return uniquePeople(
      action.contributors.map((person) => ({
        employeeId: person.userId,
        employeeName: person.userName,
      })),
    );
  }

  const existing = peopleOnTask(task);
  if (existing.length) return existing;

  const id =
    (action.type === "start" ? action.operatorId ?? action.assignedTo : undefined) ??
    task.operatorId ??
    task.assignedTo ??
    actor.userId;
  const name =
    (action.type === "start" ? action.operatorName ?? action.assignedToName : undefined) ??
    task.operatorName ??
    task.assignedToName ??
    actor.userName;
  return [{ employeeId: id, employeeName: name }];
}
