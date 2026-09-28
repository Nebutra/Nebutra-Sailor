import { type DayStats, dayUptime, type ServiceState, utcDateKey } from "./math";
import { getStatusKv } from "./store";

const KNOWN_STATES = new Set(["operational", "unknown", "degraded", "outage"]);

/**
 * Per-day check counters. Each recorded probe run adds one check per service
 * and, when it failed, one to the failing bucket. A day's colour and uptime
 * come from the ratio, not from the worst single reading: worst-of-day painted
 * a whole day amber for one 4.5s timeout, which is how Console sat "degraded"
 * for a week while answering every request.
 */
const COUNTS_PREFIX = "status:checks:v1:";
/** Pre-counter history: worst state per day. Read for days with no counters. */
const LEGACY_PREFIX = "status:uptime:v1:";

/** Minimum gap between recorded probe runs, however many visitors load the page. */
export const PROBE_SAMPLE_SECONDS = 55;
const PROBE_LOCK_KEY = "status:probe-lock:v1";

export interface ServiceHistory {
  /** UTC date → check counts. Only days recorded since counting began. */
  days: Record<string, DayStats>;
  /**
   * UTC date → the worst single reading, for days before counting began.
   * They keep their colour on the strip but never count toward uptime: one
   * timeout set a whole day's value, so they cannot say how long anything
   * was down.
   */
  legacy: Record<string, ServiceState>;
}

/** True when this caller should record — at most one run per sample window. */
export async function claimProbeSample(): Promise<boolean> {
  return getStatusKv().setIfAbsent(PROBE_LOCK_KEY, "1", PROBE_SAMPLE_SECONDS);
}

export async function recordProbeHistory(
  services: Array<{ id: string; state: ServiceState }>,
  now: Date = new Date(),
): Promise<void> {
  const kv = getStatusKv();
  const date = utcDateKey(now);
  await Promise.all(
    services.map(async (s) => {
      const key = `${COUNTS_PREFIX}${s.id}`;
      await kv.hincrby(key, `${date}:n`, 1);
      if (s.state === "outage") await kv.hincrby(key, `${date}:outage`, 1);
      else if (s.state !== "operational") await kv.hincrby(key, `${date}:degraded`, 1);
    }),
  );
}

export async function loadServiceHistory(serviceId: string): Promise<ServiceHistory> {
  const kv = getStatusKv();
  const [counts, legacy] = await Promise.all([
    kv.hgetall(`${COUNTS_PREFIX}${serviceId}`),
    kv.hgetall(`${LEGACY_PREFIX}${serviceId}`),
  ]);
  const days: Record<string, DayStats> = {};
  for (const [field, raw] of Object.entries(counts)) {
    const [date, bucket] = field.split(":");
    const value = Number(raw);
    if (!date || !bucket || !Number.isFinite(value)) continue;
    const day = days[date] ?? { total: 0, degraded: 0, outage: 0 };
    if (bucket === "n") day.total = value;
    else if (bucket === "degraded") day.degraded = value;
    else if (bucket === "outage") day.outage = value;
    days[date] = day;
  }
  const legacyDays: Record<string, ServiceState> = {};
  for (const [date, value] of Object.entries(legacy)) {
    if (days[date] || !KNOWN_STATES.has(value)) continue;
    legacyDays[date] = value as ServiceState;
  }
  return { days, legacy: legacyDays };
}

export async function loadAllServiceHistory(
  serviceIds: string[],
): Promise<Record<string, ServiceHistory>> {
  const entries = await Promise.all(
    serviceIds.map(async (id) => [id, await loadServiceHistory(id)] as const),
  );
  return Object.fromEntries(entries);
}

/** Mean daily uptime over the days that have data, 0–1; null when none do. */
export function windowUptime(history: ServiceHistory, dates: string[]): number | null {
  let days = 0;
  let sum = 0;
  for (const date of dates) {
    const day = history.days[date];
    if (!day || day.total === 0) continue;
    days += 1;
    sum += dayUptime(day);
  }
  return days === 0 ? null : sum / days;
}
