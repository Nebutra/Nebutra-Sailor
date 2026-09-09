import { openaiCompatibleUrl, proxyChatCompletions } from "@nebutra/router-supply";

export class RouterSupplyUnavailableError extends Error {
  constructor(message = "router_unconfigured") {
    super(message);
    this.name = "RouterSupplyUnavailableError";
  }
}

export function newApiBaseUrl(): string {
  return (process.env.NEW_API_BASE_URL || process.env.NEBUTRA_NEW_API_URL || "").replace(/\/$/, "");
}

export function isRouterSupplyConfigured(): boolean {
  return Boolean(newApiBaseUrl());
}

export function requireRouterSupply(): void {
  if (!isRouterSupplyConfigured()) {
    throw new RouterSupplyUnavailableError();
  }
}

/** Who a validated Nebutra key belongs to. */
export interface EdgeIdentity {
  readonly keyId: string;
  readonly tenantId: string;
  readonly userId: string | null;
}

/** Resolve a customer credential to an identity; `null` means reject with 401. */
export type KeyResolver = (plaintext: string) => Promise<EdgeIdentity | null>;

export interface EdgeUsage {
  readonly requestId: string;
  readonly identity: EdgeIdentity;
  readonly path: string;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly status: number;
  readonly latencyMs: number;
  /** Which New-API channel served the request, when New-API reports it. */
  readonly supplyPath: string | null;
}

/**
 * Every refusal the edge can issue, one code each. The console, the docs and a
 * support conversation all quote this string, so it is part of the contract:
 * a customer must be able to tell "you have no money" from "this key is over
 * its daily cap" from "we do not sell that model" without reading prose.
 */
export type EdgeRefusalCode =
  | "unknown_endpoint"
  | "missing_api_key"
  | "invalid_api_key"
  | "key_disabled"
  | "rate_limit_exceeded"
  | "unknown_model"
  | "model_not_published"
  | "insufficient_balance"
  | "key_quota_exceeded"
  | "payload_too_large"
  | "router_unconfigured"
  | "upstream_failed";

export interface RateLimitVerdict {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  /** Epoch ms at which the window has room again. */
  readonly resetAt: number;
  readonly retryAfterSeconds?: number;
}

export type EdgeRateLimiter = (identity: EdgeIdentity) => Promise<RateLimitVerdict>;

export interface EdgeAdmitInput {
  readonly requestId: string;
  readonly identity: EdgeIdentity;
  readonly path: string;
  /** Candidate models in preference order: the request's `model`, then `models[]`. */
  readonly models: readonly string[];
  readonly promptTokens: number;
  readonly maxOutputTokens: number;
}

/** What the guard held, and against which models it is willing to hold it. */
export interface EdgeAdmission {
  readonly reserved: number;
  readonly currency: string;
  /** The priced subset of the requested candidates, in preference order. */
  readonly candidates: readonly string[];
}

export type EdgeAdmitDecision =
  | { readonly ok: true; readonly admission: EdgeAdmission }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: EdgeRefusalCode;
      readonly message: string;
    };

export interface EdgeSettleInput {
  readonly requestId: string;
  readonly identity: EdgeIdentity;
  readonly path: string;
  readonly admission: EdgeAdmission;
  readonly usage: ParsedUsage;
  readonly status: number;
  readonly latencyMs: number;
  readonly supplyPath: string | null;
  /**
   * False when the request produced nothing the customer can use — a non-2xx,
   * or a 200 whose body carried an error / an empty completion. The guard must
   * then write a zero-cost row and return the reservation in full.
   */
  readonly billable: boolean;
}

/**
 * The money hooks. Kept as an interface so the transport in this file stays
 * testable without a database; the implementation lives in `lib/billing-edge.ts`.
 */
export interface EdgeGuard {
  admit(input: EdgeAdmitInput): Promise<EdgeAdmitDecision>;
  /**
   * Admission for a request whose price cannot be known up front.
   *
   * `images/edits`, `images/variations` and the two `audio` transcription paths
   * take `multipart/form-data`, and the model is a form field: reading it means
   * consuming the upload, so there is no price and no hold. Those calls are
   * post-paid. Without this check a key with a zero balance could call them
   * forever, bounded only by the rate limit — so the balance must at least be
   * positive before the upload is forwarded. One call may still overshoot into
   * a small negative; unbounded free usage cannot.
   */
  admitUnpriced(input: {
    identity: EdgeIdentity;
    path: string;
  }): Promise<{ ok: true } | { ok: false; status: number; code: EdgeRefusalCode; message: string }>;
  settle(input: EdgeSettleInput): Promise<void>;
  /** Called when the upstream call never happened; returns the whole hold. */
  abandon(input: {
    identity: EdgeIdentity;
    admission: EdgeAdmission;
    requestId: string;
  }): Promise<void>;
}

export interface ProxyOptions {
  readonly fetchImpl?: typeof fetch;
  /**
   * When set, the incoming credential is a Nebutra key: it is validated here and
   * replaced upstream by `upstreamToken`. When unset (legacy mode), the
   * credential is forwarded as-is and must be a New-API user token.
   */
  readonly resolveKey?: KeyResolver;
  /** New-API user token the edge uses upstream. Defaults to NEW_API_ACCESS_TOKEN. */
  readonly upstreamToken?: string;
  /** Called once per request after the upstream body has fully streamed. */
  readonly onUsage?: (usage: EdgeUsage) => void | Promise<void>;
  /** Balance guard, pricing and the ledger row. Absent means "relay only". */
  readonly guard?: EdgeGuard;
  /** Per-key request rate. Absent means unlimited. */
  readonly rateLimit?: EdgeRateLimiter;
  readonly now?: () => number;
}

/**
 * Public surface under /v1. One key, every protocol: OpenAI chat / responses /
 * embeddings / images / audio, Anthropic messages. Anything else is 404 so an
 * engine's admin or vendor-specific routes are never reachable through the
 * product edge — and so is every console route, which lives under
 * /api/console/v1 and is never reachable through this rewrite.
 */
const ALLOWED_PATHS: readonly RegExp[] = [
  /^models(\/[^/]+)?$/,
  /^chat\/completions$/,
  /^completions$/,
  /^responses(\/[^/]+(\/cancel)?)?$/,
  /^messages(\/count_tokens)?$/,
  /^embeddings$/,
  /^images\/(generations|edits|variations)$/,
  /^audio\/(speech|transcriptions|translations)$/,
  /^rerank$/,
];

/**
 * Endpoints that produce a completion. Only these can be judged "the model
 * returned nothing" — an embeddings call legitimately has zero completion
 * tokens and must still be charged for its input.
 */
const COMPLETION_PATHS = /^(chat\/completions|completions|responses|messages)$/;

/** Request headers that carry protocol meaning and are safe to pass upstream. */
const FORWARDED_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "anthropic-version",
  "anthropic-beta",
  "openai-beta",
  "openai-organization",
  "x-stainless-lang",
  "x-stainless-package-version",
  "x-stainless-runtime",
  "x-stainless-runtime-version",
] as const;

const USAGE_BUFFER_LIMIT = 4 * 1024 * 1024;

/**
 * Output ceiling assumed when the caller names none. The reservation is a hold,
 * not a charge — the unspent part goes straight back at settle — so this only
 * has to be generous enough not to under-reserve a normal answer.
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

/** Rough prompt size for the reservation only; the charge uses reported usage. */
const CHARS_PER_TOKEN = 4;

export function isAllowedEdgePath(path: readonly string[]): boolean {
  const joined = path.filter(Boolean).join("/");
  return ALLOWED_PATHS.some((re) => re.test(joined));
}

/** `Authorization: Bearer …` (OpenAI) or `x-api-key` (Anthropic) — same credential. */
export function extractCredential(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  const apiKey = request.headers.get("x-api-key")?.trim();
  return apiKey || null;
}

interface ReadBody {
  /** Parsed only when the body is JSON and fits the buffer cap. */
  readonly json: Record<string, unknown> | null;
  /** What to forward when the body is not rewritten. */
  readonly forward: BodyInit | null;
  /** True when `forward` is a stream and needs `duplex: "half"`. */
  readonly streaming: boolean;
  /**
   * A JSON body that did not fit the cap, so no `model` could be read from it.
   * A metered request must be refused rather than relayed: without a model
   * there is no price, no hold and no charge, and padding a prompt past the cap
   * would otherwise buy unlimited free inference.
   */
  readonly overflow: boolean;
}

/**
 * Read as much of the request as the money spine needs, and no more.
 *
 * The edge has to know the requested `model` to price it and `models[]` to fail
 * over, and both live in the JSON body. So a JSON body is buffered — bounded by
 * the same 4 MB cap the response tee uses. Anything else (a multipart image
 * edit, an audio upload) streams through untouched, exactly as before: those
 * bodies are large by nature and carry no routing decision.
 *
 * A JSON body over the cap is not held in memory: the bytes already read are
 * replayed in front of the rest of the stream. It is reported as `overflow`, and
 * a metered caller is refused — an unreadable model means an unpriceable
 * request, and relaying it would be relaying it for free.
 */
export async function readRequestBody(request: Request, limit: number): Promise<ReadBody> {
  if (request.method === "GET" || request.method === "HEAD" || !request.body) {
    return { json: null, forward: null, streaming: false, overflow: false };
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { json: null, forward: request.body, streaming: true, overflow: false };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let overflow = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      size += value.byteLength;
      if (size > limit) {
        overflow = true;
        break;
      }
    }
  }

  if (overflow) {
    // Replay what we hold, then hand the rest of the socket straight through.
    const buffered = chunks;
    const rest = reader;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const next = buffered.shift();
        if (next) {
          controller.enqueue(next);
          return;
        }
        const { done, value } = await rest.read();
        if (done) {
          controller.close();
          return;
        }
        if (value) controller.enqueue(value);
      },
      cancel(reason) {
        void rest.cancel(reason);
      },
    });
    return { json: null, forward: stream, streaming: true, overflow: true };
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  let json: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (isRecord(parsed)) json = parsed;
  } catch {
    // Not JSON after all — forward the bytes and let upstream reject them.
  }
  return { json, forward: bytes as unknown as BodyInit, streaming: false, overflow: false };
}

/** `model` first, then OpenRouter's `models[]` fallback chain, de-duplicated. */
export function modelCandidates(json: Record<string, unknown> | null): string[] {
  if (!json) return [];
  const out: string[] = [];
  const primary = str(json.model);
  if (primary) out.push(primary);
  if (Array.isArray(json.models)) {
    for (const entry of json.models) {
      const model = str(entry);
      if (model && !out.includes(model)) out.push(model);
    }
  }
  return out;
}

function maxOutputTokens(json: Record<string, unknown> | null): number {
  if (!json) return DEFAULT_MAX_OUTPUT_TOKENS;
  return (
    num(json.max_tokens) ??
    num(json.max_output_tokens) ??
    num(json.max_completion_tokens) ??
    DEFAULT_MAX_OUTPUT_TOKENS
  );
}

function estimatePromptTokens(json: Record<string, unknown> | null): number {
  if (!json) return 0;
  try {
    return Math.ceil(JSON.stringify(json).length / CHARS_PER_TOKEN);
  } catch {
    return 0;
  }
}

function rateLimitHeaders(headers: Headers, verdict: RateLimitVerdict): void {
  headers.set("x-ratelimit-limit", String(verdict.limit));
  headers.set("x-ratelimit-remaining", String(Math.max(0, verdict.remaining)));
  headers.set("x-ratelimit-reset", String(Math.ceil(verdict.resetAt / 1000)));
}

export async function proxyOpenAiCompatible(
  request: Request,
  path: readonly string[],
  options: ProxyOptions | typeof fetch = {},
): Promise<Response> {
  const opts: ProxyOptions = typeof options === "function" ? { fetchImpl: options } : options;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const joinedPath = path.filter(Boolean).join("/");

  // Surface check first: an unknown path is 404 whether or not supply is up,
  // which is what makes a console route leaked into /v1 a plain 404.
  if (!isAllowedEdgePath(path)) {
    return refuse(404, "unknown_endpoint", "Unknown endpoint.");
  }

  requireRouterSupply();

  const credential = extractCredential(request);
  if (!credential) {
    return refuse(
      401,
      "missing_api_key",
      "Missing API key. Send `Authorization: Bearer <key>` or `x-api-key: <key>`.",
    );
  }

  let identity: EdgeIdentity | null = null;
  let upstreamAuth = `Bearer ${credential}`;
  if (opts.resolveKey) {
    identity = await opts.resolveKey(credential);
    if (!identity) {
      return refuse(401, "invalid_api_key", "Invalid API key.");
    }
    const upstreamToken = opts.upstreamToken ?? process.env.NEW_API_ACCESS_TOKEN;
    if (!upstreamToken) {
      throw new RouterSupplyUnavailableError("router_upstream_token_missing");
    }
    upstreamAuth = `Bearer ${upstreamToken}`;
  }

  let verdict: RateLimitVerdict | null = null;
  if (identity && opts.rateLimit) {
    verdict = await opts.rateLimit(identity);
    if (!verdict.allowed) {
      const response = refuse(
        429,
        "rate_limit_exceeded",
        "Too many requests for this API key. Slow down or raise the key's rate limit.",
      );
      rateLimitHeaders(response.headers, verdict);
      response.headers.set(
        "retry-after",
        String(
          verdict.retryAfterSeconds ?? Math.max(1, Math.ceil((verdict.resetAt - now()) / 1000)),
        ),
      );
      return response;
    }
  }

  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const upstream = openaiCompatibleUrl(newApiBaseUrl(), path, url.search);
  const headers = new Headers();
  headers.set("Authorization", upstreamAuth);
  headers.set("X-Request-Id", requestId);
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const read = await readRequestBody(request, USAGE_BUFFER_LIMIT);
  const candidates = modelCandidates(read.json);

  // Money gate. No guard means relay-only mode (legacy token pass-through).
  let admission: EdgeAdmission | null = null;
  if (identity && opts.guard && candidates.length > 0) {
    const decision = await opts.guard.admit({
      requestId,
      identity,
      path: joinedPath,
      models: candidates,
      promptTokens: estimatePromptTokens(read.json),
      maxOutputTokens: maxOutputTokens(read.json),
    });
    if (!decision.ok) {
      const response = refuse(decision.status, decision.code, decision.message);
      if (verdict) rateLimitHeaders(response.headers, verdict);
      return response;
    }
    admission = decision.admission;
  } else if (identity && opts.guard && read.overflow) {
    // A JSON body too large to read: no model, therefore no price and no hold.
    // Refusing is the only honest answer — see `payload_too_large`.
    const response = refuse(
      413,
      "payload_too_large",
      "Request body is too large to price. Keep the JSON body under 4 MB.",
    );
    if (verdict) rateLimitHeaders(response.headers, verdict);
    return response;
  } else if (identity && opts.guard && request.method !== "GET" && request.method !== "HEAD") {
    // No readable model: a multipart upload, or a body we could not parse. It
    // still costs money, so it needs a balance even though it cannot be priced.
    const decision = await opts.guard.admitUnpriced({ identity, path: joinedPath });
    if (!decision.ok) {
      const response = refuse(decision.status, decision.code, decision.message);
      if (verdict) rateLimitHeaders(response.headers, verdict);
      return response;
    }
  }

  const startedAt = now();
  let upstreamResponse: Response;
  try {
    upstreamResponse = await sendUpstream({
      fetchImpl,
      upstream,
      headers,
      method: request.method,
      read,
      // Failover only makes sense with a parsed body and more than one candidate.
      candidates: admission ? admission.candidates : candidates,
    });
  } catch (error) {
    if (identity && opts.guard && admission) {
      await opts.guard.abandon({ identity, admission, requestId }).catch(() => {});
    }
    throw error;
  }

  const outgoing = new Headers(upstreamResponse.headers);
  outgoing.delete("content-encoding");
  outgoing.delete("transfer-encoding");
  outgoing.set("x-request-id", requestId);
  if (verdict) rateLimitHeaders(outgoing, verdict);

  const supplyPath =
    upstreamResponse.headers.get("x-oneapi-channel") ??
    upstreamResponse.headers.get("x-newapi-channel") ??
    null;

  let body: ReadableStream<Uint8Array> | null = upstreamResponse.body;
  const wantsBody = Boolean(identity && (opts.onUsage || (opts.guard && admission)));

  if (identity && wantsBody) {
    const resolved = identity;
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const finish = (text: string) => {
      const parsed = parseUsage(text, contentType);
      if (opts.onUsage) {
        void Promise.resolve(
          opts.onUsage({
            requestId,
            identity: resolved,
            path: joinedPath,
            model: parsed.model,
            promptTokens: parsed.promptTokens,
            completionTokens: parsed.completionTokens,
            totalTokens: parsed.totalTokens,
            status: upstreamResponse.status,
            latencyMs: Math.max(0, now() - startedAt),
            supplyPath,
          }),
        ).catch(() => {});
      }
      if (opts.guard && admission) {
        void Promise.resolve(
          opts.guard.settle({
            requestId,
            identity: resolved,
            path: joinedPath,
            admission,
            usage: parsed,
            status: upstreamResponse.status,
            latencyMs: Math.max(0, now() - startedAt),
            supplyPath,
            billable: isBillable(upstreamResponse.status, joinedPath, parsed),
          }),
        ).catch(() => {});
      }
    };

    if (body) {
      body = teeUsage(body, USAGE_BUFFER_LIMIT, finish);
    } else {
      // A bodiless upstream response (204, or a hard failure) still has to
      // settle, or the reservation stays held forever.
      finish("");
    }
  }

  return new Response(body as BodyInit | null, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: outgoing,
  });
}

/**
 * A request is billable when the customer got something. A non-2xx never is.
 * Neither is a 200 whose body carried an error — a streamed relay answers 200
 * the moment the first byte moves, so "the upstream failed halfway" arrives as
 * an error chunk inside a successful response, and that is the single most
 * common billing dispute a relay has.
 */
export function isBillable(status: number, path: string, usage: ParsedUsage): boolean {
  if (status < 200 || status >= 300) return false;
  if (usage.errored) return false;
  if (!COMPLETION_PATHS.test(path)) return true;
  if (usage.completionTokens > 0) return true;
  // Zero completion tokens: only charge when the model said why it stopped and
  // the reason was not an error (a legitimate empty answer still has a reason).
  const reason = usage.finishReason;
  return Boolean(reason) && reason !== "error";
}

interface SendUpstreamInput {
  readonly fetchImpl: typeof fetch;
  readonly upstream: string;
  readonly headers: Headers;
  readonly method: string;
  readonly read: ReadBody;
  readonly candidates: readonly string[];
}

/**
 * One upstream call, or a fallback chain when the caller sent `models[]`.
 *
 * The chain is `proxyChatCompletions` from `@nebutra/router-supply` — it
 * already knows which statuses are worth retrying and drains the body of the
 * ones it abandons. Its name is narrower than its behaviour: it POSTs a JSON
 * body to `target.url`, which is every endpoint that can carry `models[]`.
 */
async function sendUpstream(input: SendUpstreamInput): Promise<Response> {
  const { read, candidates } = input;

  if (read.json && candidates.length > 1) {
    const { models: _models, ...payload } = read.json;
    const targets = candidates.map((model) => ({
      engineId: "newapi",
      kind: "newapi" as const,
      url: input.upstream,
      headers: Object.fromEntries(input.headers.entries()),
      upstreamModel: model,
    }));
    const { response } = await proxyChatCompletions({
      targets,
      body: payload,
      fetchImpl: input.fetchImpl,
      signal: AbortSignal.timeout(180_000),
    });
    return response;
  }

  const init: RequestInit = {
    method: input.method,
    headers: input.headers,
    signal: AbortSignal.timeout(180_000),
  };
  if (read.forward !== null) {
    init.body = read.forward;
    if (read.streaming) Object.assign(init, { duplex: "half" });
  }
  return input.fetchImpl(input.upstream, init);
}

/** Pass bytes through untouched; hand the (capped) text to `done` at end of stream. */
function teeUsage(
  body: ReadableStream<Uint8Array>,
  limit: number,
  done: (text: string) => void,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let collected = "";
  let truncated = false;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (!truncated) {
          collected += decoder.decode(chunk, { stream: true });
          if (collected.length > limit) {
            truncated = true;
          }
        }
      },
      flush() {
        if (!truncated) collected += decoder.decode();
        done(collected);
      },
    }),
  );
}

export interface ParsedUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Prompt tokens the upstream served from its cache — priced separately. */
  cachedPromptTokens: number;
  cacheWriteTokens: number;
  /** An error object appeared in the body, whatever the HTTP status said. */
  errored: boolean;
  /** `stop` / `length` / `error` / … — null when the body never reported one. */
  finishReason: string | null;
}

/**
 * Read token usage out of an OpenAI chat / responses, or Anthropic messages
 * body — JSON or SSE. Last frame carrying usage wins, which is how all three
 * protocols report final counts on a stream.
 *
 * It also reports whether the body carried an error and how the model stopped,
 * because on a streamed relay those are the only evidence that a 200 was not
 * actually a completed answer.
 */
export function parseUsage(text: string, contentType: string): ParsedUsage {
  const result: ParsedUsage = {
    model: "unknown",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedPromptTokens: 0,
    cacheWriteTokens: 0,
    errored: false,
    finishReason: null,
  };
  const frames: unknown[] = [];
  if (
    contentType.includes("text/event-stream") ||
    text.startsWith("data:") ||
    text.startsWith("event:")
  ) {
    for (const line of text.split("\n")) {
      if (line.startsWith("event:") && line.slice(6).trim() === "error") {
        result.errored = true;
        continue;
      }
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        frames.push(JSON.parse(payload));
      } catch {
        // partial frame — ignore
      }
    }
  } else {
    try {
      frames.push(JSON.parse(text));
    } catch {
      return result;
    }
  }

  for (const frame of frames) {
    if (!isRecord(frame)) continue;
    if (frame.error !== undefined && frame.error !== null) result.errored = true;
    if (str(frame.type)?.includes("error")) result.errored = true;
    const nested = isRecord(frame.response)
      ? frame.response
      : isRecord(frame.message)
        ? frame.message
        : null;
    if (nested?.error !== undefined && nested?.error !== null) result.errored = true;
    const model = str(frame.model) ?? (nested ? str(nested.model) : undefined);
    if (model) result.model = model;

    const reason = finishReasonOf(frame) ?? (nested ? finishReasonOf(nested) : null);
    if (reason) result.finishReason = reason;

    const usage = pickUsage(frame) ?? (nested ? pickUsage(nested) : null);
    if (!usage) continue;
    const cachedRead =
      num(usage.cache_read_input_tokens) ??
      num(usage.cached_tokens) ??
      num(detailOf(usage, "prompt_tokens_details")?.cached_tokens) ??
      num(detailOf(usage, "input_tokens_details")?.cached_tokens);
    const cacheWrite = num(usage.cache_creation_input_tokens);
    if (cachedRead !== undefined) result.cachedPromptTokens = cachedRead;
    if (cacheWrite !== undefined) result.cacheWriteTokens = cacheWrite;

    const openAiPrompt = num(usage.prompt_tokens);
    const anthropicPrompt = num(usage.input_tokens);
    if (openAiPrompt !== undefined) {
      // OpenAI's prompt_tokens already includes the cached ones.
      result.promptTokens = openAiPrompt;
    } else if (anthropicPrompt !== undefined) {
      // Anthropic reports cache reads outside input_tokens; fold them in so the
      // price resolver's "prompt minus cached" arithmetic lands on the truth.
      result.promptTokens = anthropicPrompt + result.cachedPromptTokens;
    }
    const completion = num(usage.completion_tokens) ?? num(usage.output_tokens);
    if (completion !== undefined) result.completionTokens = completion;
    const total = num(usage.total_tokens);
    result.totalTokens = total ?? result.promptTokens + result.completionTokens;
  }
  if (result.totalTokens === 0) result.totalTokens = result.promptTokens + result.completionTokens;
  return result;
}

/** OpenAI `choices[].finish_reason`, Anthropic `delta.stop_reason` / `stop_reason`. */
function finishReasonOf(frame: Record<string, unknown>): string | null {
  const choices = frame.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!isRecord(choice)) continue;
      const reason = str(choice.finish_reason);
      if (reason) return reason;
    }
  }
  const stop = str(frame.stop_reason);
  if (stop) return stop;
  const delta = isRecord(frame.delta) ? str(frame.delta.stop_reason) : undefined;
  if (delta) return delta;
  const status = str(frame.status);
  if (status === "completed" || status === "incomplete" || status === "failed") return status;
  return null;
}

function detailOf(usage: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = usage[key];
  return isRecord(value) ? value : null;
}

function pickUsage(frame: Record<string, unknown>): Record<string, unknown> | null {
  return isRecord(frame.usage) ? frame.usage : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** OpenAI-compatible envelope, plus the `code` a caller can branch on. */
export function refuse(status: number, code: EdgeRefusalCode, message: string): Response {
  return Response.json(
    {
      error: {
        message,
        type: status >= 500 ? "server_error" : "invalid_request_error",
        code,
      },
    },
    { status },
  );
}

export function openaiError(status: number, message: string): Response {
  return Response.json(
    { error: { message, type: status >= 500 ? "server_error" : "invalid_request_error" } },
    { status },
  );
}
