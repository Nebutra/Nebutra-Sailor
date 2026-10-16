/**
 * Built-in monitors and the loop that runs them.
 *
 * Self-hosted, the loop runs inside the server process (instrumentation.ts).
 * Several replicas may run it; a lease row lets one of them probe at a time,
 * the pattern 小芽's business probes use across blue/green.
 */
import { classifyHttpStatus } from "@nebutra/status/probe-http";
import type { Monitor } from "@/generated/prisma/client";
import type { StatusDb } from "./db";
import type { ComponentState } from "./evaluate";
import { type EvidenceChange, recordEvidence } from "./evidence";

export interface MonitorResult {
  state: ComponentState;
  statusCode: number | null;
  latencyMs: number;
  note: string;
}

type MonitorSpec = Pick<
  Monitor,
  "kind" | "url" | "method" | "expectStatusMin" | "expectStatusMax" | "keyword" | "timeoutMs"
>;

/** Atlassian Statuspage `status.indicator` → our state. */
const STATUSPAGE_INDICATOR: Record<string, ComponentState> = {
  none: "operational",
  minor: "degraded",
  major: "outage",
  critical: "outage",
  maintenance: "maintenance",
};

/** A status outside the expected range is never green, even when it is a 2xx/3xx. */
function outOfRangeState(statusCode: number): ComponentState {
  const state = classifyHttpStatus(statusCode);
  return state === "operational" ? "degraded" : state;
}

async function attempt(spec: MonitorSpec, userAgent: string): Promise<MonitorResult> {
  const started = Date.now();
  try {
    const response = await fetch(spec.url, {
      method: spec.method,
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": userAgent, accept: "application/json,text/html;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(spec.timeoutMs),
    });
    const latencyMs = Date.now() - started;
    const inRange =
      response.status >= spec.expectStatusMin && response.status <= spec.expectStatusMax;
    if (!inRange) {
      return {
        state: outOfRangeState(response.status),
        statusCode: response.status,
        latencyMs,
        note: `HTTP ${response.status}`,
      };
    }
    if (spec.kind === "keyword" && spec.keyword) {
      const body = await response.text();
      return body.includes(spec.keyword)
        ? { state: "operational", statusCode: response.status, latencyMs, note: "Keyword found" }
        : { state: "degraded", statusCode: response.status, latencyMs, note: "Keyword missing" };
    }
    if (spec.kind === "statuspage") {
      const body = (await response.json().catch(() => null)) as {
        status?: { indicator?: string; description?: string };
      } | null;
      const indicator = body?.status?.indicator;
      const state = (indicator && STATUSPAGE_INDICATOR[indicator]) || "unknown";
      return {
        state,
        statusCode: response.status,
        latencyMs,
        note: body?.status?.description ?? `Upstream reports ${indicator ?? "nothing readable"}`,
      };
    }
    if (spec.kind === "json_status") {
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const raw = String(
        body?.status ??
          body?.overall ??
          (body?.ready === true ? "ok" : body?.ready === false ? "down" : ""),
      );
      const value = raw.toLowerCase();
      const state: ComponentState = ["ok", "up", "healthy", "operational", "pass"].includes(value)
        ? "operational"
        : ["warn", "degraded", "partial"].includes(value)
          ? "degraded"
          : ["down", "outage", "fail", "unhealthy", "error"].includes(value)
            ? "outage"
            : "unknown";
      return {
        state,
        statusCode: response.status,
        latencyMs,
        note: `Reports ${raw || "no status"}`,
      };
    }
    return {
      state: "operational",
      statusCode: response.status,
      latencyMs,
      note: "Responding normally",
    };
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      state: timedOut ? "degraded" : "outage",
      statusCode: null,
      latencyMs: Date.now() - started,
      note: timedOut ? `Timed out after ${spec.timeoutMs} ms` : "No response",
    };
  }
}

const CONFIRM_DELAY_MS = 1500;

/** A failure counts only when a second attempt agrees — one dropped packet is not an outage. */
export async function runMonitor(
  spec: MonitorSpec,
  userAgent = "NebutraStatus/1.0",
  confirmDelayMs = CONFIRM_DELAY_MS,
): Promise<MonitorResult> {
  const first = await attempt(spec, userAgent);
  if (first.state === "operational" || first.state === "maintenance") return first;
  await new Promise((resolve) => setTimeout(resolve, confirmDelayMs));
  return attempt(spec, userAgent);
}

const LEASE = "monitors";

export async function claimLease(
  db: StatusDb,
  holder: string,
  ttlSeconds: number,
  now = new Date(),
): Promise<boolean> {
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const claimed = await db.$executeRaw`
    INSERT INTO runner_leases (name, holder, expires_at) VALUES (${LEASE}, ${holder}, ${expiresAt})
    ON CONFLICT (name) DO UPDATE SET holder = EXCLUDED.holder, expires_at = EXCLUDED.expires_at
    WHERE runner_leases.holder = EXCLUDED.holder OR runner_leases.expires_at < ${now}`;
  return claimed > 0;
}

/**
 * Run every monitor that is due, at most `concurrency` at once. Each result is
 * recorded as evidence with a freshness window of three intervals, so one
 * missed tick does not flip the page but a stopped runner does.
 */
export async function runDueMonitors(
  db: StatusDb,
  options: { now?: Date; concurrency?: number; userAgent?: string; run?: typeof runMonitor } = {},
): Promise<EvidenceChange[]> {
  const now = options.now ?? new Date();
  const run = options.run ?? runMonitor;
  const due = await db.monitor.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: 500,
  });
  const changes: EvidenceChange[] = [];
  const queue = [...due];
  const worker = async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      const result = await run(m, options.userAgent);
      const change = await recordEvidence(db, {
        componentId: m.componentId,
        workspaceId: m.workspaceId,
        source: `monitor:${m.id}`,
        coverage: m.coverage,
        state: result.state,
        checkedAt: new Date(),
        latencyMs: result.latencyMs,
        note: result.note,
        freshnessSeconds: m.intervalSeconds * 3,
      });
      if (change) changes.push(change);
      await db.monitor.update({
        where: { id: m.id },
        data: { nextRunAt: new Date(Date.now() + m.intervalSeconds * 1000) },
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 8, due.length) }, worker));
  return changes;
}
