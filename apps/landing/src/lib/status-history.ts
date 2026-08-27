import type { ServiceState } from "./status-checks";
import { getStatusKv } from "./status-store";

const KEY_PREFIX = "status:uptime:v1:";

/** Worst-of-day ranking — outage sticks for the calendar day. */
const STATE_RANK: Record<ServiceState, number> = {
  operational: 0,
  unknown: 1,
  degraded: 2,
  outage: 3,
};

export function mergeDayState(
  previous: ServiceState | undefined,
  next: ServiceState,
): ServiceState {
  if (!previous) return next;
  return STATE_RANK[next] > STATE_RANK[previous] ? next : previous;
}

export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function historyKey(serviceId: string): string {
  return `${KEY_PREFIX}${serviceId}`;
}

export async function recordServiceDayState(
  serviceId: string,
  state: ServiceState,
  now: Date = new Date(),
): Promise<void> {
  const kv = getStatusKv();
  const date = utcDateKey(now);
  const key = historyKey(serviceId);
  const existing = (await kv.hgetall(key))[date] as ServiceState | undefined;
  const merged = mergeDayState(existing && existing in STATE_RANK ? existing : undefined, state);
  await kv.hset(key, date, merged);
}

export async function recordProbeHistory(
  services: Array<{ id: string; state: ServiceState }>,
  now: Date = new Date(),
): Promise<void> {
  await Promise.all(services.map((s) => recordServiceDayState(s.id, s.state, now)));
}

export async function loadServiceHistory(serviceId: string): Promise<Record<string, ServiceState>> {
  const raw = await getStatusKv().hgetall(historyKey(serviceId));
  const out: Record<string, ServiceState> = {};
  for (const [date, value] of Object.entries(raw)) {
    if (value in STATE_RANK) out[date] = value as ServiceState;
  }
  return out;
}

export async function loadAllServiceHistory(
  serviceIds: string[],
): Promise<Record<string, Record<string, ServiceState>>> {
  const entries = await Promise.all(
    serviceIds.map(async (id) => [id, await loadServiceHistory(id)] as const),
  );
  return Object.fromEntries(entries);
}
