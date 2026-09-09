/**
 * /api/v1/para/agent — threads, runs and approvals.
 *
 * Every piece of agent state here is server-owned. Starting a turn inserts a run and returns; a
 * background worker advances it. The event stream is a read-only projection of the persisted
 * rollout, so a browser can attach, drop and reattach — from another device — without changing
 * what the run does. Nothing in this file lets a client drive a turn.
 *
 * Contract: docs/product-intelligence/agent.md.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  PersistentRolloutStore,
  type RolloutLine,
  type RolloutStore,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import { getTenantDb } from "@nebutra/db";
import { toApiError } from "@nebutra/errors";
import { getQueue } from "@nebutra/queue";
import {
  ApprovalAlreadyDecidedError,
  getParaAgentRepository,
  getParaWorkspaceRepository,
} from "@nebutra/repositories";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { createParaToolRegistry, estimateToolCost } from "../../lib/para-agent-tools.js";
import { enqueueParaAgentRun } from "../../lib/para-agent-worker.js";
import { OriginRejectedError } from "../../lib/para-origin.js";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";
import { resolveAiOriginClientIp } from "../ai/origin-headers.js";

export const paraAgentRoutes = new OpenAPIHono();
paraAgentRoutes.use("*", requireAuth, requireOrganization);

const orgId = (c: Context): string => c.get("tenant").organizationId as string;
const errorBody = (err: unknown) => ({ error: toApiError(err).error.message });

function originIdentity(c: Context) {
  const tenant = c.get("tenant");
  return {
    tenantId: tenant.organizationId as string,
    userId: tenant.userId,
    role: tenant.role,
    plan: tenant.plan,
    requestId: c.get("requestId"),
    clientIp: resolveAiOriginClientIp(c.req.raw.headers),
  };
}

/** The caller's identity, carried on the job so the worker can sign origin calls as them. */
function runIdentity(c: Context): { userId?: string; role?: string; plan?: string } {
  const tenant = c.get("tenant");
  return {
    ...(tenant.userId ? { userId: tenant.userId as string } : {}),
    ...(tenant.role ? { role: tenant.role as string } : {}),
    ...(tenant.plan ? { plan: tenant.plan as string } : {}),
  };
}

function rolloutStore(): RolloutStore {
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() });
const IdParam = z.object({ id: z.string().min(1).max(64) });
const AutonomySchema = z.enum(["ask", "act"]);
const RunStatusSchema = z.enum(["queued", "running", "awaiting_approval", "completed", "failed"]);

const ThreadSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  autonomy: AutonomySchema,
  updatedAt: z.string(),
});

const ApprovalSchema = z.object({
  id: z.string(),
  runId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
  estimatedCost: z.number().int(),
  status: z.enum(["pending", "approved", "denied"]),
  resultJobId: z.string().nullable(),
  createdAt: z.string(),
});

const RunSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  workspaceId: z.string(),
  input: z.string(),
  status: RunStatusSchema,
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  pendingApprovals: z.array(ApprovalSchema).optional(),
});

const lower = <T extends string>(v: string): T => v.toLowerCase() as T;

function serializeThread(t: {
  id: string;
  projectId: string;
  title: string;
  autonomy: string;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    autonomy: lower<"ask" | "act">(t.autonomy),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function serializeApproval(a: {
  id: string;
  runId: string;
  toolName: string;
  args: unknown;
  estimatedCost: number;
  status: string;
  resultJobId: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    runId: a.runId,
    toolName: a.toolName,
    args: (a.args ?? {}) as Record<string, unknown>,
    estimatedCost: a.estimatedCost,
    status: lower<"pending" | "approved" | "denied">(a.status),
    resultJobId: a.resultJobId,
    createdAt: a.createdAt.toISOString(),
  };
}

function serializeRun(r: {
  id: string;
  threadId: string;
  workspaceId: string;
  input: string;
  status: string;
  error: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    threadId: r.threadId,
    workspaceId: r.workspaceId,
    input: r.input,
    status: lower<z.infer<typeof RunStatusSchema>>(r.status),
    error: (r.error ?? null) as { code: string; message: string } | null,
    startedAt: r.startedAt?.toISOString() ?? null,
    finishedAt: r.finishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

const TERMINAL = new Set(["completed", "failed"]);

// ── Threads ──────────────────────────────────────────────────────────────────

paraAgentRoutes.openapi(
  createRoute({
    method: "get",
    path: "/threads",
    tags: ["PARA Agent"],
    operationId: "paraListThreads",
    request: { query: z.object({ projectId: z.string().min(1).max(64) }) },
    responses: {
      200: {
        description: "Threads",
        content: { "application/json": { schema: z.object({ items: z.array(ThreadSchema) }) } },
      },
    },
  }),
  async (c) => {
    const { projectId } = c.req.valid("query");
    const items = await getParaAgentRepository(orgId(c)).listThreads(projectId);
    return c.json({ items: items.map(serializeThread) }, 200);
  },
);

paraAgentRoutes.openapi(
  createRoute({
    method: "post",
    path: "/threads",
    tags: ["PARA Agent"],
    operationId: "paraCreateThread",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              projectId: z.string().min(1).max(64),
              title: z.string().min(1).max(200),
            }),
          },
        },
      },
    },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: ThreadSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { projectId, title } = c.req.valid("json");
    const tenantId = orgId(c);
    if (!(await getParaWorkspaceRepository(tenantId).findProject(projectId))) {
      return c.json({ error: "project not found" }, 404);
    }
    const thread = await getParaAgentRepository(tenantId).createThread(projectId, title);
    return c.json(serializeThread(thread), 201);
  },
);

/** The autonomy switch: ask before acting, or act without asking (agent.md decision 9). */
paraAgentRoutes.openapi(
  createRoute({
    method: "patch",
    path: "/threads/{id}",
    tags: ["PARA Agent"],
    operationId: "paraSetThreadAutonomy",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: z.object({ autonomy: AutonomySchema }) } },
      },
    },
    responses: {
      200: { description: "Thread", content: { "application/json": { schema: ThreadSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { autonomy } = c.req.valid("json");
    const updated = await getParaAgentRepository(orgId(c)).setAutonomy(
      id,
      autonomy === "act" ? "ACT" : "ASK",
    );
    return updated
      ? c.json(serializeThread(updated), 200)
      : c.json({ error: "thread not found" }, 404);
  },
);

// ── Runs ─────────────────────────────────────────────────────────────────────

/**
 * Start a turn. This inserts a run and hands it to the worker — it does not execute anything, so
 * the response returns immediately and the caller may disconnect at once.
 */
paraAgentRoutes.openapi(
  createRoute({
    method: "post",
    path: "/threads/{id}/turns",
    tags: ["PARA Agent"],
    operationId: "paraStartTurn",
    request: {
      params: IdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({
              workspaceId: z.string().min(1).max(64),
              input: z.string().min(1).max(8000),
              contextNodeIds: z.array(z.string().max(64)).max(32).default([]),
            }),
          },
        },
      },
    },
    responses: {
      202: { description: "Run queued", content: { "application/json": { schema: RunSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const tenantId = orgId(c);
    const repo = getParaAgentRepository(tenantId);
    if (!(await repo.findThread(id))) return c.json({ error: "thread not found" }, 404);

    const run = await repo.createRun({
      threadId: id,
      workspaceId: body.workspaceId,
      input: body.input,
      contextNodeIds: body.contextNodeIds,
    });
    await enqueueParaAgentRun(await getQueue(), {
      tenantId,
      runId: run.id,
      ...runIdentity(c),
    });
    return c.json(serializeRun(run), 202);
  },
);

paraAgentRoutes.openapi(
  createRoute({
    method: "get",
    path: "/runs/{id}",
    tags: ["PARA Agent"],
    operationId: "paraGetRun",
    request: { params: IdParam },
    responses: {
      200: { description: "Run", content: { "application/json": { schema: RunSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const repo = getParaAgentRepository(orgId(c));
    const run = await repo.findRun(id);
    if (!run) return c.json({ error: "run not found" }, 404);
    const pending = await repo.listPendingApprovals(id);
    return c.json({ ...serializeRun(run), pendingApprovals: pending.map(serializeApproval) }, 200);
  },
);

/**
 * Replay the run's trace and then tail it. Purely a projection: it reads persisted rollout lines
 * and the run row, and writes nothing. Reconnecting replays from the beginning, which is what
 * makes the browser disposable.
 */
paraAgentRoutes.get("/runs/:id/events", async (c) => {
  const tenantId = orgId(c);
  const runId = c.req.param("id");
  const repo = getParaAgentRepository(tenantId);
  const run = await repo.findRun(runId);
  if (!run) return c.json({ error: "run not found" }, 404);

  const store = rolloutStore();
  return streamSSE(c, async (stream) => {
    let sent = 0;
    // Cap the tail so a stuck run cannot hold a connection forever; the client may reconnect.
    for (let tick = 0; tick < 600; tick++) {
      const lines: readonly RolloutLine[] = await store.read(tenantId, run.threadId);
      for (const line of lines.slice(sent)) {
        if (line.type === "event") {
          await stream.writeSSE({ event: "item", data: JSON.stringify(line.event) });
        }
      }
      sent = lines.length;

      const current = await repo.findRun(runId);
      if (!current) return;
      const pending = await repo.listPendingApprovals(runId);
      await stream.writeSSE({
        event: "run",
        data: JSON.stringify({
          ...serializeRun(current),
          pendingApprovals: pending.map(serializeApproval),
        }),
      });
      const status = current.status.toLowerCase();
      // Parked runs end the stream too: the next move is a human's, and it arrives as a new run event.
      if (TERMINAL.has(status) || status === "awaiting_approval") return;
      await stream.sleep(1000);
    }
  });
});

// ── Approvals ────────────────────────────────────────────────────────────────

/**
 * Decide a parked tool call. Approving executes it — creating the node and submitting the job —
 * and then re-sends the run event so the worker picks the run back up. Denying just closes it.
 */
paraAgentRoutes.openapi(
  createRoute({
    method: "post",
    path: "/approvals/{id}",
    tags: ["PARA Agent"],
    operationId: "paraDecideApproval",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: z.object({ approve: z.boolean() }) } } },
    },
    responses: {
      200: { description: "Approval", content: { "application/json": { schema: ApprovalSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      409: {
        description: "Already decided",
        content: { "application/json": { schema: ErrorSchema } },
      },
      502: {
        description: "Origin rejected",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { approve } = c.req.valid("json");
    const tenantId = orgId(c);
    const repo = getParaAgentRepository(tenantId);

    const approval = await repo.findApproval(id);
    if (!approval) return c.json({ error: "approval not found" }, 404);
    const run = await repo.findRun(approval.runId);
    if (!run) return c.json({ error: "run not found" }, 404);

    let decided: Awaited<ReturnType<typeof repo.decideApproval>>;
    try {
      decided = await repo.decideApproval(
        id,
        approve ? "APPROVED" : "DENIED",
        (c.get("tenant").userId as string | undefined) ?? tenantId,
      );
    } catch (err) {
      if (err instanceof ApprovalAlreadyDecidedError) {
        return c.json({ error: "approval has already been decided" }, 409);
      }
      throw err;
    }

    if (!approve) {
      await repo.finishRun(run.id, "COMPLETED");
      return c.json(serializeApproval(decided), 200);
    }

    const args = (decided.args ?? {}) as { prompt?: unknown; summary?: unknown };
    const prompt = String(args.prompt ?? args.summary ?? run.input).slice(0, 4000);
    const contextNodeIds = Array.isArray(run.contextNodeIds)
      ? (run.contextNodeIds as unknown[]).filter((v): v is string => typeof v === "string")
      : [];

    const tools = createParaToolRegistry({
      tenantId,
      workspaceId: run.workspaceId,
      origin: originIdentity(c),
      contextNodeIds,
    });

    try {
      const result = (await tools.dispatch(
        decided.toolName,
        { prompt },
        { tenantId, threadId: run.threadId },
      )) as { jobId?: string };
      if (result?.jobId) await repo.attachApprovalResult(decided.id, result.jobId);
    } catch (err) {
      if (err instanceof OriginRejectedError) {
        await repo.finishRun(run.id, "FAILED", { code: "origin_rejected", message: err.message });
        return c.json(errorBody(err), 502);
      }
      await repo.finishRun(run.id, "FAILED", {
        code: "approved_call_failed",
        message: err instanceof Error ? err.message : String(err),
      });
      return c.json(errorBody(err), 502);
    }

    // Hand the run back to the worker so the turn continues where it parked.
    await repo.requeueRun(run.id);
    await enqueueParaAgentRun(await getQueue(), {
      tenantId,
      runId: run.id,
      ...runIdentity(c),
    });

    const fresh = (await repo.findApproval(decided.id)) ?? decided;
    return c.json(serializeApproval(fresh), 200);
  },
);

export { estimateToolCost };
