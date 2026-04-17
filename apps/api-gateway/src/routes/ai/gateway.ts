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
import {
  createGatewayPipelineMiddleware,
  createStreamingUsageExtractor,
  enqueueCompletion,
  estimateUsage,
  extractUsageFromJson,
  type GatewayContextVars,
} from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";
import type { GatewayDeps } from "../../lib/gateway-deps.js";

const log = logger.child({ service: "ai-gateway" });

// ── Schemas ──────────────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatCompletionRequestSchema = z
  .object({
    model: z.string(),
    messages: z.array(ChatMessageSchema),
    stream: z.boolean().optional().default(false),
    temperature: z.number().optional(),
    max_tokens: z.number().optional(),
  })
  .passthrough();

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
    200: { description: "Chat completion response" },
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

// ── Factory ──────────────────────────────────────────────────────────────────

export function createAiGatewayRoutes(deps: GatewayDeps) {
  const routes = new OpenAPIHono<{ Variables: GatewayContextVars }>();

  const authMiddleware = createGatewayPipelineMiddleware({
    redis: deps.redis,
    prisma: deps.prisma as never,
    getCreditBalance: deps.getCreditBalance,
  });

  routes.use("*", authMiddleware);

  routes.openapi(chatCompletionsRoute, async (c) => {
    const startTime = Date.now();
    const apiKey = c.get("resolvedApiKey");
    const requestId = c.get("gatewayRequestId");
    const body = c.req.valid("json") as UpstreamRequestBody;

    log.info("Gateway chat request", {
      requestId,
      orgId: apiKey.organizationId,
      model: body.model,
      stream: !!body.stream,
    });

    const upstreamBody = withIncludeUsage(body);
    const upstreamUrl = "https://api.openai.com/v1/chat/completions";

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      log.error("Gateway misconfigured: OPENAI_API_KEY missing", { requestId });
      return c.json({ error: "Gateway misconfigured" }, 500);
    }

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(upstreamBody),
      });
    } catch (err) {
      log.error("Upstream fetch failed", {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      });
      return c.json({ error: "Upstream unreachable" }, 502);
    }

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => "");
      log.error("Upstream error", {
        status: upstreamResponse.status,
        error: errorText.slice(0, 500),
        requestId,
      });

      // Enqueue an error event so the worker still records the attempt.
      // Fire-and-forget; never block the response.
      void enqueueCompletion(
        {
          requestId,
          apiKeyId: apiKey.id,
          organizationId: apiKey.organizationId,
          userId: apiKey.userId,
          model: body.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - startTime,
          status: "error",
          errorMessage: `upstream_${upstreamResponse.status}`,
        },
        { queue: deps.queue as never },
      ).catch(() => {
        /* swallowed: queue failures must not affect the response */
      });

      return c.json({ error: "Upstream API error" }, upstreamResponse.status as 500);
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
      log.error("Upstream returned empty body for stream", { requestId });
      return c.json({ error: "Upstream stream unavailable" }, 502);
    }

    const transformed = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstreamBodyStream.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
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
            error: err instanceof Error ? err.message : String(err),
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
