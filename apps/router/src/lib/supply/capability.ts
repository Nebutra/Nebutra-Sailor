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

/** Run discovery for one source (by key) or every enabled source. */
export async function runDiscovery(
  sourceKey?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryRunResult[]> {
  await ensureDefaultSources();
  const repo = repository();
  const all = await repo.listSources();
  const targets = sourceKey ? all.filter((s) => s.key === sourceKey) : all.filter((s) => s.enabled);

  const results: DiscoveryRunResult[] = [];
  for (const source of targets) {
    const discovered = await discoverSource(source, fetchImpl);
    if (!discovered.ok) {
      results.push({ source: source.key, ok: false, note: discovered.note });
      continue;
    }
    const diff = await repo.applyDiscovery(source.id, discovered.models);
    results.push({ source: source.key, ok: true, note: discovered.note, ...diff });
    // Event-driven verification: a model that just appeared (or came back) is
    // probed now, not at the next daily sweep, so the shelf reflects it within
    // the same run.
    const fresh = new Set([...(diff.added ?? []), ...(diff.reappeared ?? [])]);
    if (fresh.size > 0) {
      const rows = (await repo.listCapabilities({ sourceId: source.id })).filter((r) =>
        fresh.has(r.upstreamModel),
      );
      await probeRows(rows, repo, "ACTIVE_PROBE", fetchImpl);
    }
  }
  return results;
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

/** Idle verification: AVAILABLE/DEGRADED models nobody has probed in 24h. */
export async function runActiveProbes(
  limit = 50,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeRunResult[]> {
  const repo = repository();
  const due = await repo.listDueForActiveProbe(new Date(), 24 * 60 * 60 * 1000, limit);
  return probeRows(due, repo, "ACTIVE_PROBE", fetchImpl);
}

/** Suspended-model retry: backoff-gated, retried forever, never abandoned. */
export async function runSuspendedRetry(
  limit = 100,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeRunResult[]> {
  const repo = repository();
  const due = await repo.listSuspendedDueForRetry(new Date(), limit);
  return probeRows(due, repo, "ACTIVE_PROBE", fetchImpl);
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
    if (!input.ok && isNeutralFailureReason(input.reason)) return;
    const repo = repository();
    const row = await repo.findBySourceKeyAndUpstreamModel(input.sourceKey, input.upstreamModel);
    if (!row) return;
    await repo.recordProbe(
      {
        sourceModelId: row.id,
        kind: "PASSIVE_SIGNAL",
        outcome: input.ok ? "success" : "failure",
        reason: input.reason ?? null,
      },
      applyOutcomeAdapter,
    );
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
 * material was given, persist the source, then probe it immediately —
 * "source added → full probe now" from the ADR's event-driven scheduling
 * section, done synchronously because an operator is waiting on the result
 * rather than round-tripping through the Inngest cron for something this cheap.
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
): Promise<{ auditId: string; summary: string; sourceKey: string; discovered: number }> {
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
  if (discovery.ok) {
    const diff = await repo.applyDiscovery(source.id, discovery.models);
    discovered = diff.added.length + diff.reappeared.length + diff.unchanged.length;
  }

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
    summary: discovery.ok
      ? `Added ${source.label} (${detected.protocol}); discovered ${discovered} model(s).`
      : `Added ${source.label} (${detected.protocol}), but discovery failed: ${discovery.note}`,
    sourceKey: source.key,
    discovered,
  };
}

/** Admin "probe now": full discovery + active probe for one source, synchronously. */
export async function probeSourceNow(
  sourceKey: string,
  caller: StaffCaller,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  auditId: string;
  summary: string;
  discovery: DiscoveryRunResult[];
  probes: ProbeRunResult[];
}> {
  const discovery = await runDiscovery(sourceKey, fetchImpl);
  const repo = repository();
  const source = await repo.getSourceByKey(sourceKey);
  const rows = source ? await repo.listCapabilities({ sourceId: source.id }) : [];
  const probes = await probeRows(rows, repo, "ACTIVE_PROBE", fetchImpl);

  const auditId = randomUUID();
  await auditLogger(request, {
    actor: { id: caller.userId, type: "user" },
    tenantId: "platform",
  }).log({
    action: "supply.source.probe",
    outcome: "success",
    resource: { type: "supply-source", id: sourceKey },
    metadata: { auditId, role: caller.role, probed: probes.length },
  });

  return {
    auditId,
    summary: `Probed ${probes.length} model(s) for ${sourceKey}.`,
    discovery,
    probes,
  };
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
