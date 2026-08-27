/**
 * /api/v1/agent-runtime — live wiring of @nebutra/agent-runtime.
 *
 * Connects the absorbed runtime grammar into the gateway: a tenant-scoped
 * turn driven by `runTurn`, streamed to the client over SSE. Gated by the
 * off-by-default `agent-runtime-demo` feature flag and `requireAuth`
 * (enable with FEATURE_FLAG_AGENT_RUNTIME_DEMO=true or KILL_SWITCH_…).
 *
 * Track B (Carina):
 *  - `createGatewayCarinaBundle({ tenantId, threadId })` for socket co-deploy
 *    (default) or CARINA_JSONRPC_URL
 *  - `GET  /carina/status`     connectivity probe (auth; no demo flag)
 *  - `POST /carina/approvals`  governance.approval.resolve bridge (auth)
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  InMemoryRolloutStore,
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runTurn,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import type { AgentResponse } from "@nebutra/agents";
import { type AgentOrchestrator, createAgentContext } from "@nebutra/agents";
import { getTenantDb } from "@nebutra/db";
import { FLAGS, featureFlagMiddleware } from "@nebutra/feature-flags";
import { streamSSE } from "hono/streaming";
import { getGatewayOrchestrator } from "../../agents/orchestrator-singleton.js";
import { createGatewayCarinaBundle, getCarinaSandbox } from "../../lib/carina-sandbox.js";
import { requireAuth } from "../../middlewares/tenantContext.js";

export const agentRuntimeRoutes = new OpenAPIHono();

agentRuntimeRoutes.use("*", requireAuth);
// Demo flag only for turns — carina/status + approvals stay operator-reachable.
agentRuntimeRoutes.use("/turns", featureFlagMiddleware(FLAGS.AGENT_RUNTIME_DEMO));

/**
 * Rollout store selector. Default = process-local in-memory. The durable
 * Postgres system-of-record is opt-in via `AGENT_ROLLOUT_DURABLE=1`.
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

function tenantFrom(c: { get: (k: string) => unknown }): {
  organizationId?: string;
  userId?: string;
} {
  return c.get("tenant") as { organizationId?: string; userId?: string };
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

// ── Carina ops (auth only — no demo flag so operators can probe) ─────────────

const carinaStatusRoute = createRoute({
  method: "get",
  path: "/carina/status",
  tags: ["Agent Runtime"],
  operationId: "getCarinaStatus",
  summary: "Probe Carina Track-B connectivity",
  responses: {
    200: {
      description: "Carina configuration + optional hello probe",
      content: {
        "application/json": {
          schema: z.object({
            enabled: z.boolean(),
            workspaceConfigured: z.boolean(),
            autoApprove: z.boolean(),
            protocolVersion: z.number().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
    401: { description: "Unauthenticated" },
  },
});

agentRuntimeRoutes.openapi(carinaStatusRoute, async (c) => {
  const env = process.env;
  // Co-deploy (unix socket) is the product default; HTTP URL is optional.
  // Do not gate on CARINA_JSONRPC_URL alone — that leaves socket hosts as enabled:false.
  const sandbox = getCarinaSandbox(env);
  const workspaceConfigured = Boolean(
    env.CARINA_WORKSPACE_ROOT?.trim() ||
      env.CARINA_WORKSPACE_TEMPLATE?.trim() ||
      env.CARINA_WORKSPACE_MAP?.trim(),
  );
  const autoApprove = env.CARINA_AUTO_APPROVE === "1" || env.CARINA_AUTO_APPROVE === "true";

  if (!sandbox) {
    return c.json({ enabled: false, workspaceConfigured, autoApprove });
  }

  try {
    const probe = await sandbox.probe();
    return c.json({
      enabled: true,
      workspaceConfigured,
      autoApprove,
      protocolVersion: probe.protocolVersion,
    });
  } catch (err) {
    return c.json({
      enabled: true,
      workspaceConfigured,
      autoApprove,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

const carinaApprovalRoute = createRoute({
  method: "post",
  path: "/carina/approvals",
  tags: ["Agent Runtime"],
  operationId: "resolveCarinaApproval",
  summary: "Approve or deny a Carina governance decision",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            decisionId: z.string().min(1),
            approve: z.boolean(),
            scope: z.enum(["once", "session", "project"]).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Carina resolve result",
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean(),
            result: z.unknown().optional(),
            error: z.string().optional(),
          }),
        },
      },
    },
    401: { description: "Unauthenticated" },
    503: { description: "Carina not configured" },
  },
});

agentRuntimeRoutes.openapi(carinaApprovalRoute, async (c) => {
  const sandbox = getCarinaSandbox();
  if (!sandbox) {
    return c.json(
      {
        ok: false,
        error: "Carina not configured (set co-deploy socket or CARINA_JSONRPC_URL)",
      },
      503,
    );
  }
  const tenant = tenantFrom(c);
  const body = c.req.valid("json");
  try {
    const result = await sandbox.resolveApproval({
      decisionId: body.decisionId,
      approve: body.approve,
      approver: tenant.userId ?? tenant.organizationId ?? "gateway",
      ...(body.scope ? { scope: body.scope } : {}),
    });
    return c.json({ ok: true, result });
  } catch (err) {
    return c.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

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
    200: {
      description: "SSE stream of thread events",
      content: {
        "text/event-stream": {
          schema: z.string().openapi({
            description: "Server-Sent Events payload (thread event frames)",
          }),
        },
      },
    },
    401: { description: "Unauthenticated" },
    403: { description: "Feature disabled" },
    503: { description: "Model stack unavailable" },
  },
});

agentRuntimeRoutes.openapi(turnRoute, async (c) => {
  const orch = getGatewayOrchestrator();
  if (!orch) return c.json({ error: "model stack unavailable" }, 503);

  const tenant = tenantFrom(c);
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
    const { tools } = createGatewayCarinaBundle(process.env, {
      tenantId,
      threadId: body.threadId,
    });
    const events = runTurn(body.input, {
      tenantId,
      threadId: body.threadId,
      config,
      approvalPolicy: { kind: "on_request" },
      model: modelInvoker(orch, body.input, tenantId, tenant.userId ?? "anonymous", body.threadId),
      tools,
      store: rolloutStore(),
      approvalGate: {
        async request() {
          // Product HITL UI not shipped; deny Sailor-side prompts. Carina
          // kernel approvals use POST /carina/approvals or CARINA_AUTO_APPROVE.
          return { kind: "denied" };
        },
      },
    });
    for await (const event of events) {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
    }
  });
});
