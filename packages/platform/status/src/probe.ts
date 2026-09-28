import pLimit from "p-limit";
import {
  claimProbeSample,
  loadAllServiceHistory,
  recordProbeHistory,
  type ServiceHistory,
  windowUptime,
} from "./history";
import {
  listActiveIncidents,
  listIncidents,
  listOpenMaintenance,
  type StatusIncident,
} from "./incidents";
import type { StateChange } from "./mail";
import { type DayStats, dayState, type ServiceState, utcDateKey } from "./math";
import { getStatusKv, isStatusHistoryDurable } from "./store";

export interface ServiceProbe {
  id: string;
  name: string;
  description: string;
  url: string;
  state: ServiceState;
  statusCode: number | null;
  latencyMs: number | null;
  checkedAt: string;
  note: string;
  /** UTC date → the state the day earned from its checks. */
  history?: Record<string, ServiceState>;
  /** UTC date → raw check counts behind `history`. */
  days?: Record<string, DayStats>;
  /** Mean daily uptime over the 90-day window, 0–1; null before any data. */
  uptime90?: number | null;
}

export interface StatusSnapshot {
  checkedAt: string;
  overall: Exclude<ServiceState, "unknown">;
  services: ServiceProbe[];
  activeIncidents: StatusIncident[];
  /** Maintenance not yet completed, soonest first. */
  maintenance: StatusIncident[];
  /** All incidents for history feed (resolved + active). */
  incidents: StatusIncident[];
  historyDurable: boolean;
}

export interface ServiceTarget {
  id: string;
  name: string;
  description: string;
  url: string;
  /** Read a JSON readiness/status body (`{ ready, failing }` or `{ status }`). */
  readiness?: boolean;
}

const TIMEOUT_MS = 4500;
const STATUS_PROBE_CONCURRENCY = 2;

function classifyHttpStatus(statusCode: number): ServiceState {
  if (statusCode >= 200 && statusCode < 400) return "operational";
  if (statusCode >= 400 && statusCode < 500) return "outage";
  if (statusCode >= 500) return "degraded";
  return "unknown";
}

interface ApiReading {
  state: ServiceState;
  note: string | null;
}

function readinessFailures(payload: { failing?: unknown }): string[] {
  return Array.isArray(payload.failing) ? payload.failing.map(String) : [];
}

/**
 * Interpret the API probe body. Understands the readiness contract
 * (`{ ready, failing }` from /misc/ready) and the older status contract
 * (`{ status: healthy | degraded | unhealthy }`) so a redeploy that moves the
 * probe target does not blank the status page.
 */
function readApiPayload(payload: unknown, fallback: ServiceState): ApiReading {
  if (!payload || typeof payload !== "object") {
    return { state: fallback, note: null };
  }

  if ("ready" in payload) {
    const readiness = payload as { ready: unknown; failing?: unknown };
    if (readiness.ready === true) {
      return { state: "operational", note: "API ready" };
    }
    const failing = readinessFailures(readiness);
    // No database means no request succeeds; a missing rate-limit store
    // degrades to the per-instance bucket but still answers.
    const state: ServiceState = failing.includes("database") ? "outage" : "degraded";
    const note = failing.length > 0 ? `API not ready: ${failing.join(", ")}` : "API not ready";
    return { state, note };
  }

  if ("status" in payload) {
    const status = String((payload as { status: unknown }).status);
    const note = `API reports ${status}`;
    if (status === "healthy") return { state: "operational", note };
    if (status === "degraded") return { state: "degraded", note };
    if (status === "unhealthy") return { state: "outage", note };
    return { state: fallback, note };
  }

  return { state: fallback, note: null };
}

const CONFIRM_DELAY_MS = 1500;

/**
 * A failure is confirmed by a second attempt before it counts, the way hosted
 * monitors confirm from a second region: a single dropped connection is the
 * network between two clouds, not the service.
 */
export async function probeService(
  target: ServiceTarget,
  userAgent = "Status-Probe/1.0",
): Promise<ServiceProbe> {
  const first = await probeOnce(target, userAgent);
  if (first.state === "operational") return first;
  await new Promise((resolve) => setTimeout(resolve, CONFIRM_DELAY_MS));
  return probeOnce(target, userAgent);
}

async function probeOnce(target: ServiceTarget, userAgent: string): Promise<ServiceProbe> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,text/html;q=0.8,*/*;q=0.5",
        "user-agent": userAgent,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;
    let state = classifyHttpStatus(response.status);
    let note = response.ok ? "Responding normally" : `HTTP ${response.status}`;

    if (target.readiness && response.headers.get("content-type")?.includes("json")) {
      try {
        const reading = readApiPayload(await response.json(), state);
        state = reading.state;
        if (reading.note) {
          note = reading.note;
        }
      } catch {
        note = "API responded, but status payload was not readable";
        state = state === "operational" ? "degraded" : state;
      }
    }

    return {
      ...target,
      state,
      statusCode: response.status,
      latencyMs,
      checkedAt,
      note,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      ...target,
      state: isTimeout ? "degraded" : "outage",
      statusCode: null,
      latencyMs: Date.now() - startedAt,
      checkedAt,
      note: isTimeout ? "Timed out before the health deadline" : "No successful response",
    };
  }
}

export function summarize(services: ServiceProbe[]): StatusSnapshot["overall"] {
  if (services.some((service) => service.state === "outage")) return "outage";
  if (services.some((service) => service.state === "degraded" || service.state === "unknown")) {
    return "degraded";
  }
  return "operational";
}

const LAST_STATE_KEY = "status:last-state:v1";

/**
 * Compare each recorded sample with the previous one. Only recorded samples
 * count, so the confirm-retry and the sample lock both stand between one
 * flaky request and an alert. The first sample for a service sets a baseline
 * and alerts nobody.
 */
async function recordStateChanges(probed: ServiceProbe[]): Promise<StateChange[]> {
  const kv = getStatusKv();
  const previous = await kv.hgetall(LAST_STATE_KEY);
  const changes: StateChange[] = [];
  for (const service of probed) {
    const before = previous[service.id] as ServiceState | undefined;
    if (before === service.state) continue;
    await kv.hset(LAST_STATE_KEY, service.id, service.state);
    if (before) {
      changes.push({
        id: service.id,
        name: service.name,
        from: before,
        to: service.state,
        note: service.note,
      });
    }
  }
  return changes;
}

const UPTIME_WINDOW = 90;

function windowDates(now: Date): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: UPTIME_WINDOW }, (_, i) =>
    new Date(today - (UPTIME_WINDOW - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

function historyStates(history: ServiceHistory): Record<string, ServiceState> {
  return Object.fromEntries(
    Object.entries(history.days).map(([date, stats]) => [date, dayState(stats)]),
  );
}

/**
 * Probe every target, record one sample per window, and assemble the page
 * snapshot: live readings, 90-day history, incidents and maintenance.
 */
export async function buildStatusSnapshot(
  targets: ServiceTarget[],
  options: {
    userAgent?: string;
    concurrency?: number;
    /** Called when a recorded sample changes a service's state. */
    onStateChange?: (changes: StateChange[]) => Promise<void>;
  } = {},
): Promise<StatusSnapshot> {
  const limit = pLimit(options.concurrency ?? STATUS_PROBE_CONCURRENCY);
  const probed = await Promise.all(
    targets.map((target) => limit(() => probeService(target, options.userAgent))),
  );

  // One recorded run per sample window: the cron guarantees the floor, page
  // views can only fill gaps, never weight the day toward whoever was looking.
  try {
    if (await claimProbeSample()) {
      await recordProbeHistory(probed.map((s) => ({ id: s.id, state: s.state })));
      const changes = await recordStateChanges(probed);
      if (changes.length > 0 && options.onStateChange) await options.onStateChange(changes);
    }
  } catch {
    // History is best-effort — page still serves live probes.
  }

  let historyByService: Record<string, ServiceHistory> = {};
  try {
    historyByService = await loadAllServiceHistory(probed.map((s) => s.id));
  } catch {
    historyByService = {};
  }

  const now = new Date();
  const dates = windowDates(now);
  const today = utcDateKey(now);
  const services = probed.map((service) => {
    const history = historyByService[service.id] ?? { days: {} };
    const states = historyStates(history);
    // Today's cell shows the live reading until the day has checks of its own.
    if (!history.days[today]) states[today] = service.state;
    return {
      ...service,
      history: states,
      days: history.days,
      uptime90: windowUptime(history, dates),
    };
  });

  let activeIncidents: StatusIncident[] = [];
  let incidents: StatusIncident[] = [];
  let maintenance: StatusIncident[] = [];
  try {
    [activeIncidents, incidents, maintenance] = await Promise.all([
      listActiveIncidents(),
      listIncidents(),
      listOpenMaintenance(now),
    ]);
  } catch {
    activeIncidents = [];
    incidents = [];
    maintenance = [];
  }

  return {
    checkedAt: now.toISOString(),
    overall: summarize(services),
    services,
    activeIncidents,
    maintenance,
    incidents,
    historyDurable: isStatusHistoryDurable(),
  };
}
