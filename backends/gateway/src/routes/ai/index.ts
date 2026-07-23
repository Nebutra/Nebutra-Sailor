/**
 * /api/v1/ai — AI service proxy routes
 *
 * Proxies requests to the internal AI microservice.
 * All routes require authentication (tenantContextMiddleware applied upstream).
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { listModels } from "@nebutra/ai-providers/catalog";
import { toApiError } from "@nebutra/errors";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middlewares/tenantContext.js";
import { aiServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";
import { buildAiOriginHeaders, resolveAiOriginClientIp } from "./origin-headers.js";

const tracer = trace.getTracer("api-gateway.ai");

export const aiRoutes = new OpenAPIHono();
aiRoutes.use("*", requireAuth);

// ── Schemas ───────────────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(32_000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  // models.dev / OpenRouter frontier default (not gpt-4 / gpt-4o era)
  model: z.string().default("gpt-5.5"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(16_384).optional(),
  stream: z.boolean().default(false),
});

const EmbedRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().default("text-embedding-3-small"),
});

async function proxyToAiService(
  path: string,
  method: string,
  body: unknown,
  context: {
    tenantId: string;
    requestId?: string | null | undefined;
    clientIp?: string | null | undefined;
  },
): Promise<Response> {
  const url = `${env.AI_SERVICE_URL}${path}`;
  return aiServiceBreaker.call(() =>
    fetch(url, {
      method,
      headers: buildAiOriginHeaders(context),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000), // 2-min timeout for long generations
    }),
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────

const chatRoute = createRoute({
  method: "post",
  path: "/chat",
  tags: ["AI"],
  summary: "Chat completion",
  request: { body: { content: { "application/json": { schema: ChatRequestSchema } } } },
  responses: {
    200: { description: "Chat completion response" },
    402: { description: "Quota exceeded" },
    503: { description: "AI service unavailable" },
  },
});

aiRoutes.openapi(chatRoute, async (c) => {
  const tenant = c.get("tenant");
  const body = c.req.valid("json");

  return tracer.startActiveSpan("ai.chat", async (span) => {
    span.setAttributes({
      "ai.model": body.model,
      "ai.message_count": body.messages.length,
      "ai.stream": body.stream,
      "tenant.id": tenant?.organizationId ?? "anonymous",
    });

    try {
      const upstream = await proxyToAiService("/v1/chat/completions", "POST", body, {
        tenantId: tenant?.organizationId ?? "anonymous",
        requestId: c.get("requestId"),
        clientIp: resolveAiOriginClientIp(c.req.raw.headers),
      });

      span.setAttributes({ "http.upstream_status": upstream.status });
      span.setStatus({ code: upstream.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      const data = await upstream.json();
      return c.json(data, upstream.status as Parameters<typeof c.json>[1]);
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      if (err instanceof CircuitOpenError) {
        return c.json({ error: "AI service temporarily unavailable — circuit open" }, 503);
      }
      const apiError = toApiError(err);
      return c.json({ error: apiError.error.message }, 503);
    } finally {
      span.end();
    }
  });
});

const embedRoute = createRoute({
  method: "post",
  path: "/embeddings",
  tags: ["AI"],
  summary: "Generate text embeddings",
  request: { body: { content: { "application/json": { schema: EmbedRequestSchema } } } },
  responses: {
    200: { description: "Embeddings response" },
    503: { description: "AI service unavailable" },
  },
});

aiRoutes.openapi(embedRoute, async (c) => {
  const tenant = c.get("tenant");
  const body = c.req.valid("json");

  return tracer.startActiveSpan("ai.embeddings", async (span) => {
    span.setAttributes({
      "ai.model": body.model,
      "ai.input_type": Array.isArray(body.input) ? "batch" : "single",
      "tenant.id": tenant?.organizationId ?? "anonymous",
    });

    try {
      const upstream = await proxyToAiService("/v1/embeddings", "POST", body, {
        tenantId: tenant?.organizationId ?? "anonymous",
        requestId: c.get("requestId"),
        clientIp: resolveAiOriginClientIp(c.req.raw.headers),
      });

      span.setAttributes({ "http.upstream_status": upstream.status });
      span.setStatus({ code: upstream.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
      const data = await upstream.json();
      return c.json(data, upstream.status as Parameters<typeof c.json>[1]);
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      if (err instanceof CircuitOpenError) {
        return c.json({ error: "AI service temporarily unavailable — circuit open" }, 503);
      }
      const apiError = toApiError(err);
      return c.json({ error: apiError.error.message }, 503);
    } finally {
      span.end();
    }
  });
});

const modelsRoute = createRoute({
  method: "get",
  path: "/models",
  tags: ["AI"],
  summary: "List available AI models",
  responses: {
    200: { description: "Available models list" },
  },
});

aiRoutes.openapi(modelsRoute, async (c) => {
  // Sourced from the models.dev-backed catalog (single registry), not a
  // hand-maintained list. Cached; a catalog outage yields the last good set.
  const models = (await listModels()).map((m) => {
    const capabilities = ["chat"];
    if (m.capabilities.vision) capabilities.push("vision");
    if (m.capabilities.toolCall) capabilities.push("tools");
    if (m.capabilities.reasoning) capabilities.push("reasoning");
    return {
      id: m.id,
      name: m.name,
      provider: m.rawProvider,
      contextWindow: m.contextWindow ?? null,
      maxOutput: m.maxOutput ?? null,
      pricing: m.pricing ?? null,
      capabilities,
    };
  });
  return c.json({ models, total: models.length });
});
