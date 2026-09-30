/**
 * Discovery layer (ADR 2026-09-30 supply capability probing).
 *
 * One adapter interface, one function per protocol shape. Every adapter
 * answers the same question — "what models does this source say it has, and
 * with what parameters?" — from a base URL and a credential, over plain
 * `fetch`. None of this touches Prisma or the vault: the repository seam
 * (`RouterSupplyRepository`) calls these, persists the result, and diffs it
 * against the last snapshot.
 *
 * Adapters shipped: OpenAI-compatible `/v1/models`, New-API channel (via its
 * admin session — the same one `apps/router/src/lib/supply/clients.ts`
 * already uses for the channel-sync action), CLIProxyAPI (OpenAI-compatible
 * `/v1/models`, plus its management auth-file listing when a management key is
 * given, which is what lets a probe explain *why* a model is unavailable
 * before it even calls it), and Fal.ai (best-effort — see the adapter's own
 * doc comment for the gap).
 */

export type SupplyProtocol =
  | "OPENAI_COMPATIBLE"
  | "NEWAPI_ADMIN"
  | "CLIPROXY_MANAGEMENT"
  | "FAL_REST"
  | "UNKNOWN";

export type SupplyModality = "TEXT" | "IMAGE" | "EMBEDDING" | "AUDIO" | "VIDEO" | "OTHER";

export interface DiscoveredModel {
  readonly id: string;
  readonly modality: SupplyModality;
  /** Provider-declared parameters, shape varies by adapter. */
  readonly capabilities?: Record<string, unknown>;
  readonly upstreamPrice?: Record<string, unknown> | null;
}

export interface DiscoveryResult {
  readonly ok: boolean;
  readonly protocol: SupplyProtocol;
  readonly models: readonly DiscoveredModel[];
  readonly note: string;
}

export interface SourceCredential {
  readonly baseUrl: string;
  /** Bearer key for the OpenAI-compatible / CLIProxyAPI relay surface. */
  readonly apiKey?: string;
  /** CLIProxyAPI's `/v0/management/*` bearer key. */
  readonly managementKey?: string;
  /** New-API's root account password (session login, see clients.ts). */
  readonly rootPassword?: string;
  /** New-API channel name to read the advertised model list from. */
  readonly channelName?: string;
  /**
   * Fal.ai has no documented model-enumeration endpoint (§ gap below) — the
   * operator supplies the model ids it wants tracked when adding the source.
   */
  readonly knownModelIds?: readonly string[];
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Guess a modality from an id — a fallback for adapters that report none. */
export function guessModality(id: string): SupplyModality {
  const lower = id.toLowerCase();
  if (/(^|[-_/])(image|dall-e|sd|sunburst|flare|flux)/.test(lower)) return "IMAGE";
  if (/embed/.test(lower)) return "EMBEDDING";
  if (/(tts|speech|whisper|voice)/.test(lower)) return "AUDIO";
  if (/(video|sora|wan)/.test(lower)) return "VIDEO";
  return "TEXT";
}

async function fetchJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; body: T | null }> {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const body = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, body };
}

// ---------------------------------------------------------------- OpenAI-compatible

interface OpenAiModelsResponse {
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
    context_length?: number;
    supported_endpoints?: unknown;
    name?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Provider-declared per-model metadata worth keeping, when the upstream's
 * `/v1/models` row carries it — Command Code's `/v1/models` (a source onboarded
 * as `INTERNAL`, see ADR follow-up) returns exactly this shape:
 * `context_length`, `supported_endpoints` (e.g. `['/chat/completions']` or, for
 * an Anthropic-only model, `['/messages']`), `name`. `undefined` when the row
 * carries none of these — most OpenAI-compatible upstreams only return `id`.
 */
function modelCapabilities(m: Record<string, unknown>): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  if (typeof m.context_length === "number") out.context_length = m.context_length;
  if (Array.isArray(m.supported_endpoints)) {
    const endpoints = m.supported_endpoints.filter(
      (e): e is string => typeof e === "string" && e.length > 0,
    );
    if (endpoints.length > 0) out.supported_endpoints = endpoints;
  }
  if (typeof m.name === "string" && m.name.length > 0) out.name = m.name;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * `GET {baseUrl}/v1/models` — the one shape every relay/中转站, CLIProxyAPI and
 * New-API's own customer-facing surface all speak. This is also the adapter
 * `detectProtocol` tries first, because it is the cheapest, most common shape.
 *
 * `baseUrl` may itself carry a path before its `/v1` (e.g.
 * `https://api.commandcode.ai/provider/v1`) — the `endsWith("/v1")` check
 * below only cares about the suffix, so a base that already ends in `/v1`
 * never gets a second one appended regardless of what precedes it.
 */
export async function discoverOpenAiCompatible(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryResult> {
  const base = stripTrailingSlash(input.baseUrl);
  const url = base.endsWith("/v1") ? `${base}/models` : `${base}/v1/models`;
  try {
    const { ok, status, body } = await fetchJson<OpenAiModelsResponse>(fetchImpl, url, {
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });
    if (!ok || !body) {
      return { ok: false, protocol: "OPENAI_COMPATIBLE", models: [], note: `HTTP ${status}` };
    }
    const rows = body.data ?? [];
    const models: DiscoveredModel[] = rows
      .filter((m): m is { id: string } => typeof m.id === "string" && m.id.length > 0)
      .map((m) => {
        const capabilities = modelCapabilities(m);
        return {
          id: m.id,
          modality: guessModality(m.id),
          ...(capabilities ? { capabilities } : {}),
        };
      });
    return {
      ok: true,
      protocol: "OPENAI_COMPATIBLE",
      models,
      note: `${models.length} model(s) via /v1/models`,
    };
  } catch (error) {
    return {
      ok: false,
      protocol: "OPENAI_COMPATIBLE",
      models: [],
      note: error instanceof Error ? error.message : "fetch failed",
    };
  }
}

// ---------------------------------------------------------------- CLIProxyAPI

interface CliProxyAuthFile {
  provider?: string;
  status?: string;
  disabled?: boolean;
  unavailable?: boolean;
}

/**
 * CLIProxyAPI is OpenAI-compatible on `/v1/models` for the models it currently
 * serves. When a management key is also given, this additionally reads
 * `/v0/management/auth-files` (the account pool) and annotates every model
 * whose provider has zero healthy accounts — the same signal that, read at
 * probe time instead of discovery time, is exactly the 2026-09-30 incident:
 * a channel advertised `gpt-image-2.5` while every codex account in the pool
 * was unusable.
 */
export async function discoverCliProxyApi(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryResult> {
  const listed = await discoverOpenAiCompatible(input, fetchImpl);
  if (!listed.ok) return { ...listed, protocol: "CLIPROXY_MANAGEMENT" };

  if (!input.managementKey) {
    return { ...listed, protocol: "CLIPROXY_MANAGEMENT" };
  }

  const base = stripTrailingSlash(input.baseUrl);
  try {
    const { ok, body } = await fetchJson<{ files?: CliProxyAuthFile[] } | CliProxyAuthFile[]>(
      fetchImpl,
      `${base}/v0/management/auth-files`,
      { headers: { Authorization: `Bearer ${input.managementKey}` } },
    );
    if (!ok || !body) return { ...listed, protocol: "CLIPROXY_MANAGEMENT" };
    const files = Array.isArray(body) ? body : (body.files ?? []);
    const healthyProviders = new Set(
      files
        .filter(
          (f) => !f.disabled && !f.unavailable && (f.status ?? "ok").toLowerCase() !== "error",
        )
        .map((f) => (f.provider ?? "").toLowerCase())
        .filter(Boolean),
    );
    const models = listed.models.map((m) => {
      const provider = providerForModel(m.id);
      if (!provider || healthyProviders.size === 0 || healthyProviders.has(provider)) return m;
      return {
        ...m,
        capabilities: { ...m.capabilities, authProvider: provider, authAvailable: false },
      };
    });
    return {
      ok: true,
      protocol: "CLIPROXY_MANAGEMENT",
      models,
      note: `${models.length} model(s) via /v1/models, ${healthyProviders.size} healthy auth provider(s)`,
    };
  } catch {
    // Management listing is enrichment, not the source of truth — a failure
    // here still leaves the served-model list from /v1/models intact.
    return { ...listed, protocol: "CLIPROXY_MANAGEMENT" };
  }
}

/** Best-effort model id → CLIProxyAPI auth provider, from observed naming. */
function providerForModel(id: string): string | null {
  const lower = id.toLowerCase();
  if (lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3")) return "codex";
  if (lower.startsWith("claude-")) return "anthropic";
  if (lower.startsWith("gemini-")) return "antigravity";
  return null;
}

// ---------------------------------------------------------------- New-API channel

export interface NewApiSessionClient {
  login(fetchImpl: typeof fetch): Promise<{ cookie: string; userId: string }>;
  findChannel(
    fetchImpl: typeof fetch,
    session: { cookie: string; userId: string },
    name: string,
  ): Promise<{ id: number; models?: string } | null>;
}

/**
 * A New-API channel's *advertised* model list — the `models` CSV an admin (or
 * `channel.sync`) wrote onto it, not what the channel can actually serve. This
 * is deliberately the same data `computeChannelDiff` in
 * `apps/router/src/lib/supply/domain.ts` already reads; the session/admin
 * plumbing lives there (`newApiLogin` / `newApiFindChannel`) because it needs
 * `NEW_API_ROOT_PASSWORD`, a Router-held secret this DB-free package never
 * touches. The caller injects it as `session`.
 */
export async function discoverNewApiChannel(
  input: SourceCredential,
  session: NewApiSessionClient,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryResult> {
  if (!input.channelName) {
    return { ok: false, protocol: "NEWAPI_ADMIN", models: [], note: "no channelName configured" };
  }
  try {
    const auth = await session.login(fetchImpl);
    const channel = await session.findChannel(fetchImpl, auth, input.channelName);
    if (!channel) {
      return {
        ok: false,
        protocol: "NEWAPI_ADMIN",
        models: [],
        note: `channel ${input.channelName} not found`,
      };
    }
    const ids = (channel.models ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const models: DiscoveredModel[] = ids.map((id) => ({ id, modality: guessModality(id) }));
    return {
      ok: true,
      protocol: "NEWAPI_ADMIN",
      models,
      note: `${models.length} model(s) advertised by channel ${input.channelName}`,
    };
  } catch (error) {
    return {
      ok: false,
      protocol: "NEWAPI_ADMIN",
      models: [],
      note: error instanceof Error ? error.message : "New-API session failed",
    };
  }
}

// ---------------------------------------------------------------- Fal.ai

/**
 * GAP (honest, not faked): Fal.ai does not publish a single `/v1/models`-style
 * enumeration endpoint as of this writing — each model is its own queue
 * endpoint (`https://fal.run/<owner>/<model>`), documented per-model rather
 * than through one registry call. There is no verified way to *discover* the
 * full catalogue automatically.
 *
 * What this adapter does instead: it takes the model ids the operator already
 * knows about (`knownModelIds`, entered once when the source is added) and
 * turns each into a `DiscoveredModel`, so the rest of the pipeline — probing,
 * state machine, shelf gating — works identically to a source with real
 * enumeration. Discovery still *diffs* run to run (a ChinaPay-style vanished
 * id still gets `vanishedAt`), it just cannot notice a model Fal added that
 * the operator never typed in. Revisit if Fal ships a registry endpoint.
 */
export async function discoverFalAi(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveryResult> {
  const ids = input.knownModelIds ?? [];
  if (ids.length === 0) {
    return {
      ok: false,
      protocol: "FAL_REST",
      models: [],
      note: "Fal.ai has no model-enumeration API (gap, see doc comment) — pass knownModelIds",
    };
  }
  // A cheap reachability check only — not enumeration. `fal.run` model queue
  // endpoints all accept GET on the base for a health-ish response; used here
  // only to mark the source unreachable rather than to enumerate.
  try {
    const base = stripTrailingSlash(input.baseUrl || "https://fal.run");
    await fetchImpl(base, {
      headers: input.apiKey ? { Authorization: `Key ${input.apiKey}` } : {},
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  } catch {
    /* reachability is advisory only */
  }
  const models: DiscoveredModel[] = ids.map((id) => ({ id, modality: guessModality(id) }));
  return {
    ok: true,
    protocol: "FAL_REST",
    models,
    note: `${models.length} operator-declared model(s) (Fal has no enumeration API)`,
  };
}

// ---------------------------------------------------------------- protocol detection

export interface ProtocolProbeResult {
  readonly protocol: SupplyProtocol;
  readonly matched: boolean;
  readonly detail: string;
}

/**
 * Auto-detect the protocol behind an arbitrary base URL + key, for the admin
 * "add source" flow. Tries the cheapest, most common shape first. Returns the
 * first protocol whose signature call succeeds; `UNKNOWN` when none do (the
 * source can still be added, disabled, for a human to diagnose).
 */
export async function detectProtocol(
  input: SourceCredential,
  fetchImpl: typeof fetch = fetch,
): Promise<ProtocolProbeResult> {
  const openai = await discoverOpenAiCompatible(input, fetchImpl);
  if (openai.ok) {
    return { protocol: "OPENAI_COMPATIBLE", matched: true, detail: openai.note };
  }

  if (input.managementKey) {
    try {
      const base = stripTrailingSlash(input.baseUrl);
      const { ok } = await fetchJson(
        fetchImpl,
        `${base}/v0/management/auth-files`,
        { headers: { Authorization: `Bearer ${input.managementKey}` } },
        5_000,
      );
      if (ok)
        return { protocol: "CLIPROXY_MANAGEMENT", matched: true, detail: "auth-files reachable" };
    } catch {
      /* fall through */
    }
  }

  if (input.rootPassword) {
    try {
      const base = stripTrailingSlash(input.baseUrl);
      const res = await fetchImpl(`${base}/api/user/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "root", password: input.rootPassword }),
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok || res.status === 401) {
        // A 401 still proves the *shape* is New-API's login endpoint; the
        // credential itself may be wrong, which is a config error, not a
        // protocol-detection failure.
        return {
          protocol: "NEWAPI_ADMIN",
          matched: res.ok,
          detail: res.ok ? "login succeeded" : "login endpoint present, credential rejected",
        };
      }
    } catch {
      /* fall through */
    }
  }

  return { protocol: "UNKNOWN", matched: false, detail: "no known protocol signature matched" };
}
