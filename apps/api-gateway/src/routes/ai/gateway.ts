/**
 * /api/v1/ai/gateway — External API key authenticated AI gateway routes
 *
 * Authenticates requests via `sk-sailor-*` API keys (not JWT),
 * validates credit balance, and proxies to upstream LLM providers.
 *
 * Phase 1: Direct OpenAI proxy with OpenAPI spec.
 * Phase 2: Full provider routing + usage extraction via @nebutra/provider-adapters.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createGatewayAuthMiddleware, type GatewayContextVars } from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";

const log = logger.child({ service: "ai-gateway" });

export const aiGatewayRoutes = new OpenAPIHono<{
  Variables: GatewayContextVars;
}>();

/**
 * Mount the auth middleware.
 *
 * The actual `deps` (Redis, Prisma, getCreditBalance) are injected at mount
 * time in `src/index.ts` where infrastructure clients are available.
 * For now we use a lazy initializer so the route file stays pure.
 */
let authMiddlewareMounted = false;

/**
 * Call this once from the main app entrypoint to wire up real dependencies.
 */
export function mountGatewayAuth(deps: {
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
    del: (key: string) => Promise<unknown>;
  };
  prisma: {
    aPIKey: {
      findUnique: (args: {
        where: { keyHash: string };
        include?: {
          organization?: { select?: { plan?: boolean } };
        };
      }) => Promise<{
        id: string;
        organizationId: string;
        createdById: string | null;
        scopes: string[];
        rateLimitRps: number;
        revokedAt: Date | null;
        expiresAt: Date | null;
        organization: { plan: string };
      } | null>;
      update: (args: { where: { id: string }; data: { lastUsedAt: Date } }) => Promise<unknown>;
    };
  };
  getCreditBalance: (organizationId: string) => Promise<number>;
}): void {
  if (authMiddlewareMounted) return;
  aiGatewayRoutes.use("*", createGatewayAuthMiddleware(deps));
  authMiddlewareMounted = true;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  stream: z.boolean().optional().default(false),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

// ── Routes ───────────────────────────────────────────────────────────────────

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
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    402: {
      description: "Insufficient credit balance",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
    429: {
      description: "Rate limit exceeded",
      content: {
        "application/json": { schema: ErrorResponseSchema },
      },
    },
  },
});

aiGatewayRoutes.openapi(chatCompletionsRoute, async (c) => {
  const apiKey = c.get("resolvedApiKey");
  const requestId = c.get("gatewayRequestId");
  const body = c.req.valid("json");

  log.info("Gateway chat request", {
    requestId,
    orgId: apiKey.organizationId,
    model: body.model,
  });

  // Phase 1: proxy to OpenAI directly as proof of concept
  // Phase 2 will replace this with full provider routing + usage extraction
  const upstreamUrl = "https://api.openai.com/v1/chat/completions";
  const upstreamResponse = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: body.stream,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    }),
  });

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    log.error("Upstream error", {
      status: upstreamResponse.status,
      error: errorText,
      requestId,
    });
    return c.json({ error: "Upstream API error" }, upstreamResponse.status as 500);
  }

  // Non-streaming: return JSON directly
  if (!body.stream) {
    const json = await upstreamResponse.json();
    return c.json(json);
  }

  // Streaming: relay SSE passthrough
  return new Response(upstreamResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
