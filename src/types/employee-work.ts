/**
 * Employee work sessions and daily hour close.
 * Working hours are tracked from sessions — never from task progress %.
 */

export const EmployeeWorkSessionStatus = {
  started: "started",
  working: "working",
  paused: "paused",
  on_hold: "on_hold",
  completed: "completed",
  stopped: "stopped",
} as const;

export type EmployeeWorkSessionStatusValue =
  (typeof EmployeeWorkSessionStatus)[keyof typeof EmployeeWorkSessionStatus];

export const EmployeeDayStatus = {
  completed: "completed",
  incomplete: "incomplete",
} as const;

export type EmployeeDayStatusValue =
  (typeof EmployeeDayStatus)[keyof typeof EmployeeDayStatus];

export type EmployeeWorkSession = {
  id: string;
  employeeId: string;
  employeeName: string;
  businessDate: string;
  taskId?: string;
  taskName?: string;
  taskUnitId?: string;
  productionOrderId?: string;
  productionOrderNumber?: string;
  startedAt: string;
  endedAt?: string;
  /** Last moment productive work resumed (used while status is working). While paused/on hold, holds the pause start. */
  lastWorkStartedAt?: string;
  status: EmployeeWorkSessionStatusValue;
  /** Productive minutes excluding pause/break (unless policy counts them). */
  workedMinutes: number;
  pauseMinutes: number;
  breakMinutes: number;
  remarks?: string;
  pauseReason?: string;
  stopReason?: string;
  /** Optimistic concurrency token. Incremented on every session write. */
  rowVersion?: number;
};

export type EmployeeTaskWorkBreakdown = {
  taskId: string;
  taskName: string;
  productionOrderId?: string;
  productionOrderNumber?: string;
  workedMinutes: number;
  /** Task/unit progress is informational only — not used for day close. */
  progressPercentage?: number;
  taskStatus?: string;
};

export type EmployeeDayWorkSummary = {
  employeeId: string;
  employeeName: string;
  businessDate: string;
  requiredMinutes: number;
  workedMinutes: number;
  /** Productive minutes counted as regular (≤ required). */
  regularMinutes: number;
  /** Minutes beyond required at normal OT rate. */
  normalOvertimeMinutes: number;
  /** Minutes beyond double-OT threshold. */
  doubleOvertimeMinutes: number;
  /** normalOvertimeMinutes + doubleOvertimeMinutes. */
  overtimeMinutes: number;
  pauseMinutes: number;
  breakMinutes: number;
  /** Wall-clock span from first start to last end/now (includes pauses). */
  attendanceMinutes: number;
  remainingMinutes: number;
  dayStatus: EmployeeDayStatusValue;
  /** True when workedMinutes >= requiredMinutes. */
  canClose: boolean;
  /** Estimated labour cost for the day's hour split. */
  regularCost: number;
  normalOvertimeCost: number;
  doubleOvertimeCost: number;
  overtimeCost: number;
  laborCost: number;
  sessions: EmployeeWorkSession[];
  taskBreakdown: EmployeeTaskWorkBreakdown[];
};

/** Thrown when starting work would exceed the employee's active-session limit. */
export const ACTIVE_WORK_CONFIRMATION_CODE = "ACTIVE_WORK_CONFIRMATION_REQUIRED";

export type ConcurrentWorkPolicy = {
  /** When false, an employee may have only one active work session. */
  allowConcurrentWork: boolean;
  /** Used only when allowConcurrentWork is true. */
  maxConcurrentTasks: number;
};

export type ActiveWorkConflict = {
  employeeId: string;
  employeeName: string;
  sessionId: string;
  rowVersion: number;
  taskId?: string;
  operation: string;
  productionOrderId?: string;
  productionOrderNumber?: string;
  startedAt: string;
  workedMinutes: number;
  progressPercentage: number;
  taskStatus?: string;
};

export type ActiveWorkConfirmationError = {
  code: typeof ACTIVE_WORK_CONFIRMATION_CODE;
  message: string;
  conflicts: ActiveWorkConflict[];
};

export type ConfirmedActiveSession = {
  sessionId: string;
  rowVersion: number;
};

/** Supervisor confirmation required before closing the current session. */
export type ActiveSessionSwitch = {
  action: "pause" | "stop";
  reason?: string;
  confirmedSessions: ConfirmedActiveSession[];
};

export type WorkSessionAuditAction =
  | "started"
  | "paused"
  | "stopped"
  | "resumed"
  | "completed"
  | "pause_and_start"
  | "stop_and_start";

export type WorkSessionAuditEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  previousTaskId?: string;
  previousOperation?: string;
  previousOrderNumber?: string;
  previousStatus?: string;
  previousProgress?: number;
  newTaskId?: string;
  newOperation?: string;
  newOrderNumber?: string;
  action: WorkSessionAuditAction;
  reason?: string;
  changedById: string;
  changedByName: string;
  changedAt: string;
};
