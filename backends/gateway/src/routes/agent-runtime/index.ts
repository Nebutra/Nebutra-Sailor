/**
 * /api/v1/agent-runtime — live wiring of @nebutra/agent-runtime.
 *
 * Connects the absorbed runtime grammar into the gateway: a tenant-scoped
 * turn driven by `runTurn`, streamed to the client over SSE. Gated by the
 * off-by-default `agent-runtime-demo` feature flag and `requireAuth`.
 *
 * Honest scope:
 *  - ModelInvoker is a thin bridge over `@nebutra/agents` (real model stack;
 *    no provider re-port).
 *  - ApprovalGate is fail-closed (auto-denies prompts) — human-in-the-loop
 *    transport is future work; unapproved tools are never dispatched.
 *  - No command-exec tool is registered here yet, so the external-sandbox
 *    seam has nothing to delegate; it is wired the moment such a tool is
 *    added (`createHttpSandbox(AGENT_SANDBOX_URL)`), not before.
 *  - RolloutStore is process-local `InMemoryRolloutStore`. The durable
 *    tenant-scoped store needs a DB model (infra change) and is deliberately
 *    deferred — not faked. Use `PersistentRolloutStore` + a real port adapter
 *    once that lands.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  InMemoryRolloutStore,
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runTurn,
  ToolRegistry,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import type { AgentConfig, AgentResponse } from "@nebutra/agents";
import { AgentOrchestrator, createAgentContext } from "@nebutra/agents";
import { getTenantDb } from "@nebutra/db";
import { FLAGS, featureFlagMiddleware } from "@nebutra/feature-flags";
import { logger } from "@nebutra/logger";
import { streamSSE } from "hono/streaming";
import { DEFAULT_AGENTS } from "../../agents/default-agents.js";
import { requireAuth } from "../../middlewares/tenantContext.js";

export const agentRuntimeRoutes = new OpenAPIHono();

agentRuntimeRoutes.use("*", requireAuth);
agentRuntimeRoutes.use("*", featureFlagMiddleware(FLAGS.AGENT_RUNTIME_DEMO));

// ── Lazy singletons ──────────────────────────────────────────────────────────

let orchestrator: AgentOrchestrator | null = null;
let initAttempted = false;

function getOrchestrator(): AgentOrchestrator | null {
  if (orchestrator) return orchestrator;
  if (initAttempted) return null;
  initAttempted = true;
  try {
    // DefaultAgentConfig has string tool refs; AgentConfig expects AgentTool[].
    // Drop tools (resolved when a concrete provider adapter is registered),
    // mirroring the existing /api/v1/agents route.
    const agents: AgentConfig[] = DEFAULT_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      instructions: a.instructions,
      maxSteps: a.maxSteps,
      memory: a.memory,
    }));
    orchestrator = new AgentOrchestrator({ agents, defaultAgentId: "assistant" });
  } catch (err) {
    logger.warn("agent-runtime: orchestrator unavailable", { error: err });
    orchestrator = null;
  }
  return orchestrator;
}

/**
 * Rollout store selector. Default = process-local in-memory. The durable
 * Postgres system-of-record is opt-in via `AGENT_ROLLOUT_DURABLE=1` and
 * requires the migration applied + Prisma client regenerated (see ADR
 * 2026-05-19). The cast bridges the not-yet-regenerated client without
 * faking durability: when off, durability is simply not claimed.
 */
function rolloutStore(): RolloutStore {
  if (process.env.AGENT_ROLLOUT_DURABLE !== "1") {
    return new InMemoryRolloutStore();
  }
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

/** Thin bridge: one round = the orchestrator's reply as a single text item. */
function modelInvoker(
  orch: AgentOrchestrator,
  input: string,
  tenantId: string,
  userId: string,
  conversationId: string,
): ModelInvoker {
  return {
    async invoke() {
      const response: AgentResponse = await orch.chat(
        input,
        createAgentContext(tenantId, userId, conversationId),
      );
      const last = response.messages.at(-1);
      return {
        emissions: [{ kind: "text", text: last?.content ?? "" }],
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
        },
      };
    },
  };
}

// ── Route: start a turn, stream events over SSE ──────────────────────────────

const turnRoute = createRoute({
  method: "post",
  path: "/turns",
  tags: ["Agent Runtime"],
  operationId: "createAgentRuntimeTurn",
  summary: "Run an agent runtime turn",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            input: z.string().min(1),
            threadId: z.string().min(1),
            model: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "SSE stream of thread events" },
    401: { description: "Unauthenticated" },
    403: { description: "Feature disabled" },
    503: { description: "Model stack unavailable" },
  },
});

agentRuntimeRoutes.openapi(turnRoute, async (c) => {
  const orch = getOrchestrator();
  if (!orch) return c.json({ error: "model stack unavailable" }, 503);

  const tenant = c.get("tenant") as {
    organizationId?: string;
    userId?: string;
    plan?: string;
  };
  const tenantId = tenant.organizationId;
  if (!tenantId) return c.json({ error: "organization scope required" }, 401);

  const body = c.req.valid("json");
  const config: TurnConfig = {
    model: body.model ?? "flagship",
    provider: "gateway",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  };

  return streamSSE(c, async (stream) => {
    const events = runTurn(body.input, {
      tenantId,
      threadId: body.threadId,
      config,
      approvalPolicy: { kind: "on_request" },
      model: modelInvoker(orch, body.input, tenantId, tenant.userId ?? "anonymous", body.threadId),
      tools: new ToolRegistry(),
      store: rolloutStore(),
      approvalGate: {
        async request() {
          return { kind: "denied" };
        },
      },
    });
    for await (const event of events) {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
    }
  });
});
