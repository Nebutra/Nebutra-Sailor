/**
 * /api/v1/ai/gateway — External API key authenticated AI gateway routes.
 *
 * Phase 1: Auth via `sk-sailor-*` API key + credit balance guard.
 * Phase 2: Extract token usage from upstream response (streaming + non-streaming).
 * Phase 3: Fire-and-forget enqueue of CompletionEvent for async billing closure.
 *
 * The route exports a factory `createAiGatewayRoutes(deps)` so the shared
 * gateway dependencies (Redis, Prisma, Queue) can be injected once at startup.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { findOversizedPropertyName, OPENAI_MAX_PROPERTY_NAME_LENGTH } from "@nebutra/agents";
import {
  admitSpend,
  calculateCost,
  createGatewayPipelineMiddleware,
  createStreamingUsageExtractor,
  enqueueCompletion,
  estimateUsage,
  extractUsageFromJson,
  type GatewayContextVars,
  getModelPricing,
  type ResolvedApiKey,
} from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";
import { API_SCOPES, hasScope } from "@nebutra/prepaid-wallet";
import { listPublicModels, parseAliasTableJson } from "@nebutra/router-supply";
import type { GatewayDeps } from "../../lib/gateway-deps.js";

const log = logger.child({ service: "ai-gateway" });

// ── Schemas ──────────────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

/**
 * Per-request ceilings.
 *
 * The balance guard admits a request when the tenant's balance is above zero.
 * It does not ask how much the request could cost, so a balance of one cent
 * admits a request that bills fifty dollars — a million-token context with an
 * unbounded completion. These bound the worst case for a single request.
 *
 * Set well above real traffic: a long chat is a few thousand output tokens
 * and tens of thousands of input characters. Nothing normal comes near these,
 * which is the point — they bound the failure, not the success. Tunable by env
 * so raising one does not need a deploy.
 */
function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MAX_COMPLETION_TOKENS = positiveIntFromEnv("AI_MAX_COMPLETION_TOKENS", 32_768);
const MAX_PROMPT_CHARS = positiveIntFromEnv("AI_MAX_PROMPT_CHARS", 1_000_000);
const MAX_MESSAGES = positiveIntFromEnv("AI_MAX_MESSAGES", 500);

// Only used to price the worst case for a reservation, never to bill. Matches
// the heuristic in gateway-core's tiktoken fallback; being slightly wrong here
// costs a slightly wrong reservation, which is released either way.
const CHARS_PER_TOKEN_ESTIMATE = 3.5;

const ChatCompletionRequestSchema = z
  .object({
    model: z.string(),
    messages: z.array(ChatMessageSchema).max(MAX_MESSAGES),
    stream: z.boolean().optional().default(false),
    temperature: z.number().optional(),
    max_tokens: z.number().int().positive().max(MAX_COMPLETION_TOKENS).optional(),
  })
  .catchall(z.any())
  .superRefine((value, ctx) => {
    const issue = findOversizedPropertyName(value);
    if (issue) {
      ctx.addIssue({
        code: "custom",
        message: `JSON object property name at ${issue.path} is ${issue.length} characters long; maximum is ${OPENAI_MAX_PROPERTY_NAME_LENGTH}. Put generated text in a string value instead of using it as a JSON key.`,
      });
    }

    // Measured across all messages, not per message: ten thousand small
    // messages cost the same as one enormous one, and only the total is
    // charged for.
    const promptChars = value.messages.reduce(
      (sum: number, m: { content: string }) => sum + m.content.length,
      0,
    );
    if (promptChars > MAX_PROMPT_CHARS) {
      ctx.addIssue({
        code: "custom",
        path: ["messages"],
        message: `Prompt is ${promptChars} characters; maximum is ${MAX_PROMPT_CHARS}.`,
      });
    }
  });

const ErrorResponseSchema = z.object({
  error: z.string(),
});

// ── Route definition ────────────────────────────────────────────────────────

const chatCompletionsRoute = createRoute({
  method: "post",
  path: "/chat/completions",
  tags: ["AI Gateway"],
  summary: "Chat completions proxy (API key authenticated)",
  description:
    "Proxy chat completion requests to upstream LLM providers. Requires sk-sailor-* API key.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ChatCompletionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Chat completion response (JSON body or SSE stream)",
      content: {
        // z.any(): dual JSON/SSE cannot be expressed as a single TypedResponse.
        "application/json": { schema: z.any() },
        "text/event-stream": { schema: z.string() },
      },
    },
    401: {
      description: "Invalid or missing API key",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    402: {
      description: "Insufficient credit balance",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

interface UpstreamRequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  stream_options?: { include_usage?: boolean } & Record<string, unknown>;
  [key: string]: unknown;
}

export interface AiGatewayUpstream {
  id: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
}

export interface AiGatewayResolveInput {
  apiKey: ResolvedApiKey;
  body: UpstreamRequestBody;
  requestId: string;
}

export interface AiGatewayRouteOptions {
  fetch?: typeof fetch;
  resolveUpstreams?: (
    input: AiGatewayResolveInput,
  ) => Promise<readonly AiGatewayUpstream[]> | readonly AiGatewayUpstream[];
}

interface EnvUpstreamConfig {
  id?: string | undefined;
  provider?: string | undefined;
  baseUrl?: string | undefined;
  apiKeyEnv?: string | undefined;
  headers?: Record<string, string> | undefined;
}

const RETRYABLE_UPSTREAM_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Inject `stream_options.include_usage=true` when the caller asked for
 * streaming. This instructs OpenAI-compatible providers to emit a final
 * usage frame before `[DONE]`, which is the only way to get authoritative
 * token counts for streamed responses.
 */
function withIncludeUsage(body: UpstreamRequestBody): UpstreamRequestBody {
  if (!body.stream) return body;
  return {
    ...body,
    stream_options: {
      ...(body.stream_options ?? {}),
      include_usage: true,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveApiKey(config: EnvUpstreamConfig): string | null {
  if (config.apiKeyEnv) return process.env[config.apiKeyEnv] ?? null;
  return null;
}

function normalizeHeaders(headers: unknown): Record<string, string> | undefined {
  if (!isRecord(headers)) return undefined;

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeEnvUpstream(config: unknown, index: number): AiGatewayUpstream | null {
  if (!isRecord(config)) return null;

  const envConfig: EnvUpstreamConfig = {
    id: typeof config.id === "string" ? config.id : undefined,
    provider: typeof config.provider === "string" ? config.provider : undefined,
    baseUrl: typeof config.baseUrl === "string" ? config.baseUrl : undefined,
    apiKeyEnv: typeof config.apiKeyEnv === "string" ? config.apiKeyEnv : undefined,
    headers: normalizeHeaders(config.headers),
  };
  const apiKey = resolveApiKey(envConfig);

  if (!envConfig.baseUrl || !apiKey) return null;

  const provider = envConfig.provider ?? envConfig.id ?? `upstream-${index + 1}`;

  return {
    id: envConfig.id ?? provider,
    provider,
    baseUrl: envConfig.baseUrl,
    apiKey,
    ...(envConfig.headers ? { headers: envConfig.headers } : {}),
  };
}

function parseConfiguredUpstreams(): readonly AiGatewayUpstream[] {
  const raw = process.env.AI_GATEWAY_UPSTREAMS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry, index) => normalizeEnvUpstream(entry, index))
      .filter((entry): entry is AiGatewayUpstream => entry !== null);
  } catch (error) {
    log.warn("Ignoring invalid AI_GATEWAY_UPSTREAMS JSON", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function defaultEnvUpstreams(): readonly AiGatewayUpstream[] {
  const explicit = parseConfiguredUpstreams();
  if (explicit.length > 0) return orderUpstreams(explicit);

  const envUpstreams = [
    // Nebutra Router sidecars (infra/nebutra-router) — preferred when configured
    normalizeEnvUpstream(
      {
        id: "newapi",
        provider: "newapi",
        baseUrl: process.env.NEW_API_BASE_URL ?? process.env.NEBUTRA_NEW_API_URL,
        apiKeyEnv: process.env.NEW_API_ACCESS_TOKEN
          ? "NEW_API_ACCESS_TOKEN"
          : process.env.NEBUTRA_NEW_API_TOKEN
            ? "NEBUTRA_NEW_API_TOKEN"
            : "NEW_API_ACCESS_TOKEN",
      },
      0,
    ),
    normalizeEnvUpstream(
      {
        id: "sub2api",
        provider: "sub2api",
        baseUrl: process.env.SUB2API_BASE_URL ?? process.env.NEBUTRA_SUB2API_URL,
        apiKeyEnv: process.env.SUB2API_ACCESS_TOKEN
          ? "SUB2API_ACCESS_TOKEN"
          : process.env.NEBUTRA_SUB2API_TOKEN
            ? "NEBUTRA_SUB2API_TOKEN"
            : "SUB2API_ACCESS_TOKEN",
      },
      1,
    ),
    normalizeEnvUpstream(
      {
        id: "openai-env",
        provider: "openai",
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        apiKeyEnv: "OPENAI_API_KEY",
      },
      2,
    ),
    normalizeEnvUpstream(
      {
        id: "openrouter-env",
        provider: "openrouter",
        baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
        apiKeyEnv: "OPENROUTER_API_KEY",
      },
      1,
    ),
    normalizeEnvUpstream(
      {
        id: "litellm-env",
        provider: "litellm",
        baseUrl: process.env.LITELLM_BASE_URL ?? "http://localhost:4000/v1",
        apiKeyEnv: "LITELLM_API_KEY",
      },
      2,
    ),
    normalizeEnvUpstream(
      {
        id: "portkey-env",
        provider: "portkey",
        baseUrl: process.env.PORTKEY_BASE_URL ?? "https://api.portkey.ai/v1",
        apiKeyEnv: "PORTKEY_API_KEY",
      },
      3,
    ),
    normalizeEnvUpstream(
      {
        id: "ai-gateway-env",
        provider: "ai-gateway",
        baseUrl: process.env.AI_GATEWAY_BASE_URL,
        apiKeyEnv: "AI_GATEWAY_API_KEY",
      },
      4,
    ),
    normalizeEnvUpstream(
      {
        id: "custom-env",
        provider: process.env.AI_CUSTOM_PROVIDER ?? "custom",
        baseUrl: process.env.AI_CUSTOM_BASE_URL,
        apiKeyEnv: "AI_CUSTOM_API_KEY",
      },
      5,
    ),
  ].filter((entry): entry is AiGatewayUpstream => entry !== null);

  return orderUpstreams(envUpstreams);
}

function orderUpstreams(upstreams: readonly AiGatewayUpstream[]): readonly AiGatewayUpstream[] {
  const chain = process.env.AI_GATEWAY_PROVIDER_CHAIN?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!chain?.length) return upstreams;

  const remaining = new Set(upstreams);
  const ordered: AiGatewayUpstream[] = [];

  for (const requested of chain) {
    const match = upstreams.find(
      (upstream) =>
        remaining.has(upstream) && (upstream.id === requested || upstream.provider === requested),
    );
    if (match) {
      ordered.push(match);
      remaining.delete(match);
    }
  }

  return [...ordered, ...upstreams.filter((upstream) => remaining.has(upstream))];
}

function chatCompletionsUrl(upstream: AiGatewayUpstream): string {
  return `${upstream.baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function isRetryableUpstreamStatus(status: number): boolean {
  return RETRYABLE_UPSTREAM_STATUSES.has(status);
}

function buildUpstreamBody(body: UpstreamRequestBody, apiKey: ResolvedApiKey): UpstreamRequestBody {
  return {
    ...withIncludeUsage(body),
    // Schema validation caps max_tokens when the caller sends one, but omitting
    // it is the common case and leaves the ceiling to whatever the upstream
    // defaults to — which for current frontier models is large enough that one
    // request can bill more than a month of normal traffic. Send the ceiling
    // explicitly so the bound holds either way.
    max_tokens: body.max_tokens ?? MAX_COMPLETION_TOKENS,
    user: apiKey.userId ?? apiKey.organizationId,
  };
}

function buildUpstreamHeaders(
  upstream: AiGatewayUpstream,
  apiKey: ResolvedApiKey,
  requestId: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${upstream.apiKey}`,
    "X-Nebutra-Api-Key-Id": apiKey.id,
    "X-Nebutra-Provider": upstream.id,
    "X-Nebutra-Request-Id": requestId,
    "X-Nebutra-Tenant-Id": apiKey.organizationId,
    ...(apiKey.userId ? { "X-Nebutra-User-Id": apiKey.userId } : {}),
    ...(upstream.headers ?? {}),
  };
}

async function enqueueErrorCompletion(
  deps: GatewayDeps,
  input: {
    apiKey: ResolvedApiKey;
    body: UpstreamRequestBody;
    errorMessage: string;
    requestId: string;
    startTime: number;
  },
) {
  await enqueueCompletion(
    {
      requestId: input.requestId,
      apiKeyId: input.apiKey.id,
      organizationId: input.apiKey.organizationId,
      userId: input.apiKey.userId,
      model: input.body.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - input.startTime,
      status: "error",
      errorMessage: input.errorMessage,
    },
    { queue: deps.queue as never },
  );
}

function recordErrorCompletion(
  deps: GatewayDeps,
  input: Parameters<typeof enqueueErrorCompletion>[1],
): Promise<void> {
  return enqueueErrorCompletion(deps, input).catch((error) => {
    log.warn("Failed to enqueue AI gateway error completion", {
      requestId: input.requestId,
      completionErrorMessage: input.errorMessage,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createAiGatewayRoutes(deps: GatewayDeps, options: AiGatewayRouteOptions = {}) {
  const routes = new OpenAPIHono<{ Variables: GatewayContextVars }>();
  const fetchImpl = options.fetch ?? fetch;
  const resolveUpstreams = options.resolveUpstreams ?? (() => defaultEnvUpstreams());

  const authMiddleware = createGatewayPipelineMiddleware({
    redis: deps.redis,
    prisma: deps.prisma as never,
    getCreditBalance: deps.getCreditBalance,
  });

  routes.use("*", authMiddleware);

  // GET /models — OpenAI-compatible catalog from alias table
  routes.get("/models", (c) => {
    const apiKey = c.get("resolvedApiKey");
    if (!hasScope(apiKey.scopes, API_SCOPES.MODELS_ALL)) {
      return c.json({ error: "API key missing models:* scope" }, 403);
    }
    const aliases = parseAliasTableJson(process.env.NEBUTRA_MODEL_ALIASES);
    const ids = listPublicModels(aliases);
    return c.json({
      object: "list",
      data: ids.map((id) => ({
        id,
        object: "model",
        owned_by: "nebutra-router",
      })),
    });
  });

  routes.openapi(chatCompletionsRoute, async (c) => {
    const startTime = Date.now();
    const apiKey = c.get("resolvedApiKey");
    const requestId = c.get("gatewayRequestId");
    const body = c.req.valid("json") as UpstreamRequestBody;

    if (!hasScope(apiKey.scopes, API_SCOPES.MODELS_ALL)) {
      return c.json({ error: "API key missing models:* scope" }, 403);
    }

    // Reserve this request's worst case against the tenant's balance before
    // calling upstream. The middleware already rejected a zero balance, but
    // that check reads a 30s cache and so admits every concurrent request on
    // the same remaining cent. Reserving moves a shared counter atomically, so
    // only requests that actually fit get through.
    //
    // Worst case is priced from the real model pricing rather than a flat
    // ceiling: over-estimating would reject requests that were always going to
    // be affordable, which is a worse outcome than the hole being slightly
    // wider. If pricing is unknown the reservation is skipped and behaviour is
    // unchanged.
    try {
      const pricing = await getModelPricing(body.model, deps as never).catch(() => null);
      if (pricing) {
        const promptChars = body.messages.reduce((sum, m) => sum + m.content.length, 0);
        const promptTokens = Math.ceil(promptChars / CHARS_PER_TOKEN_ESTIMATE);
        const completionTokens = body.max_tokens ?? MAX_COMPLETION_TOKENS;
        const worstCase = calculateCost(
          {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            model: body.model,
          },
          pricing,
        );
        await admitSpend(apiKey.organizationId, worstCase, deps.redis, deps.getCreditBalance);
      }
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Insufficient credit balance" },
        402,
      );
    }

    log.info("Gateway chat request", {
      requestId,
      orgId: apiKey.organizationId,
      model: body.model,
      stream: !!body.stream,
    });

    const upstreamBody = buildUpstreamBody(body, apiKey);
    const upstreams = await resolveUpstreams({ apiKey, body, requestId });

    if (upstreams.length === 0) {
      log.error("Gateway misconfigured: no AI upstreams available", { requestId });
      return c.json({ error: "Gateway misconfigured" }, 500);
    }

    let upstreamResponse: Response | null = null;
    let selectedUpstream: AiGatewayUpstream | null = null;
    let lastFailureStatus: number | null = null;
    let lastFailureMessage = "upstream_unreachable";

    for (const [index, upstream] of upstreams.entries()) {
      selectedUpstream = upstream;

      try {
        upstreamResponse = await fetchImpl(chatCompletionsUrl(upstream), {
          method: "POST",
          headers: buildUpstreamHeaders(upstream, apiKey, requestId),
          body: JSON.stringify(upstreamBody),
        });
      } catch (err) {
        lastFailureStatus = 502;
        lastFailureMessage = "upstream_unreachable";
        log.error("Upstream fetch failed", {
          requestId,
          provider: upstream.id,
          error: err instanceof Error ? err.message : String(err),
        });

        if (index < upstreams.length - 1) continue;
        void enqueueErrorCompletion(deps, {
          requestId,
          apiKey,
          body,
          startTime,
          errorMessage: lastFailureMessage,
        }).catch(() => {
          /* swallowed: queue failures must not affect the response */
        });
        return c.json({ error: "Upstream unreachable" }, 502);
      }

      if (upstreamResponse.ok) break;

      lastFailureStatus = upstreamResponse.status;
      lastFailureMessage = `upstream_${upstreamResponse.status}`;
      const errorText = await upstreamResponse.text().catch(() => "");
      log.error("Upstream error", {
        status: upstreamResponse.status,
        error: errorText.slice(0, 500),
        requestId,
        provider: upstream.id,
      });

      if (isRetryableUpstreamStatus(upstreamResponse.status) && index < upstreams.length - 1) {
        continue;
      }

      void enqueueErrorCompletion(deps, {
        requestId,
        apiKey,
        body,
        startTime,
        errorMessage: lastFailureMessage,
      }).catch(() => {
        /* swallowed: queue failures must not affect the response */
      });

      return c.json({ error: "Upstream API error" }, upstreamResponse.status as 500);
    }

    if (!upstreamResponse || !selectedUpstream) {
      void enqueueErrorCompletion(deps, {
        requestId,
        apiKey,
        body,
        startTime,
        errorMessage: lastFailureMessage,
      }).catch(() => {
        /* swallowed: queue failures must not affect the response */
      });
      return c.json({ error: "Upstream API error" }, (lastFailureStatus ?? 502) as 500);
    }

    c.header("X-Nebutra-AI-Provider", selectedUpstream.id);
    c.header("X-Nebutra-AI-Provider-Type", selectedUpstream.provider);

    if (upstreams.length > 1) {
      log.info("Gateway upstream selected", {
        requestId,
        provider: selectedUpstream.id,
        attempts: upstreams.indexOf(selectedUpstream) + 1,
      });
    }

    // ── Non-streaming path ───────────────────────────────────────────────────
    if (!body.stream) {
      const json = (await upstreamResponse.json().catch(() => null)) as unknown;

      const usage =
        extractUsageFromJson(json, body.model) ?? estimateUsage(body.messages, "", body.model);

      void enqueueCompletion(
        {
          requestId,
          apiKeyId: apiKey.id,
          organizationId: apiKey.organizationId,
          userId: apiKey.userId,
          model: usage.model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          latencyMs: Date.now() - startTime,
          status: "success",
          errorMessage: null,
        },
        { queue: deps.queue as never },
      ).catch(() => {
        /* swallowed */
      });

      return c.json(json as Record<string, unknown>);
    }

    // ── Streaming path ───────────────────────────────────────────────────────
    const extractor = createStreamingUsageExtractor(body.model);
    const upstreamBodyStream = upstreamResponse.body;

    if (!upstreamBodyStream) {
      log.error("Upstream returned empty body for stream", {
        requestId,
        provider: selectedUpstream.id,
      });
      void recordErrorCompletion(deps, {
        requestId,
        apiKey,
        body,
        startTime,
        errorMessage: "upstream_stream_unavailable",
      });
      return c.json({ error: "Upstream stream unavailable" }, 502);
    }

    const transformed = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstreamBodyStream.getReader();
        const decoder = new TextDecoder();
        let sawChunk = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value?.byteLength) {
              sawChunk = true;
              // Mirror the chunk upstream → downstream byte-for-byte,
              // while extracting usage / content from a decoded copy.
              controller.enqueue(value);
              const chunkText = decoder.decode(value, { stream: true });
              extractor.processChunk(chunkText);
            }
          }
        } catch (err) {
          log.error("Stream relay failed", {
            requestId,
            provider: selectedUpstream.id,
            error: err instanceof Error ? err.message : String(err),
          });
          await recordErrorCompletion(deps, {
            requestId,
            apiKey,
            body,
            startTime,
            errorMessage: "stream_relay_failed",
          });
          controller.error(err);
          return;
        } finally {
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
        }

        if (!sawChunk) {
          log.error("Upstream stream closed without chunks", {
            requestId,
            provider: selectedUpstream.id,
          });
          await recordErrorCompletion(deps, {
            requestId,
            apiKey,
            body,
            startTime,
            errorMessage: "upstream_stream_empty",
          });
          controller.close();
          return;
        }

        controller.close();

        // On completion: build CompletionEvent and enqueue.
        const usage =
          extractor.getUsage() ??
          estimateUsage(body.messages, extractor.getAccumulatedContent(), body.model);

        void enqueueCompletion(
          {
            requestId,
            apiKeyId: apiKey.id,
            organizationId: apiKey.organizationId,
            userId: apiKey.userId,
            model: usage.model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            latencyMs: Date.now() - startTime,
            status: "success",
            errorMessage: null,
          },
          { queue: deps.queue as never },
        ).catch(() => {
          /* swallowed */
        });
      },
    });

    return new Response(transformed, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Nebutra-AI-Provider": selectedUpstream.id,
        "X-Nebutra-AI-Provider-Type": selectedUpstream.provider,
      },
    });
  });

  return routes;
}

/**
 * @deprecated Prefer `createAiGatewayRoutes(deps)`.
 * Kept as an empty OpenAPIHono to avoid breaking imports during rollout —
 * mounting this without calling the factory will NOT authenticate requests.
 */
export const aiGatewayRoutes = new OpenAPIHono<{ Variables: GatewayContextVars }>();
