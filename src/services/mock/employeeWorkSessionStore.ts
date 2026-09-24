import { generateId, nowIso } from "@/services/http";
import {
  activeSessionLimit,
  resolveConcurrentWorkPolicy,
} from "@/lib/employee-work/activeWork";
import { minutesBetween } from "@/lib/employee-work/constants";
import { isActiveWorkSession } from "@/lib/employee-work/sessionTime";
import { toBusinessDate } from "@/lib/period-close/constants";
import { seedEmployeeWorkSessions } from "@/services/mock/data/employee-work-sessions";
import { initialUsers } from "@/services/mock/data/users";
import { appendAuditLog } from "@/services/mock/mockAuditService";
import { EmployeeWorkSessionStatus } from "@/types/employee-work";
import type {
  EmployeeWorkSession,
  WorkSessionAuditAction,
  WorkSessionAuditEntry,
} from "@/types/employee-work";
import type { ManufacturingJob, ManufacturingTaskAction } from "@/types/manufacturing";
import { ensureTaskUnits, workerProgressFromUnits } from "@/lib/taskUnits";

let sessions: EmployeeWorkSession[] = structuredClone(seedEmployeeWorkSessions);
let audits: WorkSessionAuditEntry[] = [];
let transactionChain: Promise<void> = Promise.resolve();

/** Call after seed hot-reload so Day Close links stay aligned with manufacturing jobs. */
export function resetEmployeeWorkSessions(): void {
  sessions = structuredClone(seedEmployeeWorkSessions);
  audits = [];
}

/**
 * Serializes active-session checks and writes.
 * Equivalent to a database transaction that locks the employee's active-session rows
 * before re-checking the one-active-session rule. Callers must not await inside `work`.
 */
export function runWorkSessionTransaction<T>(work: () => T): Promise<T> {
  const run = transactionChain.then(() => work());
  transactionChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function getEmployeeWorkSessions(): EmployeeWorkSession[] {
  return sessions;
}

export function listEmployeeWorkSessionsForDate(
  businessDate: string,
): EmployeeWorkSession[] {
  return sessions.filter((item) => item.businessDate === businessDate);
}

export function replaceEmployeeWorkSessions(
  next: EmployeeWorkSession[],
): void {
  sessions = next;
}

export function getWorkSessionAudits(): WorkSessionAuditEntry[] {
  return audits;
}

export type SessionMutationMeta = {
  actor?: WorkSessionActor;
  reason?: string;
  suppressAudit?: boolean;
};

export type WorkSessionActor = {
  userId: string;
  userName: string;
};

export type StartWorkSessionInput = {
  employeeId: string;
  employeeName: string;
  businessDate?: string;
  taskId?: string;
  taskName?: string;
  taskUnitId?: string;
  productionOrderId?: string;
  productionOrderNumber?: string;
  remarks?: string;
  at?: string;
  /** Used only for the concurrent-work policy when this start creates an active session. */
  roleName?: string;
  operationName?: string;
};

function upsert(session: EmployeeWorkSession): EmployeeWorkSession {
  const index = sessions.findIndex((item) => item.id === session.id);
  const previous = index === -1 ? undefined : sessions[index];
  const next = { ...session, rowVersion: (previous?.rowVersion ?? 0) + 1 };
  if (index === -1) sessions = [next, ...sessions];
  else {
    sessions = sessions.slice();
    sessions[index] = next;
  }
  return next;
}

function enforceActiveSessionLimit(
  employeeId: string,
  employeeName: string,
  operationName?: string,
  roleName?: string,
): void {
  const policy = resolveConcurrentWorkPolicy({
    roleName: roleName ?? initialUsers.find((user) => user.id === employeeId)?.roleName,
    operationName,
  });
  const activeCount = sessions.filter(
    (item) => item.employeeId === employeeId && isActiveWorkSession(item),
  ).length;
  const limit = activeSessionLimit(policy);
  if (activeCount > limit) {
    throw {
      code: "CONCURRENCY_CONFLICT",
      message: `${employeeName} cannot have more than ${limit} active work session${limit === 1 ? "" : "s"}.`,
    };
  }
}

function formatAuditDetails(entry: WorkSessionAuditEntry): string {
  const lines = [entry.employeeName];
  if (entry.previousOperation || entry.previousOrderNumber) {
    const previous = [entry.previousOrderNumber, entry.previousOperation].filter(Boolean).join(" / ");
    const verb =
      entry.action === "pause_and_start"
        ? "Paused"
        : entry.action === "stop_and_start"
          ? "Stopped"
          : entry.action === "started"
            ? "Started"
            : entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
    lines.push(`${previous} → ${verb}`);
  }
  if (
    (entry.action === "pause_and_start" || entry.action === "stop_and_start" || entry.action === "started") &&
    (entry.newOperation || entry.newOrderNumber)
  ) {
    const next = [entry.newOrderNumber, entry.newOperation].filter(Boolean).join(" / ");
    lines.push(`${next} → Started`);
  }
  lines.push(`Changed by: ${entry.changedByName}`);
  if (entry.reason) lines.push(`Reason: ${entry.reason}`);
  return lines.join(". ");
}

function recordSessionAudit(
  session: EmployeeWorkSession,
  action: WorkSessionAuditAction,
  meta: SessionMutationMeta | undefined,
  at: string,
  extra?: Partial<WorkSessionAuditEntry>,
): void {
  if (meta?.suppressAudit) return;
  const actor = meta?.actor ?? { userId: "system", userName: "System" };
  const entry: WorkSessionAuditEntry = {
    id: generateId("wsa"),
    employeeId: session.employeeId,
    employeeName: session.employeeName,
    previousTaskId: session.taskId,
    previousOperation: session.taskName,
    previousOrderNumber: session.productionOrderNumber,
    previousStatus: session.status,
    action,
    reason: meta?.reason,
    changedById: actor.userId,
    changedByName: actor.userName,
    changedAt: at,
    ...extra,
  };
  audits = [entry, ...audits];
  appendAuditLog({
    id: generateId("aud"),
    timestamp: at,
    userId: actor.userId,
    userName: actor.userName,
    action: "updated",
    entity: "ManufacturingJob",
    entityId: session.productionOrderId ?? session.id,
    entityLabel: session.productionOrderNumber ?? session.taskName,
    details: formatAuditDetails(entry),
    severity: "info",
  });
}

export function recordTaskSwitchAudit(
  entry: Omit<WorkSessionAuditEntry, "id">,
): WorkSessionAuditEntry {
  const saved: WorkSessionAuditEntry = { ...entry, id: generateId("wsa") };
  audits = [saved, ...audits];
  appendAuditLog({
    id: generateId("aud"),
    timestamp: saved.changedAt,
    userId: saved.changedById,
    userName: saved.changedByName,
    action: "updated",
    entity: "ManufacturingJob",
    entityId: saved.newTaskId ?? saved.previousTaskId ?? saved.employeeId,
    entityLabel: saved.newOrderNumber ?? saved.previousOrderNumber,
    details: formatAuditDetails(saved),
    severity: "info",
  });
  return saved;
}

function findOpenSession(
  employeeId: string,
  taskId: string | undefined,
  businessDate: string,
): EmployeeWorkSession | undefined {
  return sessions.find(
    (item) =>
      item.employeeId === employeeId &&
      item.businessDate === businessDate &&
      item.taskId === taskId &&
      (item.status === EmployeeWorkSessionStatus.started ||
        item.status === EmployeeWorkSessionStatus.working ||
        item.status === EmployeeWorkSessionStatus.paused ||
        item.status === EmployeeWorkSessionStatus.on_hold),
  );
}

export function startEmployeeWorkSession(
  input: StartWorkSessionInput,
  meta?: SessionMutationMeta,
): EmployeeWorkSession {
  const at = input.at ?? nowIso();
  const businessDate = input.businessDate ?? toBusinessDate(new Date(at));
  const existing = findOpenSession(input.employeeId, input.taskId, businessDate);
  if (existing) {
    if (
      existing.status === EmployeeWorkSessionStatus.paused ||
      existing.status === EmployeeWorkSessionStatus.on_hold
    ) {
      const resumed = resumeEmployeeWorkSession(existing.id, at, meta);
      if (!resumed) {
        throw { code: "NOT_FOUND", message: "Work session was not found." };
      }
      return resumed;
    }
    enforceActiveSessionLimit(
      input.employeeId,
      input.employeeName,
      input.operationName,
      input.roleName,
    );
    return existing;
  }

  const created = upsert({
    id: generateId("ews"),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    businessDate,
    taskId: input.taskId,
    taskName: input.taskName,
    taskUnitId: input.taskUnitId,
    productionOrderId: input.productionOrderId,
    productionOrderNumber: input.productionOrderNumber,
    startedAt: at,
    lastWorkStartedAt: at,
    status: EmployeeWorkSessionStatus.working,
    workedMinutes: 0,
    pauseMinutes: 0,
    breakMinutes: 0,
    remarks: input.remarks,
    rowVersion: 0,
  });
  try {
    enforceActiveSessionLimit(
      input.employeeId,
      input.employeeName,
      input.operationName,
      input.roleName,
    );
  } catch (error) {
    sessions = sessions.filter((item) => item.id !== created.id);
    throw error;
  }
  recordSessionAudit(created, "started", meta, at, {
    previousTaskId: undefined,
    previousOperation: undefined,
    previousOrderNumber: undefined,
    previousStatus: undefined,
    newTaskId: created.taskId,
    newOperation: created.taskName,
    newOrderNumber: created.productionOrderNumber,
  });
  return created;
}

export function pauseEmployeeWorkSession(
  sessionId: string,
  at = nowIso(),
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (
    session.status !== EmployeeWorkSessionStatus.working &&
    session.status !== EmployeeWorkSessionStatus.started
  ) {
    return session;
  }

  const previousStatus = session.status;
  const workedDelta = minutesBetween(session.lastWorkStartedAt ?? session.startedAt, at);
  const saved = upsert({
    ...session,
    workedMinutes: session.workedMinutes + workedDelta,
    status: EmployeeWorkSessionStatus.paused,
    lastWorkStartedAt: at,
    pauseReason: meta?.reason ?? session.pauseReason,
  });
  recordSessionAudit(saved, "paused", meta, at, { previousStatus });
  return saved;
}

export function holdEmployeeWorkSession(
  sessionId: string,
  at = nowIso(),
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  const paused = pauseEmployeeWorkSession(sessionId, at, { ...meta, suppressAudit: true });
  if (!paused) return null;
  const saved = upsert({
    ...paused,
    status: EmployeeWorkSessionStatus.on_hold,
    pauseReason: meta?.reason ?? paused.pauseReason,
  });
  recordSessionAudit(saved, "paused", meta, at, { previousStatus: EmployeeWorkSessionStatus.working });
  return saved;
}

export function resumeEmployeeWorkSession(
  sessionId: string,
  at = nowIso(),
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (
    session.status !== EmployeeWorkSessionStatus.paused &&
    session.status !== EmployeeWorkSessionStatus.on_hold
  ) {
    return session;
  }

  const previousStatus = session.status;
  const pauseDelta = minutesBetween(session.lastWorkStartedAt ?? session.startedAt, at);
  const saved = upsert({
    ...session,
    pauseMinutes: session.pauseMinutes + pauseDelta,
    status: EmployeeWorkSessionStatus.working,
    lastWorkStartedAt: at,
    endedAt: undefined,
  });
  try {
    enforceActiveSessionLimit(saved.employeeId, saved.employeeName, saved.taskName);
  } catch (error) {
    const index = sessions.findIndex((item) => item.id === saved.id);
    if (index !== -1) {
      sessions = sessions.slice();
      sessions[index] = session;
    }
    throw error;
  }
  recordSessionAudit(saved, "resumed", meta, at, {
    previousStatus,
    newTaskId: saved.taskId,
    newOperation: saved.taskName,
    newOrderNumber: saved.productionOrderNumber,
  });
  return saved;
}

export function completeEmployeeWorkSession(
  sessionId: string,
  at = nowIso(),
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  return finalizeSession(sessionId, EmployeeWorkSessionStatus.completed, at, meta);
}

export function stopEmployeeWorkSession(
  sessionId: string,
  at = nowIso(),
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  return finalizeSession(sessionId, EmployeeWorkSessionStatus.stopped, at, meta);
}

function finalizeSession(
  sessionId: string,
  status:
    | typeof EmployeeWorkSessionStatus.completed
    | typeof EmployeeWorkSessionStatus.stopped,
  at: string,
  meta?: SessionMutationMeta,
): EmployeeWorkSession | null {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  if (session.status === status) return session;

  let workedMinutes = session.workedMinutes;
  let pauseMinutes = session.pauseMinutes;

  if (
    session.status === EmployeeWorkSessionStatus.working ||
    session.status === EmployeeWorkSessionStatus.started
  ) {
    workedMinutes += minutesBetween(session.lastWorkStartedAt ?? session.startedAt, at);
  } else if (
    session.status === EmployeeWorkSessionStatus.paused ||
    session.status === EmployeeWorkSessionStatus.on_hold
  ) {
    pauseMinutes += minutesBetween(session.lastWorkStartedAt ?? session.startedAt, at);
  }

  const previousStatus = session.status;
  const saved = upsert({
    ...session,
    workedMinutes,
    pauseMinutes,
    status,
    endedAt: at,
    lastWorkStartedAt: undefined,
    stopReason:
      status === EmployeeWorkSessionStatus.stopped
        ? meta?.reason ?? session.stopReason
        : session.stopReason,
  });
  recordSessionAudit(
    saved,
    status === EmployeeWorkSessionStatus.stopped ? "stopped" : "completed",
    meta,
    at,
    { previousStatus },
  );
  return saved;
}

export function pauseOpenEmployeeWorkSessionsForDate(
  businessDate: string,
  at = nowIso(),
): EmployeeWorkSession[] {
  const open = sessions.filter(
    (item) =>
      item.businessDate === businessDate &&
      (item.status === EmployeeWorkSessionStatus.started ||
        item.status === EmployeeWorkSessionStatus.working),
  );
  return open
    .map((session) => pauseEmployeeWorkSession(session.id, at))
    .filter((session): session is EmployeeWorkSession => session != null);
}

/**
 * Mirror manufacturing task start/pause/resume/hold/complete into employee work sessions.
 * Progress % is ignored — only time events are recorded.
 */
export function syncEmployeeWorkSessionsFromTaskAction(
  job: ManufacturingJob,
  action: ManufacturingTaskAction,
  actor: WorkSessionActor,
  options?: { suppressAudit?: boolean; businessDate?: string },
): void {
  if (
    action.type !== "start" &&
    action.type !== "pause" &&
    action.type !== "resume" &&
    action.type !== "hold" &&
    action.type !== "complete"
  ) {
    return;
  }

  const task = job.tasks.find((item) => item.id === action.taskId);
  if (!task) return;

  const at = nowIso();
  const date = options?.businessDate ?? toBusinessDate(new Date(at));
  const units = ensureTaskUnits(task);
  const workers = (
    action.type === "complete"
      ? workerProgressFromUnits(units)
      : workerProgressFromUnits(units).filter((worker) => worker.status !== "completed")
  );
  const meta: SessionMutationMeta = { actor, suppressAudit: options?.suppressAudit };

  const people =
    workers.length > 0
      ? workers.map((w) => ({ userId: w.userId, userName: w.userName }))
      : [
          {
            userId:
              ("operatorId" in action && action.operatorId) ||
              ("assignedTo" in action && action.assignedTo) ||
              task.operatorId ||
              task.assignedTo ||
              actor.userId,
            userName:
              ("operatorName" in action && action.operatorName) ||
              ("assignedToName" in action && action.assignedToName) ||
              task.operatorName ||
              task.assignedToName ||
              actor.userName,
          },
        ];

  for (const person of people) {
    const open = findOpenSession(person.userId, task.id, date);

    if (action.type === "start" || action.type === "resume") {
      if (open && (open.status === "paused" || open.status === "on_hold")) {
        resumeEmployeeWorkSession(open.id, at, meta);
      } else if (!open) {
        startEmployeeWorkSession(
          {
            employeeId: person.userId,
            employeeName: person.userName,
            businessDate: date,
            taskId: task.id,
            taskName: task.name,
            productionOrderId: job.id,
            productionOrderNumber: job.jobNumber,
            operationName: task.name,
            at,
          },
          meta,
        );
      }
      continue;
    }

    if (!open) continue;

    if (action.type === "pause") {
      pauseEmployeeWorkSession(open.id, at, meta);
    } else if (action.type === "hold") {
      holdEmployeeWorkSession(open.id, at, meta);
    } else if (action.type === "complete") {
      const worker = workers.find((item) => item.userId === person.userId);
      const finished = task.status === "completed" || worker?.status === "completed";
      if (finished) {
        if (open) completeEmployeeWorkSession(open.id, at, meta);
      } else if (open && (open.status === "paused" || open.status === "on_hold")) {
        resumeEmployeeWorkSession(open.id, at, meta);
      } else if (!open) {
        startEmployeeWorkSession(
          {
            employeeId: person.userId,
            employeeName: person.userName,
            businessDate: date,
            taskId: task.id,
            taskName: task.name,
            productionOrderId: job.id,
            productionOrderNumber: job.jobNumber,
            operationName: task.name,
            at,
          },
          meta,
        );
      }
    }
  }
}
