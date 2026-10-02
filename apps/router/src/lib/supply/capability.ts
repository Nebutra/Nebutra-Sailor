import "server-only";

import { randomUUID } from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import {
  type DiscoveryDiff,
  type ModelAvailability,
  RouterSupplyRepository,
  type SupplyCapabilityRow,
  type SupplySourceRow,
} from "@nebutra/repositories";
import {
  applyOutcome,
  detectProtocol,
  discoverCliProxyApi,
  discoverFalAi,
  discoverNewApiChannel,
  discoverOpenAiCompatible,
  isNeutralFailureReason,
  isNeutralOutcome,
  probeModel,
  type SourceCredential,
  type SupplyModality,
  type SupplyProtocol,
} from "@nebutra/router-supply";
import { decryptJSON, type EncryptedSecret, encryptJSON } from "@nebutra/vault";
import type { StaffCaller } from "../admin/service-token";
import {
  CLIPROXY_CHANNEL_NAME,
  CLIPROXY_INTERNAL_URL,
  NEW_API_INTERNAL_URL,
  newApiFindChannel,
  newApiLogin,
} from "./clients";
import { emitSupplyEvent } from "./events";

/**
 * Orchestration for the supply capability probing system (ADR 2026-09-30).
 *
 * This is the only file in `apps/router` that decides *how* a source is
 * discovered or probed — `@nebutra/router-supply` holds the pure adapters and
 * state machine, `@nebutra/repositories`' `RouterSupplyRepository` holds the
 * persistence, and this file wires the two together with the credentials and
 * scheduling triggers only the app knows about (env, the admin action gate,
 * the Inngest cron in `backends/gateway`).
 */

function repository(): RouterSupplyRepository {
  return new RouterSupplyRepository(getSystemDb());
}

/**
 * `RouterSupplyRepository.recordProbe` deliberately types its injected state
 * function against `state: string`, not `SupplyModelState` — the repository
 * package stays decoupled from `@nebutra/router-supply`'s types (only a
 * devDependency, for tests). This adapts the real, narrowly-typed
 * `applyOutcome` to that broader shape; the cast is safe because every value
 * the repository can read out of `supply_source_models.state` is one of the
 * four enum members `SupplyModelState` already covers.
 */
const applyOutcomeAdapter = (
  counters: {
    state: string;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    backoffSeconds: number;
  },
  outcome: "success" | "failure",
  reason: string | null,
  now: Date,
) => applyOutcome(counters as Parameters<typeof applyOutcome>[0], outcome, reason, now);

// ---------------------------------------------------------------- built-in sources

/**
 * The two sources Router already runs today, registered so they get the same
 * discovery/verification/state-machine treatment as anything added through
 * the admin "add source" flow — this is what turns the 2026-09-30 incident
 * (channel #2 advertising a model CLIProxyAPI could not serve) into something
 * the system catches by itself instead of a customer report.
 *
 * Their credentials stay env-held (`credentialRef: null`) — nothing about the
 * existing secret story changes for them; only a source added through the
 * admin flow uses the vault.
 */
export const CLIPROXY_SOURCE_KEY = "cliproxyapi";
export const NEWAPI_CHANNEL_SOURCE_KEY = "newapi-channel-cliproxyapi";

export async function ensureDefaultSources(): Promise<void> {
  const repo = repository();
  await repo.upsertSource({
    key: CLIPROXY_SOURCE_KEY,
    kind: "CLIPROXYAPI",
    protocol: "CLIPROXY_MANAGEMENT",
    label: "Account pool · CLIProxyAPI",
    baseUrl: CLIPROXY_INTERNAL_URL,
  });
  await repo.upsertSource({
    key: NEWAPI_CHANNEL_SOURCE_KEY,
    kind: "NEWAPI_CHANNEL",
    protocol: "NEWAPI_ADMIN",
    label: `New-API channel · ${CLIPROXY_CHANNEL_NAME}`,
    baseUrl: NEW_API_INTERNAL_URL,
  });
}

/**
 * Bootstrap (ADR 2026-09-30 "Event-driven execution" §4): on a fresh deploy or
 * first boot, a registry that has never been seeded no longer waits for the
 * next `03:00` discovery cron — this emits `supply/bootstrap`, naming every
 * built-in source that has never been discovered, and
 * `backends/gateway/src/inngest/functions/supplyBootstrap.ts` turns that into
 * one `supply/source.changed` per key ("bootstrap = source.changed for every
 * built-in source", the ADR's own words).
 *
 * Called from `apps/router/src/instrumentation.ts` (a lightweight Router
 * startup hook — not awaited there, so a slow or unreachable gateway never
 * delays Router's own boot) at most once per process via `bootstrapEmitted`:
 * the instrumentation hook itself runs once per process already, but this
 * guard keeps the function safe to call from more than one place without
 * double counting, and avoids a second DB round-trip on a process that
 * already knows it checked.
 */
let bootstrapEmitted = false;
export async function maybeEmitBootstrap(): Promise<void> {
  if (bootstrapEmitted) return;
  try {
    const repo = repository();
    const before = await repo.listSources();
    await ensureDefaultSources();
    const after = await repo.listSources();
    const unseeded = after.filter((s) => s.lastDiscoveredAt === null).map((s) => s.key);

    if (before.length === 0 || unseeded.length > 0) {
      bootstrapEmitted = true;
      await emitSupplyEvent("supply/bootstrap", {
        sourceKeys: unseeded.length > 0 ? unseeded : after.map((s) => s.key),
        triggeredAt: new Date().toISOString(),
      });
    } else {
      // Already seeded — no event needed, but don't check again this process.
      bootstrapEmitted = true;
    }
  } catch (error) {
    logger.error("[router-supply] bootstrap check failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

// ---------------------------------------------------------------- credentials

/**
 * A source's credential, decrypted just-in-time and never logged. Built-in
 * sources read env vars directly, unchanged from how `clients.ts` already
 * reads them. A source added through the admin flow carries its credential
 * (and any non-secret adapter config that rides along with it — a New-API
 * channel name, Fal's declared model ids) as one `encryptJSON` envelope in
 * `credentialRef`; nothing is ever written to the row in the clear.
 *
 * Exported for `./quota.ts` (ADR 2026-09-30 addendum) — the quota layer's
 * active usage pulls need the exact same credential resolution discovery and
 * verification already use; there is exactly one implementation.
 */
export async function credentialFor(source: SupplySourceRow): Promise<SourceCredential> {
  if (source.key === CLIPROXY_SOURCE_KEY) {
    return {
      baseUrl: source.baseUrl,
      ...(process.env.CLIPROXY_API_KEY ? { apiKey: process.env.CLIPROXY_API_KEY } : {}),
      ...(process.env.CLIPROXY_MANAGEMENT_KEY
        ? { managementKey: process.env.CLIPROXY_MANAGEMENT_KEY }
        : {}),
    };
  }
  if (source.key === NEWAPI_CHANNEL_SOURCE_KEY) {
    return {
      baseUrl: source.baseUrl,
      ...(process.env.NEW_API_ROOT_PASSWORD
        ? { rootPassword: process.env.NEW_API_ROOT_PASSWORD }
        : {}),
      // Discovery reads the channel through the admin session; a probe is a
      // real relay call, which New-API only accepts with a relay (sk-) token.
      // Without it every probe came back 401 and read as the models failing.
      ...(process.env.NEW_API_ACCESS_TOKEN ? { apiKey: process.env.NEW_API_ACCESS_TOKEN } : {}),
      channelName: CLIPROXY_CHANNEL_NAME,
    };
  }
  if (!source.credentialRef) return { baseUrl: source.baseUrl };
  try {
    const encrypted = JSON.parse(source.credentialRef) as EncryptedSecret;
    const config = await decryptJSON<Omit<SourceCredential, "baseUrl">>(encrypted);
    return { ...config, baseUrl: source.baseUrl };
  } catch (error) {
    logger.error("[router-supply] credential decrypt failed", {
      source: source.key,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { baseUrl: source.baseUrl };
  }
}

// ---------------------------------------------------------------- discovery dispatch

async function discoverSource(source: SupplySourceRow, fetchImpl: typeof fetch = fetch) {
  const credential = await credentialFor(source);
  switch (source.kind) {
    case "CLIPROXYAPI":
      return discoverCliProxyApi(credential, fetchImpl);
    case "NEWAPI_CHANNEL":
      return discoverNewApiChannel(
        credential,
        { login: (f) => newApiLogin(f), findChannel: (f, s, n) => newApiFindChannel(f, s, n) },
        fetchImpl,
      );
    case "FAL_AI":
      return discoverFalAi(credential, fetchImpl);
    default:
      // OPENAI_COMPATIBLE, and the fallback shape for any future kind.
      return discoverOpenAiCompatible(credential, fetchImpl);
  }
}

export interface DiscoveryRunResult extends Partial<DiscoveryDiff> {
  readonly source: string;
  readonly ok: boolean;
  readonly note: string;
}

/**
 * Discover exactly one source (by key) — the `discover(source) → diff`
 * primitive the "Event-driven execution" addendum asks for. Bounded: one or
 * two HTTP calls to that source's own enumeration endpoint
 * (`discoverSource`), never a loop over its models. This is the Router action
 * behind `source.discover`, which `supplySourceChanged`
 * (`backends/gateway/src/inngest/functions/supplySourceChanged.ts`) calls as
 * its own first step; it does **not** probe the models it finds — the caller
 * decides what to do with the diff (emit `supply/model.discovered` for the
 * fresh ones), which is what keeps this endpoint fast regardless of how many
 * models the source turns out to have.
 */
export async function discoverSourceByKey(
  sourceKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryRunResult> {
  await ensureDefaultSources();
  const repo = repository();
  const source = await repo.getSourceByKey(sourceKey);
  if (!source) return { source: sourceKey, ok: false, note: "unknown source" };

  const discovered = await discoverSource(source, fetchImpl);
  if (!discovered.ok) return { source: sourceKey, ok: false, note: discovered.note };

  const diff = await repo.applyDiscovery(source.id, discovered.models);
  return { source: sourceKey, ok: true, note: discovered.note, ...diff };
}

/**
 * The `discovery.run` admin action's new body (ADR 2026-09-30 "Event-driven
 * execution"): no discovery happens here any more. Enabled sources are a
 * small, DB-scale list (never "every model of every source"), so listing them
 * and emitting one `supply/source.changed` each is itself bounded and fast —
 * the actual discovery HTTP call per source happens later, inside
 * `supplySourceChanged`, as its own durable step. This is what makes the
 * daily discovery cron (`backends/gateway/src/inngest/functions/
 * supplyDiscovery.ts`) a backstop rather than the thing doing the work.
 */
export async function triggerDiscoveryForAllSources(): Promise<{ sources: string[] }> {
  await ensureDefaultSources();
  const repo = repository();
  const keys = (await repo.listSources()).filter((s) => s.enabled).map((s) => s.key);
  await Promise.allSettled(
    keys.map((sourceKey) =>
      emitSupplyEvent("supply/source.changed", { sourceKey, reason: "scheduled" }),
    ),
  );
  return { sources: keys };
}

// ---------------------------------------------------------------- verification

export interface ProbeRunResult {
  readonly source: string;
  readonly upstreamModel: string;
  readonly outcome: "success" | "failure" | "neutral";
  readonly reason?: string | null;
  readonly toState?: string;
  readonly transitioned?: boolean;
}

async function probeRows(
  rows: readonly SupplyCapabilityRow[],
  repo: RouterSupplyRepository,
  kind: "ACTIVE_PROBE",
  fetchImpl: typeof fetch,
): Promise<ProbeRunResult[]> {
  if (rows.length === 0) return [];
  const sourcesById = new Map((await repo.listSources()).map((s) => [s.id, s]));
  const results: ProbeRunResult[] = [];
  for (const row of rows) {
    const source = sourcesById.get(row.sourceId);
    if (!source) continue;
    const credential = await credentialFor(source);
    const result = await probeModel(
      {
        protocol: source.protocol as SupplyProtocol,
        baseUrl: source.baseUrl,
        ...(credential.apiKey ? { apiKey: credential.apiKey } : {}),
        upstreamModel: row.upstreamModel,
        modality: row.modality as SupplyModality,
        // Discovery's per-model metadata (e.g. `supported_endpoints`), threaded
        // through so the probe calls a Claude/GPT-shaped model over its real
        // endpoint shape instead of always assuming chat/completions.
        ...(isRecord(row.capabilities) ? { capabilities: row.capabilities } : {}),
      },
      fetchImpl,
    );

    if (isNeutralOutcome(result)) {
      results.push({ source: source.key, upstreamModel: row.upstreamModel, outcome: "neutral" });
      continue;
    }
    const outcome = result.outcome;
    const reason = result.outcome === "failure" ? result.reason : null;
    const transition = await repo.recordProbe(
      {
        sourceModelId: row.id,
        kind,
        outcome,
        reason,
        latencyMs: result.latencyMs,
      },
      applyOutcomeAdapter,
    );
    results.push({
      source: source.key,
      upstreamModel: row.upstreamModel,
      outcome,
      reason,
      toState: transition.toState,
      transitioned: transition.transitioned,
    });
  }
  return results;
}

/**
 * Probe exactly one model — the `probe(source, model)` primitive the
 * "Event-driven execution" addendum asks for. Bounded: exactly one upstream
 * HTTP call (`probeRows` over a one-element array). This is the Router action
 * behind `probe.one`, which `supplyModelFanout`
 * (`backends/gateway/src/inngest/functions/supplyModelFanout.ts`) calls once
 * per `step.run` — never from inside a loop over many models in one request,
 * which is what let an 86-model "probe now" blow through Cloudflare's 100s
 * window in the incident this ADR exists for.
 */
export async function probeOneModel(
  sourceKey: string,
  upstreamModel: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeRunResult> {
  const repo = repository();
  const row = await repo.findBySourceKeyAndUpstreamModel(sourceKey, upstreamModel);
  if (!row) {
    return { source: sourceKey, upstreamModel, outcome: "neutral", reason: "not_found" };
  }
  const [result] = await probeRows([row], repo, "ACTIVE_PROBE", fetchImpl);
  return result ?? { source: sourceKey, upstreamModel, outcome: "neutral", reason: "not_found" };
}

/**
 * Group due rows by source and emit one `supply/probe.requested` per source
 * (never per model — a source with 50 due models is one event, not 50), so
 * the idle/suspended backstops below do nothing but a bounded DB read plus a
 * handful of event emissions. `supplyModelFanout` does the actual probing,
 * one durable step per model, with no HTTP-request-duration ceiling.
 */
async function emitProbeRequestedGroupedBySource(
  rows: readonly SupplyCapabilityRow[],
): Promise<{ groups: number; models: number; runId: string }> {
  const bySource = new Map<string, string[]>();
  for (const row of rows) {
    const list = bySource.get(row.sourceKey) ?? [];
    list.push(row.upstreamModel);
    bySource.set(row.sourceKey, list);
  }
  const runId = randomUUID();
  await Promise.allSettled(
    [...bySource.entries()].map(([sourceKey, upstreamModels]) =>
      emitSupplyEvent("supply/probe.requested", { sourceKey, upstreamModels, runId }),
    ),
  );
  return { groups: bySource.size, models: rows.length, runId };
}

/**
 * Idle verification backstop: AVAILABLE/DEGRADED models nobody has probed in
 * 24h. Lists the due rows (one bounded, capped DB read) and hands them to
 * `supplyModelFanout` via events instead of probing inline — this used to
 * call `probeRows` on up to `limit` rows synchronously, which is exactly the
 * unbounded-work-in-one-request shape the "Event-driven execution" addendum
 * removes.
 */
export async function runActiveProbes(
  limit = 50,
): Promise<{ groups: number; models: number; runId: string }> {
  const repo = repository();
  const due = await repo.listDueForActiveProbe(new Date(), 24 * 60 * 60 * 1000, limit);
  return emitProbeRequestedGroupedBySource(due);
}

/**
 * Suspended-model retry backstop: backoff-gated, retried forever, never
 * abandoned. Same shape as {@link runActiveProbes} — list, group, emit; no
 * upstream HTTP call happens inside this function any more.
 */
export async function runSuspendedRetry(
  limit = 100,
): Promise<{ groups: number; models: number; runId: string }> {
  const repo = repository();
  const due = await repo.listSuspendedDueForRetry(new Date(), limit);
  return emitProbeRequestedGroupedBySource(due);
}

/**
 * Free health data from the real relay path. `sourceKey` is the best guess at
 * which source actually served the call — the New-API response's
 * `x-oneapi-channel` / `x-newapi-channel` header when present, else the engine
 * id the edge already tracks. An unresolvable pairing is a silent no-op, not
 * an error: passive data is a bonus signal on top of active probing, never a
 * requirement for it.
 */
export async function recordPassiveSignal(input: {
  readonly sourceKey: string;
  readonly upstreamModel: string;
  readonly ok: boolean;
  readonly reason?: string | null;
}): Promise<void> {
  try {
    if (!input.ok && isNeutralFailureReason(input.reason)) {
      // Neutral (e.g. rate_limited) never counts toward the state machine's
      // failure hysteresis, but it is still worth a debounced, targeted
      // re-probe once the burst settles — `supplyModelSignal`'s job, not this
      // function's (ADR 2026-09-30 "Event-driven execution").
      if (input.reason === "rate_limited") {
        void emitSupplyEvent("supply/model.signal", {
          sourceKey: input.sourceKey,
          upstreamModel: input.upstreamModel,
          kind: "rate_limited",
          reason: input.reason,
        });
      }
      return;
    }
    const repo = repository();
    const row = await repo.findBySourceKeyAndUpstreamModel(input.sourceKey, input.upstreamModel);
    if (!row) return;
    const transition = await repo.recordProbe(
      {
        sourceModelId: row.id,
        kind: "PASSIVE_SIGNAL",
        outcome: input.ok ? "success" : "failure",
        reason: input.reason ?? null,
      },
      applyOutcomeAdapter,
    );
    // A real escalation (not just "still available") is worth a targeted
    // re-probe sooner than the next idle/suspended backstop sweep — debounced
    // on the gateway side so a burst of failing requests fires this once, not
    // once per request.
    if (!input.ok && (transition.toState === "DEGRADED" || transition.toState === "SUSPENDED")) {
      void emitSupplyEvent("supply/model.signal", {
        sourceKey: input.sourceKey,
        upstreamModel: input.upstreamModel,
        kind: "error_spike",
        ...(input.reason ? { reason: input.reason } : {}),
      });
    }
  } catch (error) {
    // Best-effort: the customer already has their response. Losing one health
    // signal must never surface as a request failure.
    logger.error("[router-supply] passive signal recording failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

// ---------------------------------------------------------------- shelf / relay gate

/** Public-model availability, for the shelf gate and the relay-path gate alike. */
export async function availabilityFor(
  publicModels: readonly string[],
): Promise<Map<string, ModelAvailability>> {
  return repository().availabilityFor(publicModels);
}

// ---------------------------------------------------------------- admin surface

export async function listSourcesForAdmin(): Promise<Array<Record<string, unknown>>> {
  await ensureDefaultSources();
  return (await repository().listSources()).map((s) => ({
    id: s.id,
    key: s.key,
    kind: s.kind,
    protocol: s.protocol,
    label: s.label,
    baseUrl: s.baseUrl,
    enabled: s.enabled,
    visibility: s.visibility,
    lastDiscoveredAt: s.lastDiscoveredAt?.toISOString() ?? null,
    lastDiscoverySummary: s.lastDiscoverySummary,
  }));
}

export async function listCapabilitiesForAdmin(filter?: {
  sourceKey?: string;
  state?: string;
}): Promise<Array<Record<string, unknown>>> {
  const repo = repository();
  let sourceId: string | undefined;
  if (filter?.sourceKey) {
    const source = await repo.getSourceByKey(filter.sourceKey);
    sourceId = source?.id;
    if (!sourceId) return [];
  }
  const rows = await repo.listCapabilities({
    ...(sourceId ? { sourceId } : {}),
    ...(filter?.state ? { state: filter.state } : {}),
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.sourceKey,
    upstreamModel: r.upstreamModel,
    publicModel: r.publicModel,
    modality: r.modality,
    state: r.state,
    stateReason: r.stateReason,
    pinned: r.pinned,
    banned: r.banned,
    lastProbeAt: r.lastProbeAt?.toISOString() ?? null,
    lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
    lastFailureAt: r.lastFailureAt?.toISOString() ?? null,
    nextProbeAt: r.nextProbeAt?.toISOString() ?? null,
    vanishedAt: r.vanishedAt?.toISOString() ?? null,
  }));
}

export interface AddSourceInput {
  readonly key: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly kind: "OPENAI_COMPATIBLE" | "FAL_AI" | "NEWAPI_CHANNEL" | "CLIPROXYAPI";
  readonly apiKey?: string;
  readonly managementKey?: string;
  readonly rootPassword?: string;
  readonly channelName?: string;
  readonly knownModelIds?: readonly string[];
  /**
   * `PUBLIC` (default): sellable on the shelf, reachable by the customer
   * relay — unchanged from every source added before this field existed.
   * `INTERNAL`: for Nebutra's own team use only (a plan whose terms forbid
   * resale or third-party benefit) — never counted toward public shelf
   * availability, never used for the customer relay path; only the internal
   * service-token relay routes to it (`resolveInternalRoute`).
   */
  readonly visibility?: "PUBLIC" | "INTERNAL";
}

/**
 * Admin "add source": auto-detect the protocol, encrypt whatever credential
 * material was given, persist the source, and run one bounded discovery call
 * so the response can say how many models it found. Any model that is new or
 * reappeared is handed to `supply/model.discovered` — probed by
 * `supplyModelFanout` as its own durable step, not inline here — and a
 * `supply/source.changed` event is emitted regardless, so this source gets
 * the same event-driven treatment as the built-ins from now on (credential
 * rotation, re-enabling, …). This is "source added → full probe now" from the
 * ADR's event-driven execution section, minus the part that used to probe
 * every fresh model synchronously inside this one HTTP request — for an
 * 86-model source that was the shape that caused the 2026-09-30 incident.
 *
 * GAP: for `kind: "NEWAPI_CHANNEL"` this registers *tracking* of an existing
 * channel's advertised model list — it does not create the channel in New-API
 * itself. New-API channel creation already has a real implementation
 * (`applyChannelSync` in `domain.ts`, driven by `channel.sync`); wiring this
 * flow to call that one instead of asking the operator to create the channel
 * by hand first is future work, stated here rather than faked.
 */
export async function addSource(
  input: AddSourceInput,
  caller: StaffCaller,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  auditId: string;
  summary: string;
  sourceKey: string;
  discovered: number;
  runId: string;
}> {
  const secretMaterial: Omit<SourceCredential, "baseUrl"> = {
    ...(input.apiKey ? { apiKey: input.apiKey } : {}),
    ...(input.managementKey ? { managementKey: input.managementKey } : {}),
    ...(input.rootPassword ? { rootPassword: input.rootPassword } : {}),
    ...(input.channelName ? { channelName: input.channelName } : {}),
    ...(input.knownModelIds ? { knownModelIds: input.knownModelIds } : {}),
  };
  const credential: SourceCredential = { baseUrl: input.baseUrl, ...secretMaterial };
  const detected = await detectProtocol(credential, fetchImpl);

  const hasSecret = Object.keys(secretMaterial).length > 0;
  const credentialRef = hasSecret
    ? JSON.stringify(
        await encryptJSON(secretMaterial, { context: { kind: `supply-source:${input.kind}` } }),
      )
    : null;

  const repo = repository();
  const source = await repo.upsertSource({
    key: input.key,
    kind: input.kind,
    protocol: detected.protocol,
    label: input.label,
    baseUrl: input.baseUrl,
    credentialRef,
    enabled: true,
    visibility: input.visibility ?? "PUBLIC",
  });

  const discovery = await discoverSource(source, fetchImpl);
  let discovered = 0;
  const runId = randomUUID();
  if (discovery.ok) {
    const diff = await repo.applyDiscovery(source.id, discovery.models);
    discovered = diff.added.length + diff.reappeared.length + diff.unchanged.length;
    const fresh = [...diff.added, ...diff.reappeared];
    if (fresh.length > 0) {
      await emitSupplyEvent("supply/model.discovered", {
        sourceKey: source.key,
        upstreamModels: fresh,
      });
    }
  }
  // Event-driven from here on: a credential rotation or re-enable for this
  // same source later goes through the identical path, not a special case.
  await emitSupplyEvent("supply/source.changed", { sourceKey: source.key, reason: "added" });

  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.source.add",
    outcome: "success",
    resource: { type: "supply-source", id: source.key },
    metadata: {
      auditId,
      runId,
      role: caller.role,
      kind: input.kind,
      visibility: source.visibility,
      protocolDetected: detected.protocol,
      protocolMatched: detected.matched,
      discovered,
    },
  });

  return {
    auditId,
    runId,
    summary: discovery.ok
      ? `Added ${source.label} (${detected.protocol}); discovered ${discovered} model(s), queued for probing.`
      : `Added ${source.label} (${detected.protocol}), but discovery failed: ${discovery.note}`,
    sourceKey: source.key,
    discovered,
  };
}

/**
 * Admin "probe now" (ADR 2026-09-30 "Event-driven execution"): queues a full
 * discovery + probe run for one source and returns immediately — it no
 * longer does the work itself. An operator used to wait on this request while
 * it discovered the source and then probed every one of its models
 * sequentially inside the same HTTP call; for an 86-model source that totaled
 * over 100s and hit a Cloudflare 524 (the incident this ADR exists for). Now
 * it emits one `supply/probe.requested` event (no `upstreamModels` —
 * `supplyModelFanout` discovers first, then fans out over every current
 * model as its own durable step) and returns `status: "queued"` with a
 * `runId` the caller can correlate against `SupplyProbeEvent` rows landing
 * afterward (`probeRunStatus`) — there is no Inngest "function run id" to
 * hand back here (`.send()` only returns event ids), so `runId` is Router's
 * own correlation id, threaded through the event payload.
 */
export async function probeSourceNow(
  sourceKey: string,
  caller: StaffCaller,
  request: Request,
): Promise<{
  auditId: string;
  runId: string;
  status: "queued" | "failed";
  summary: string;
}> {
  const runId = randomUUID();
  const emitted = await emitSupplyEvent("supply/probe.requested", { sourceKey, runId });

  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.source.probe",
    outcome: emitted.ok ? "success" : "failure",
    resource: { type: "supply-source", id: sourceKey },
    metadata: { auditId, runId, role: caller.role, queued: emitted.ok },
  });

  return {
    auditId,
    runId,
    status: emitted.ok ? "queued" : "failed",
    summary: emitted.ok
      ? `Queued a full discovery + probe run for ${sourceKey} (run ${runId}).`
      : `Failed to queue a probe run for ${sourceKey} — the event could not be sent.`,
  };
}

/**
 * Admin visibility for a queued "probe now" (§5's "run status" ask): how many
 * of a source's currently-known, non-vanished models have been probed since
 * `since` (normally the `probe.now` call's own timestamp). No new schema —
 * this reads the same `SupplySourceModel.lastProbeAt` the `capability` admin
 * resource already shows, just summarized as a run. `"queued"` (nothing
 * probed yet), `"running"` (some but not all), `"done"` (every current model
 * has a fresher probe) — `"done"` with zero models is still `"done"`, not a
 * stuck run.
 */
export async function probeRunStatus(
  sourceKey: string,
  since: Date,
): Promise<{
  source: string;
  total: number;
  probedSinceRequest: number;
  status: "queued" | "running" | "done";
}> {
  const repo = repository();
  const source = await repo.getSourceByKey(sourceKey);
  if (!source) return { source: sourceKey, total: 0, probedSinceRequest: 0, status: "done" };

  const rows = (await repo.listCapabilities({ sourceId: source.id })).filter(
    (r) => r.vanishedAt === null,
  );
  const probedSinceRequest = rows.filter(
    (r) => r.lastProbeAt !== null && r.lastProbeAt.getTime() >= since.getTime(),
  ).length;

  const status =
    rows.length === 0 || probedSinceRequest >= rows.length
      ? "done"
      : probedSinceRequest > 0
        ? "running"
        : "queued";

  return { source: sourceKey, total: rows.length, probedSinceRequest, status };
}

/** Signal: public models with a real backing source that is currently suspended. */
export async function suspendedPublicModels(): Promise<
  Array<{ publicModel: string; reason: string | null }>
> {
  const repo = repository();
  const rows = await repo.listCapabilities({ state: "SUSPENDED" });
  const seen = new Map<string, string | null>();
  for (const row of rows) {
    if (row.publicModel && row.vanishedAt === null && !seen.has(row.publicModel)) {
      seen.set(row.publicModel, row.stateReason);
    }
  }
  return [...seen.entries()].map(([publicModel, reason]) => ({ publicModel, reason }));
}

// ---------------------------------------------------------------- internal service-token relay

/** Endpoint hints that mean "this model answers the OpenAI chat/completions shape". */
const CHAT_COMPLETIONS_HINTS = ["chat/completions", "/completions"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a model's discovered `supported_endpoints` (if any) covers an
 * OpenAI-compatible chat/completions call.
 *
 * Stated choice, not faked: a model whose discovery reports
 * `supported_endpoints` as only `['/messages']` (Anthropic's Messages format)
 * is **not translated** to OpenAI chat/completions here — that is a real
 * request/response reshape (system prompt placement, content blocks, stop
 * reasons) that deserves its own reviewed implementation, not one folded into
 * this routing decision. It is instead marked unsupported *for this
 * OpenAI-compatible path only*, and the caller falls back to the existing
 * New-API relay. A model with no `supported_endpoints` metadata at all is
 * assumed compatible — it was discovered via the OpenAI-compatible `/v1/models`
 * adapter, which is the shape this path already speaks.
 */
export function supportsInternalChatCompletions(capabilities: unknown): boolean {
  if (!isRecord(capabilities)) return true;
  const endpoints = capabilities.supported_endpoints;
  if (!Array.isArray(endpoints) || endpoints.length === 0) return true;
  return endpoints.some(
    (e) => typeof e === "string" && CHAT_COMPLETIONS_HINTS.some((hint) => e.includes(hint)),
  );
}

export interface InternalRoute {
  readonly sourceKey: string;
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly upstreamModel: string;
  /** False for a model whose discovery says it only answers `/messages` (Anthropic format) — see {@link supportsInternalChatCompletions}. */
  readonly supported: boolean;
}

/**
 * The internal service-token relay's (`/api/internal/v1/chat/completions`)
 * routing decision: an `INTERNAL`-visibility source currently AVAILABLE (or
 * DEGRADED) for `model`, or `null` when none exists — the caller falls back to
 * the existing New-API relay in either case (no source, or `supported: false`).
 *
 * This never reads a `PUBLIC` source's rows (`findInternalRoute` only queries
 * `INTERNAL`-visibility ones) and is never consulted by the shelf or the
 * customer relay — both of those call `availabilityFor`, which is the mirror
 * restriction (`PUBLIC` only).
 */
export async function resolveInternalRoute(model: string): Promise<InternalRoute | null> {
  const found = await repository().findInternalRoute(model);
  if (!found) return null;
  const credential = await credentialFor(found.source);
  return {
    sourceKey: found.source.key,
    baseUrl: found.source.baseUrl,
    ...(credential.apiKey ? { apiKey: credential.apiKey } : {}),
    upstreamModel: found.upstreamModel,
    supported: supportsInternalChatCompletions(found.capabilities),
  };
}
