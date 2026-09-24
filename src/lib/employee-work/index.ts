export {
  REQUIRED_DAILY_WORK_MINUTES,
  formatWorkedDuration,
  minutesBetween,
} from "@/lib/employee-work/constants";

export {
  calculateSessionPauseMinutes,
  calculateSessionWorkedMinutes,
  isActiveWorkSession,
  isOpenWorkSession,
} from "@/lib/employee-work/sessionTime";

export {
  activeSessionLimit,
  employeesStartingWork,
  isActiveWorkConfirmationError,
  resolveConcurrentWorkPolicy,
  sessionsBlockingNewWork,
  CONCURRENT_WORK_RULES,
  type ConcurrentWorkRule,
} from "@/lib/employee-work/activeWork";

export {
  estimateDailyLabourCost,
  splitDailyWorkMinutes,
} from "@/lib/employee-work/overtime";

export {
  DEFAULT_DOUBLE_OVERTIME_AFTER_MINUTES,
  buildEmployeeDaySummaries,
  countCompletedEmployeeDays,
  countEmployeesWithOvertime,
  countIncompleteEmployeeDays,
  sumEmployeeOvertimeMinutes,
  validateEmployeeDayHours,
  type BuildEmployeeDaySummariesOptions,
  type EmployeeDayClosePolicy,
  type EmployeeDayValidationContext,
} from "@/lib/employee-work/employeeDayClose";
