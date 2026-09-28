/**
 * Pure uptime arithmetic, shared by the server history store and client
 * uptime strips. No storage imports here: this file ships to the browser.
 */

export type ServiceState = "operational" | "degraded" | "outage" | "unknown";

export interface DayStats {
  total: number;
  degraded: number;
  outage: number;
}

/** Statuspage weighting: a partial outage costs 30% of a full one. */
const DEGRADED_WEIGHT = 0.3;

const STATE_RANK: Record<ServiceState, number> = {
  operational: 0,
  unknown: 1,
  degraded: 2,
  outage: 3,
};

export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Share of a day's checks that count as available, 0–1. */
export function dayUptime(stats: DayStats): number {
  if (stats.total === 0) return 1;
  const lost = stats.outage + stats.degraded * DEGRADED_WEIGHT;
  return Math.max(0, 1 - lost / stats.total);
}

/**
 * The colour a day earns. One failed check among hundreds is noise the
 * confirm-retry already filtered once; it takes a sustained share to colour it.
 */
export function dayState(stats: DayStats): ServiceState {
  if (stats.total === 0) return "unknown";
  if (stats.outage / stats.total >= 0.05) return "outage";
  if ((stats.outage + stats.degraded) / stats.total >= 0.02) return "degraded";
  return "operational";
}

export function mergeDayState(
  previous: ServiceState | undefined,
  next: ServiceState,
): ServiceState {
  if (!previous) return next;
  return STATE_RANK[next] > STATE_RANK[previous] ? next : previous;
}
