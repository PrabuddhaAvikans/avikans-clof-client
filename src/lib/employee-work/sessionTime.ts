import { minutesBetween } from "@/lib/employee-work/constants";
import { EmployeeWorkSessionStatus } from "@/types/employee-work";
import type { EmployeeWorkSession } from "@/types/employee-work";

const LIVE_STATUSES = new Set<string>([
  EmployeeWorkSessionStatus.started,
  EmployeeWorkSessionStatus.working,
]);

/** Started or working. Paused, stopped, and completed sessions are not active. */
export function isActiveWorkSession(session: EmployeeWorkSession): boolean {
  return LIVE_STATUSES.has(session.status);
}

/**
 * Productive worked minutes for a session as of `asOf`.
 * Pause / hold / break time is excluded unless `countPauseAsWorked` is set.
 */
export function calculateSessionWorkedMinutes(
  session: EmployeeWorkSession,
  asOf: string,
  options?: { countPauseAsWorked?: boolean },
): number {
  let worked = Math.max(0, session.workedMinutes);

  if (isActiveWorkSession(session)) {
    const anchor = session.lastWorkStartedAt ?? session.startedAt;
    worked += minutesBetween(anchor, asOf);
  }

  if (options?.countPauseAsWorked) {
    worked += Math.max(0, session.pauseMinutes) + Math.max(0, session.breakMinutes);
  }

  return worked;
}

export function calculateSessionPauseMinutes(
  session: EmployeeWorkSession,
  asOf: string,
): number {
  let paused = Math.max(0, session.pauseMinutes);
  if (
    session.status === EmployeeWorkSessionStatus.paused ||
    session.status === EmployeeWorkSessionStatus.on_hold
  ) {
    const anchor = session.lastWorkStartedAt ?? session.endedAt ?? session.startedAt;
    // When paused, lastWorkStartedAt holds the pause start time after finalize.
    paused += minutesBetween(anchor, asOf);
  }
  return paused;
}

export function isOpenWorkSession(session: EmployeeWorkSession): boolean {
  return (
    session.status === EmployeeWorkSessionStatus.started ||
    session.status === EmployeeWorkSessionStatus.working ||
    session.status === EmployeeWorkSessionStatus.paused ||
    session.status === EmployeeWorkSessionStatus.on_hold
  );
}
