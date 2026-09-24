import { WorkerSessionCloseRule } from "@/types/period-close";
import type {
  PeriodActor,
  WorkerSessionCheckpoint,
  WorkerSessionCloseRuleValue,
} from "@/types/period-close";

export type ActiveWorkerSession = {
  sessionId: string;
  workerId: string;
  workerName: string;
  productionOrderId: string;
  operationId: string;
  operationName: string;
  progressPercentage: number;
  startedAt: string;
};

export type WorkerSessionCloseOutcome = {
  allowed: boolean;
  requiresSupervisorConfirm: boolean;
  checkpoints: Omit<WorkerSessionCheckpoint, "id" | "businessPeriodId" | "businessDate">[];
  message?: string;
};

/**
 * Apply the configured day-close rule to active worker sessions.
 * Never marks a task completed — only checkpoints / pauses / continues.
 */
export function applyWorkerSessionCloseRule(options: {
  rule: WorkerSessionCloseRuleValue;
  sessions: ActiveWorkerSession[];
  checkpointAt: string;
  supervisorConfirmed?: boolean;
  actor: PeriodActor;
}): WorkerSessionCloseOutcome {
  const { rule, sessions, checkpointAt, supervisorConfirmed } = options;

  if (sessions.length === 0) {
    return { allowed: true, requiresSupervisorConfirm: false, checkpoints: [] };
  }

  if (rule === WorkerSessionCloseRule.require_supervisor_confirm) {
    if (!supervisorConfirmed) {
      return {
        allowed: false,
        requiresSupervisorConfirm: true,
        checkpoints: sessions.map((session) => ({
          sessionId: session.sessionId,
          workerId: session.workerId,
          workerName: session.workerName,
          productionOrderId: session.productionOrderId,
          operationId: session.operationId,
          operationName: session.operationName,
          progressPercentage: session.progressPercentage,
          startedAt: session.startedAt,
          checkpointAt,
          ruleApplied: rule,
          status: "awaiting_confirm" as const,
        })),
        message: `${sessions.length} active worker session(s) require supervisor confirmation before Day Close.`,
      };
    }

    return {
      allowed: true,
      requiresSupervisorConfirm: false,
      checkpoints: sessions.map((session) => ({
        sessionId: session.sessionId,
        workerId: session.workerId,
        workerName: session.workerName,
        productionOrderId: session.productionOrderId,
        operationId: session.operationId,
        operationName: session.operationName,
        progressPercentage: session.progressPercentage,
        startedAt: session.startedAt,
        checkpointAt,
        ruleApplied: rule,
        status: "paused" as const,
      })),
    };
  }

  if (rule === WorkerSessionCloseRule.allow_cross_date) {
    return {
      allowed: true,
      requiresSupervisorConfirm: false,
      checkpoints: sessions.map((session) => ({
        sessionId: session.sessionId,
        workerId: session.workerId,
        workerName: session.workerName,
        productionOrderId: session.productionOrderId,
        operationId: session.operationId,
        operationName: session.operationName,
        progressPercentage: session.progressPercentage,
        startedAt: session.startedAt,
        checkpointAt,
        ruleApplied: rule,
        status: "continued" as const,
      })),
    };
  }

  // Default: pause_and_checkpoint
  return {
    allowed: true,
    requiresSupervisorConfirm: false,
    checkpoints: sessions.map((session) => ({
      sessionId: session.sessionId,
      workerId: session.workerId,
      workerName: session.workerName,
      productionOrderId: session.productionOrderId,
      operationId: session.operationId,
      operationName: session.operationName,
      progressPercentage: session.progressPercentage,
      startedAt: session.startedAt,
      checkpointAt,
      ruleApplied: WorkerSessionCloseRule.pause_and_checkpoint,
      status: "paused" as const,
    })),
  };
}
