import { openaiCompatibleUrl } from "@nebutra/router-supply";

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
  readonly now?: () => number;
}

/**
 * Public surface under /v1. One key, every protocol: OpenAI chat / responses /
 * embeddings / images / audio, Anthropic messages. Anything else is 404 so an
 * engine's admin or vendor-specific routes are never reachable through the
 * product edge.
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

export async function proxyOpenAiCompatible(
  request: Request,
  path: readonly string[],
  options: ProxyOptions | typeof fetch = {},
): Promise<Response> {
  const opts: ProxyOptions = typeof options === "function" ? { fetchImpl: options } : options;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;

  requireRouterSupply();

  if (!isAllowedEdgePath(path)) {
    return openaiError(404, "unknown_endpoint");
  }

  const credential = extractCredential(request);
  if (!credential) {
    return openaiError(
      401,
      "Missing API key. Send `Authorization: Bearer <key>` or `x-api-key: <key>`.",
    );
  }

  let identity: EdgeIdentity | null = null;
  let upstreamAuth = `Bearer ${credential}`;
  if (opts.resolveKey) {
    identity = await opts.resolveKey(credential);
    if (!identity) {
      return openaiError(401, "Invalid API key.");
    }
    const upstreamToken = opts.upstreamToken ?? process.env.NEW_API_ACCESS_TOKEN;
    if (!upstreamToken) {
      throw new RouterSupplyUnavailableError("router_upstream_token_missing");
    }
    upstreamAuth = `Bearer ${upstreamToken}`;
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

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(180_000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    Object.assign(init, { duplex: "half" });
  }

  const startedAt = now();
  const upstreamResponse = await fetchImpl(upstream, init);
  const outgoing = new Headers(upstreamResponse.headers);
  outgoing.delete("content-encoding");
  outgoing.delete("transfer-encoding");
  outgoing.set("x-request-id", requestId);

  let body: ReadableStream<Uint8Array> | null = upstreamResponse.body;
  if (identity && opts.onUsage && body) {
    const onUsage = opts.onUsage;
    const resolved = identity;
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const supplyPath =
      upstreamResponse.headers.get("x-oneapi-channel") ??
      upstreamResponse.headers.get("x-newapi-channel") ??
      null;
    body = teeUsage(body, USAGE_BUFFER_LIMIT, (text) => {
      const parsed = parseUsage(text, contentType);
      void Promise.resolve(
        onUsage({
          requestId,
          identity: resolved,
          path: path.join("/"),
          model: parsed.model,
          promptTokens: parsed.promptTokens,
          completionTokens: parsed.completionTokens,
          totalTokens: parsed.totalTokens,
          status: upstreamResponse.status,
          latencyMs: Math.max(0, now() - startedAt),
          supplyPath,
        }),
      ).catch(() => {});
    });
  }

  return new Response(body as BodyInit | null, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: outgoing,
  });
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

interface ParsedUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Read token usage out of an OpenAI chat / responses, or Anthropic messages
 * body — JSON or SSE. Last frame carrying usage wins, which is how all three
 * protocols report final counts on a stream.
 */
export function parseUsage(text: string, contentType: string): ParsedUsage {
  const result: ParsedUsage = {
    model: "unknown",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  const frames: unknown[] = [];
  if (
    contentType.includes("text/event-stream") ||
    text.startsWith("data:") ||
    text.startsWith("event:")
  ) {
    for (const line of text.split("\n")) {
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
    const nested = isRecord(frame.response)
      ? frame.response
      : isRecord(frame.message)
        ? frame.message
        : null;
    const model = str(frame.model) ?? (nested ? str(nested.model) : undefined);
    if (model) result.model = model;
    const usage = pickUsage(frame) ?? (nested ? pickUsage(nested) : null);
    if (!usage) continue;
    const prompt = num(usage.prompt_tokens) ?? num(usage.input_tokens);
    const completion = num(usage.completion_tokens) ?? num(usage.output_tokens);
    if (prompt !== undefined) result.promptTokens = prompt;
    if (completion !== undefined) result.completionTokens = completion;
    const total = num(usage.total_tokens);
    result.totalTokens = total ?? result.promptTokens + result.completionTokens;
  }
  if (result.totalTokens === 0) result.totalTokens = result.promptTokens + result.completionTokens;
  return result;
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

export function openaiError(status: number, message: string): Response {
  return Response.json(
    { error: { message, type: status >= 500 ? "server_error" : "invalid_request_error" } },
    { status },
  );
}
