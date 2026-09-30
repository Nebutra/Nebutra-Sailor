import "server-only";

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import {
  type PlanWindowConfig,
  type QuotaAlertDecisionFns,
  type QuotaObservationResult,
  type QuotaWindowRow,
  RouterSupplyRepository,
  type SupplySourceRow,
} from "@nebutra/repositories";
import {
  applyQuotaObservation,
  fetchCliProxyUsage,
  fetchNewApiChannelUsage,
  fetchOpenAiCompatibleBalance,
  forecastWithinHours,
  nextPullDelaySeconds,
  parseForceExhaustedUntil,
  parseUsageHeaders,
  ratioAlertLevel,
  shouldAlertForecast,
  shouldAlertRatio,
} from "@nebutra/router-supply";
import { notifyOpsAlert } from "@nebutra/status";
import { credentialFor } from "./capability";
import { newApiFindChannel, newApiLogin } from "./clients";

/**
 * Quota layer orchestration (ADR 2026-09-30 addendum). Wires
 * `@nebutra/router-supply`'s pure reducer/decision functions and
 * `RouterSupplyRepository`'s persistence together with the credentials and
 * webhooks only the app knows about — same split `./capability.ts`
 * established for capability probing.
 */

function repository(): RouterSupplyRepository {
  return new RouterSupplyRepository(getSystemDb());
}

/**
 * `RouterSupplyRepository.applyQuotaObservation` deliberately types its
 * injected transition function against broad `string` unit/state fields, not
 * `@nebutra/router-supply`'s narrow literal unions — the repository package
 * stays decoupled from that package's types (only a devDependency, for
 * tests). This adapts the real, narrowly-typed `applyQuotaObservation` to
 * that broader shape, the same way `capability.ts`'s `applyOutcomeAdapter`
 * adapts `applyOutcome`; the cast is safe because every value the repository
 * can read out of the database is one of the enum members these narrow types
 * already cover.
 */
const applyQuotaObservationAdapter: Parameters<RouterSupplyRepository["applyQuotaObservation"]>[3] =
  (window, observation, now) =>
    applyQuotaObservation(
      window as Parameters<typeof applyQuotaObservation>[0],
      observation as Parameters<typeof applyQuotaObservation>[1],
      now,
    );

/** Same broadening as `applyQuotaObservationAdapter`, for the injected alert-decision functions. */
const decide: QuotaAlertDecisionFns = {
  ratioAlertLevel,
  shouldAlertRatio,
  forecastWithinHours,
  shouldAlertForecast,
  nextPullDelaySeconds,
} as unknown as QuotaAlertDecisionFns;

/** How far out a forecast counts as "soon", and how often that alert may repeat. */
const FORECAST_ALERT_HOURS = 6;
const FORECAST_ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------- alerting

/** `{}` (no `url` key at all) rather than `{url: undefined}` — `exactOptionalPropertyTypes`. */
function windowUrl(): { url: string } | Record<string, never> {
  const origin = process.env.NEXT_PUBLIC_ROUTER_URL?.trim();
  return origin ? { url: `${origin.replace(/\/+$/, "")}/management.html#quota` } : {};
}

function describeWindow(window: QuotaWindowRow): string {
  const used = window.usedAmount.toFixed(2);
  const limit = window.limitAmount === null ? "?" : window.limitAmount.toFixed(2);
  const reset = window.resetsAt ? `, resets ${window.resetsAt.toISOString()}` : "";
  return `${used}/${limit} ${window.unit.toLowerCase()} used${reset}.`;
}

async function fireAlerts(outcome: QuotaObservationResult | null): Promise<void> {
  if (!outcome) return;
  const { window, ratioAlert, forecastAlert } = outcome;
  const jobs: Array<Promise<void>> = [];
  if (ratioAlert.fired) {
    jobs.push(
      notifyOpsAlert({
        title: `Supply quota ${ratioAlert.level} — ${window.sourceKey} · ${window.name}`,
        detail: describeWindow(window),
        severity: ratioAlert.level === "EXHAUSTED" ? "critical" : "warn",
        ...windowUrl(),
      }),
    );
  }
  if (forecastAlert.fired) {
    const rate = window.burnRatePerHour === null ? "?" : `${window.burnRatePerHour.toFixed(2)}/hr`;
    jobs.push(
      notifyOpsAlert({
        title: `Supply quota forecast — ${window.sourceKey} · ${window.name} may exhaust soon`,
        detail: `Burn rate ${rate}. Forecast exhaust ${window.forecastExhaustAt?.toISOString() ?? "unknown"}.`,
        severity: "warn",
        ...windowUrl(),
      }),
    );
  }
  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("[router-supply] quota alert dispatch failed", { error: String(result.reason) });
    }
  }
}

// ---------------------------------------------------------------- (a) passive header signals

/**
 * One relayed response's rate-limit/usage headers, turned into quota
 * observations. Fire-and-forget from `openai-edge.ts`'s existing passive
 * hook, same posture as `recordPassiveSignal` — a failure here must never
 * surface as a request failure.
 */
export async function recordQuotaHeaderSignal(input: {
  readonly sourceKey: string;
  readonly status: number;
  readonly headers: Headers | Record<string, string | null | undefined>;
  readonly now?: Date;
}): Promise<void> {
  try {
    const now = input.now ?? new Date();
    const repo = repository();

    const forceUntil = parseForceExhaustedUntil(input.status, input.headers, now);
    if (forceUntil) {
      const outcome = await repo.applyQuotaObservation(
        input.sourceKey,
        "rate_limit_429",
        { sourceOfTruth: "HEADER", forceExhaustedUntil: forceUntil, unit: "REQUESTS" },
        applyQuotaObservationAdapter,
        decide,
        now,
        FORECAST_ALERT_HOURS,
        FORECAST_ALERT_COOLDOWN_MS,
      );
      await fireAlerts(outcome);
    }

    const signals = parseUsageHeaders(input.headers, now);
    for (const signal of signals) {
      const outcome = await repo.applyQuotaObservation(
        input.sourceKey,
        signal.name,
        {
          limit: signal.limit,
          remaining: signal.remaining,
          resetsAt: signal.resetsAt,
          sourceOfTruth: "HEADER",
          unit: signal.unit,
        },
        applyQuotaObservationAdapter,
        decide,
        now,
        FORECAST_ALERT_HOURS,
        FORECAST_ALERT_COOLDOWN_MS,
      );
      await fireAlerts(outcome);
    }
  } catch (error) {
    logger.error("[router-supply] quota header signal recording failed", {
      sourceKey: input.sourceKey,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

// ---------------------------------------------------------------- (c) self-metering

export interface SelfMeteredUsage {
  readonly costUsd: number;
  readonly totalTokens: number;
}

/**
 * Every relayed request settled through a source with declared plan windows
 * (`billing-edge.ts` `settle()`) increments every self-metered window on that
 * source by the request's real settled cost/tokens/request-count — the input
 * to §1c, no endpoint required. A source with no `planConfig` (or an unknown
 * `sourceKey`, e.g. relay-only mode with no supply registry entry) is a
 * silent no-op — self-metering is additive, never a requirement to bill.
 */
export async function runSelfMeteredTick(
  sourceKey: string,
  usage: SelfMeteredUsage,
  now: Date = new Date(),
): Promise<void> {
  try {
    const repo = repository();
    const source = await repo.getSourceByKey(sourceKey);
    if (!source) return;

    const plan = parsePlanConfig(source.planConfig);
    if (plan.length > 0) await repo.ensureQuotaWindowsFromPlan(source.id, plan, now);

    const windows = await repo.listSelfMeteredWindowsForSource(source.id);
    for (const window of windows) {
      const deltaUsed =
        window.unit === "USD" ? usage.costUsd : window.unit === "TOKENS" ? usage.totalTokens : 1;
      const outcome = await repo.applyQuotaObservation(
        sourceKey,
        window.name,
        { deltaUsed, sourceOfTruth: "SELF_METERED" },
        applyQuotaObservationAdapter,
        decide,
        now,
        FORECAST_ALERT_HOURS,
        FORECAST_ALERT_COOLDOWN_MS,
      );
      await fireAlerts(outcome);
    }
  } catch (error) {
    logger.error("[router-supply] self-metered tick failed", {
      sourceKey,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function parsePlanConfig(raw: unknown): PlanWindowConfig[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanWindowConfig[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== "string" || typeof e.unit !== "string") continue;
    out.push({
      name: e.name,
      unit: e.unit,
      limitAmount: typeof e.limitAmount === "number" ? e.limitAmount : null,
      windowSeconds: typeof e.windowSeconds === "number" ? e.windowSeconds : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- (b) active usage pulls

async function usageForSource(source: SupplySourceRow, fetchImpl: typeof fetch) {
  const credential = await credentialFor(source);
  switch (source.kind) {
    case "CLIPROXYAPI":
      return fetchCliProxyUsage(credential, fetchImpl);
    case "NEWAPI_CHANNEL":
      return fetchNewApiChannelUsage(
        credential,
        { login: (f) => newApiLogin(f), findChannel: (f, s, n) => newApiFindChannel(f, s, n) },
        fetchImpl,
      );
    default:
      return fetchOpenAiCompatibleBalance(credential, fetchImpl);
  }
}

export interface QuotaPullResult {
  readonly sourceKey: string;
  readonly windowName: string;
  readonly state: string;
  readonly note?: string;
}

/**
 * Adaptive active-usage pull (§6): every window due (`nextPullAt <= now`)
 * gets ticked. A self-metered window's tick is a zero-delta observation —
 * purely a rollover check, so an idle window still recovers at `resetsAt`
 * with no traffic. An endpoint-sourced window's due source gets one real
 * adapter call (§1b), grouped per source so a source with several reported
 * windows (e.g. CLIProxyAPI's per-provider breakdown) is pulled once.
 */
export async function runQuotaPull(
  limit = 100,
  fetchImpl: typeof fetch = fetch,
): Promise<QuotaPullResult[]> {
  const repo = repository();
  const due = await repo.listQuotaWindowsDueForPull(new Date(), limit);
  if (due.length === 0) return [];

  const results: QuotaPullResult[] = [];

  for (const window of due.filter((w) => w.sourceOfTruth === "SELF_METERED")) {
    const outcome = await repo.applyQuotaObservation(
      window.sourceKey,
      window.name,
      { deltaUsed: 0, sourceOfTruth: "SELF_METERED" },
      applyQuotaObservationAdapter,
      decide,
      new Date(),
      FORECAST_ALERT_HOURS,
      FORECAST_ALERT_COOLDOWN_MS,
    );
    await fireAlerts(outcome);
    if (outcome) {
      results.push({
        sourceKey: window.sourceKey,
        windowName: window.name,
        state: outcome.window.state,
      });
    }
  }

  const endpointSourceIds = new Set(
    due.filter((w) => w.sourceOfTruth === "ENDPOINT").map((w) => w.sourceId),
  );
  if (endpointSourceIds.size > 0) {
    const sources = await repo.listSources();
    const byId = new Map(sources.map((s) => [s.id, s]));
    for (const sourceId of endpointSourceIds) {
      const source = byId.get(sourceId);
      if (!source) continue;
      const usage = await usageForSource(source, fetchImpl);
      if (!usage.ok) {
        results.push({
          sourceKey: source.key,
          windowName: "*",
          state: "unknown",
          note: usage.note,
        });
        continue;
      }
      for (const w of usage.windows) {
        const outcome = await repo.applyQuotaObservation(
          source.key,
          w.name,
          {
            used: w.used,
            limit: w.limit,
            resetsAt: w.resetsAt,
            sourceOfTruth: "ENDPOINT",
            unit: w.unit,
          },
          applyQuotaObservationAdapter,
          decide,
          new Date(),
          FORECAST_ALERT_HOURS,
          FORECAST_ALERT_COOLDOWN_MS,
        );
        await fireAlerts(outcome);
        if (outcome) {
          results.push({ sourceKey: source.key, windowName: w.name, state: outcome.window.state });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------- admin surface

export async function listQuotaWindowsForAdmin(filter?: {
  sourceKey?: string;
}): Promise<Array<Record<string, unknown>>> {
  const repo = repository();
  let sourceId: string | undefined;
  if (filter?.sourceKey) {
    const source = await repo.getSourceByKey(filter.sourceKey);
    sourceId = source?.id;
    if (!sourceId) return [];
  }
  const rows = await repo.listQuotaWindows({ ...(sourceId ? { sourceId } : {}) });
  return rows.map((w) => ({
    id: w.id,
    source: w.sourceKey,
    name: w.name,
    unit: w.unit,
    usedAmount: w.usedAmount,
    limitAmount: w.limitAmount,
    state: w.state,
    sourceOfTruth: w.sourceOfTruth,
    burnRatePerHour: w.burnRatePerHour,
    forecastExhaustAt: w.forecastExhaustAt?.toISOString() ?? null,
    resetsAt: w.resetsAt?.toISOString() ?? null,
    lastAlertLevel: w.lastAlertLevel,
    lastSampleAt: w.lastSampleAt?.toISOString() ?? null,
    nextPullAt: w.nextPullAt?.toISOString() ?? null,
  }));
}

/** Admin `source.plan.update` (§5): edit a source's declared plan windows. */
export async function updateSourcePlanConfig(
  sourceKey: string,
  planConfig: readonly PlanWindowConfig[],
): Promise<{ sourceKey: string; windows: number }> {
  const repo = repository();
  const source = await repo.updatePlanConfig(sourceKey, planConfig);
  await repo.ensureQuotaWindowsFromPlan(source.id, planConfig);
  return { sourceKey, windows: planConfig.length };
}

/** Signal: any window currently THROTTLED/EXHAUSTED, or forecasting exhaustion soon. */
export async function quotaAlertSignalData(): Promise<
  Array<{ source: string; window: string; state: string; forecastExhaustAt: string | null }>
> {
  const repo = repository();
  const windows = await repo.listQuotaWindows();
  const now = new Date();
  return windows
    .filter(
      (w) =>
        w.state === "THROTTLED" ||
        w.state === "EXHAUSTED" ||
        forecastWithinHours(w.forecastExhaustAt, now, FORECAST_ALERT_HOURS),
    )
    .map((w) => ({
      source: w.sourceKey,
      window: w.name,
      state: w.state,
      forecastExhaustAt: w.forecastExhaustAt?.toISOString() ?? null,
    }));
}
