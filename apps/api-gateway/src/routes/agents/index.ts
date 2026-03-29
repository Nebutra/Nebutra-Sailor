/**
 * /api/v1/agents — Agent orchestration routes
 *
 * Provides chat, agent listing, and conversation management endpoints.
 * All routes require authentication (tenantContextMiddleware applied upstream).
 *
 * If @nebutra/agents orchestrator is not configured, returns 503.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AgentConfig, AgentResponse } from "@nebutra/agents";
import { AgentOrchestrator, clearMemory, createAgentContext, getMemory } from "@nebutra/agents";
import { logger } from "@nebutra/logger";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { DEFAULT_AGENTS } from "../../agents/default-agents.js";
import { requireAuth } from "../../middlewares/tenantContext.js";

const tracer = trace.getTracer("api-gateway.agents");

export const agentRoutes = new OpenAPIHono();

// Apply auth guard to all agent routes
agentRoutes.use("*", requireAuth);

// ── Lazy orchestrator singleton ──────────────────────────────────────────────

let orchestrator: AgentOrchestrator | null = null;
let initAttempted = false;

/**
 * Lazily create the AgentOrchestrator from DEFAULT_AGENTS.
 * Returns null when agents cannot be configured (e.g. missing provider config).
 */
function getOrCreateOrchestrator(): AgentOrchestrator | null {
  if (orchestrator) return orchestrator;
  if (initAttempted) return null;

  initAttempted = true;

  try {
    // Convert DefaultAgentConfig (string tools) to AgentConfig (AgentTool[])
    // Tool resolution is deferred — agents with string tool references will
    // use BaseAgent (no-op execute). Callers should register concrete agents
    // via orchestrator.registerAgent() for production use.
    const agentConfigs: AgentConfig[] = DEFAULT_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      instructions: a.instructions,
      maxSteps: a.maxSteps,
      memory: a.memory,
      // Tools are referenced by name — resolved when a concrete provider adapter
      // is registered. BaseAgent's execute() throws until a provider is attached.
    }));

    orchestrator = new AgentOrchestrator({
      agents: agentConfigs,
      defaultAgentId: "assistant",
    });

    logger.info("Agent orchestrator initialized", {
      agentCount: agentConfigs.length,
    });

    return orchestrator;
  } catch (err) {
    logger.warn("Failed to initialize agent orchestrator", { error: err });
    return null;
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const ChatRequestSchema = z.object({
  agentId: z.string().optional(),
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  stream: z.boolean().default(false),
});

const ChatResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string(),
  agentId: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
});

const AgentListResponseSchema = z.object({
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
});

const ConversationListResponseSchema = z.object({
  conversations: z.array(
    z.object({
      id: z.string(),
      agentId: z.string(),
      title: z.string().optional(),
      lastMessage: z.string().optional(),
      updatedAt: z.string(),
    }),
  ),
});

const ErrorSchema = z.object({
  error: z.string(),
});

// ── Helper: extract last assistant text from AgentResponse ───────────────────

function extractResponseText(result: AgentResponse): string {
  const assistantMessages = result.messages.filter((m) => m.role === "assistant");
  const last = assistantMessages[assistantMessages.length - 1];
  return last?.content ?? "";
}

// ── POST /chat — Send a message to an agent ──────────────────────────────────

const chatRoute = createRoute({
  method: "post",
  path: "/chat",
  tags: ["Agents"],
  summary: "Chat with an AI agent",
  request: {
    body: {
      content: {
        "application/json": { schema: ChatRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Agent response",
      content: {
        "application/json": { schema: ChatResponseSchema },
      },
    },
    503: {
      description: "Agent service not configured",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

agentRoutes.openapi(chatRoute, async (c) => {
  const orch = getOrCreateOrchestrator();
  if (!orch) {
    return c.json({ error: "Agent service not configured" }, 503);
  }

  const tenant = c.get("tenant");
  const body = c.req.valid("json");
  const agentId = body.agentId ?? "assistant";

  return tracer.startActiveSpan("agents.chat", async (span) => {
    span.setAttributes({
      "agent.id": agentId,
      "agent.stream": body.stream,
      "tenant.id": tenant.organizationId ?? "anonymous",
    });

    try {
      const ctx = createAgentContext(
        tenant.organizationId ?? "anonymous",
        tenant.userId ?? "anonymous",
        body.conversationId,
      );

      // The orchestrator routes to the best agent (or uses the specified agentId).
      // If a specific agentId is requested, include it in metadata for context.
      const result = await orch.chat(body.message, {
        ...ctx,
        metadata: { requestedAgentId: agentId },
      });

      span.setStatus({ code: SpanStatusCode.OK });

      return c.json(
        {
          response: extractResponseText(result),
          conversationId: ctx.conversationId,
          agentId: result.agentId,
          usage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          },
        },
        200,
      );
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      logger.error("Agent chat failed", err, {
        agentId,
        tenantId: tenant.organizationId,
      });
      return c.json({ error: "Agent execution failed" }, 503);
    } finally {
      span.end();
    }
  });
});

// ── GET / — List available agents ────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Agents"],
  summary: "List available agents for the current tenant",
  responses: {
    200: {
      description: "Agent list",
      content: {
        "application/json": { schema: AgentListResponseSchema },
      },
    },
  },
});

agentRoutes.openapi(listRoute, async (c) => {
  const agents = DEFAULT_AGENTS.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));

  return c.json({ agents }, 200);
});

// ── GET /conversations — List conversations ──────────────────────────────────

const conversationsRoute = createRoute({
  method: "get",
  path: "/conversations",
  tags: ["Agents"],
  summary: "List agent conversations for current user",
  responses: {
    200: {
      description: "Conversation list",
      content: {
        "application/json": { schema: ConversationListResponseSchema },
      },
    },
    503: {
      description: "Agent service not configured",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

agentRoutes.openapi(conversationsRoute, async (c) => {
  const tenant = c.get("tenant");
  const tenantId = tenant.organizationId ?? "anonymous";
  const userId = tenant.userId ?? "anonymous";

  try {
    // Query Redis for conversation keys matching the tenant/user pattern.
    // Memory keys follow: agent:memory:{tenantId}:{conversationId}
    // For now, return conversations from memory if available.
    let redis: Awaited<ReturnType<typeof import("@nebutra/cache").getRedis>> | null = null;
    try {
      const { getRedis } = await import("@nebutra/cache");
      redis = getRedis();
    } catch {
      // Redis unavailable
    }

    if (!redis) {
      return c.json({ conversations: [] }, 200);
    }

    // Scan for conversation keys belonging to this tenant
    const pattern = `agent:memory:${tenantId}:*`;
    const keys: string[] = [];

    // Use scan to find matching keys (non-blocking)
    let cursor = "0";
    do {
      const [nextCursor, batch] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = String(nextCursor);
      keys.push(...(batch as string[]));
    } while (cursor !== "0");

    // Build conversation summaries from stored memories
    const conversations = await Promise.all(
      keys.map(async (key) => {
        const conversationId = key.replace(`agent:memory:${tenantId}:`, "");
        const messages = await getMemory(tenantId, conversationId);
        const lastMsg = messages[messages.length - 1];
        const firstUserMsg = messages.find((m) => m.role === "user");

        return {
          id: conversationId,
          agentId: "assistant", // Default; could be stored in metadata
          title: firstUserMsg?.content.slice(0, 100),
          lastMessage: lastMsg?.content.slice(0, 200),
          updatedAt: lastMsg?.timestamp.toISOString() ?? new Date().toISOString(),
        };
      }),
    );

    return c.json({ conversations }, 200);
  } catch (err) {
    logger.error("Failed to list conversations", err, {
      tenantId,
      userId,
    });
    return c.json({ error: "Failed to list conversations" }, 503);
  }
});

// ── DELETE /conversations/:id — Delete a conversation ────────────────────────

const deleteConversationRoute = createRoute({
  method: "delete",
  path: "/conversations/{id}",
  tags: ["Agents"],
  summary: "Delete an agent conversation",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Conversation deleted",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    503: {
      description: "Agent service not configured",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

agentRoutes.openapi(deleteConversationRoute, async (c) => {
  const tenant = c.get("tenant");
  const { id: conversationId } = c.req.valid("param");
  const tenantId = tenant.organizationId ?? "anonymous";

  try {
    await clearMemory(tenantId, conversationId);
    return c.json({ success: true }, 200);
  } catch (err) {
    logger.error("Failed to delete conversation", err, {
      tenantId,
      conversationId,
    });
    return c.json({ error: "Failed to delete conversation" }, 503);
  }
});
