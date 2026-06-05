/**
 * /api/v1/workflows — tenant workflow run triggers.
 *
 * Two run modes, both tenant-scoped (requireAuth) and refused for a workflow the
 * caller's tenant does not own:
 *  - POST /:id/run        — DURABLE. Enqueues `nebutra/workflow.run.requested`;
 *    the Inngest workflowRunner executes it in the background + persists a
 *    WorkflowRun. Survives disconnects; returns a runId.
 *  - POST /:id/run-stream — INLINE. Runs the workflow in this request and streams
 *    its events (phase/log/agent_start/agent_finish) over SSE as they happen,
 *    then finalizes the WorkflowRun. For interactive previews; ephemeral.
 */

import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getWorkflowRepository, getWorkflowRunRepository } from "@nebutra/repositories";
import { streamSSE } from "hono/streaming";
import { inngest } from "../../inngest/client.js";
import { runWorkflowDefinition } from "../../lib/workflow-execute.js";
import { requireAuth } from "../../middlewares/tenantContext.js";

export const workflowRoutes = new OpenAPIHono();

workflowRoutes.use("*", requireAuth);

const runRoute = createRoute({
  method: "post",
  path: "/{id}/run",
  tags: ["Workflows"],
  operationId: "runWorkflow",
  summary: "Enqueue a workflow run",
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z.object({ args: z.record(z.string(), z.unknown()).optional() }),
        },
      },
    },
  },
  responses: {
    202: { description: "Run enqueued" },
    401: { description: "Unauthenticated / no organization scope" },
    404: { description: "Workflow not found" },
  },
});

workflowRoutes.openapi(runRoute, async (c) => {
  const tenant = c.get("tenant") as { organizationId?: string; userId?: string };
  const tenantId = tenant.organizationId;
  if (!tenantId) return c.json({ error: "organization scope required" }, 401);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Ownership check before enqueue — never leak another tenant's workflow id.
  const def = await getWorkflowRepository(tenantId).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);

  const requestedAt = new Date().toISOString();
  await inngest.send({
    name: "nebutra/workflow.run.requested",
    data: {
      tenantId,
      workflowId: id,
      requestedAt,
      args: body?.args ?? {},
      triggeredBy: "manual",
    },
  });

  return c.json({ enqueued: true, workflowId: id, requestedAt }, 202);
});

const runStreamRoute = createRoute({
  method: "post",
  path: "/{id}/run-stream",
  tags: ["Workflows"],
  operationId: "runWorkflowStream",
  summary: "Run a workflow inline and stream its events (SSE)",
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z.object({ args: z.record(z.string(), z.unknown()).optional() }),
        },
      },
    },
  },
  responses: {
    200: { description: "SSE stream of workflow events" },
    401: { description: "Unauthenticated / no organization scope" },
    404: { description: "Workflow not found" },
  },
});

workflowRoutes.openapi(runStreamRoute, async (c) => {
  const tenant = c.get("tenant") as { organizationId?: string; userId?: string };
  const tenantId = tenant.organizationId;
  if (!tenantId) return c.json({ error: "organization scope required" }, 401);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const args = body?.args ?? {};

  const def = await getWorkflowRepository(tenantId).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);

  return streamSSE(c, async (stream) => {
    const runRepo = getWorkflowRunRepository(tenantId);
    const threadId = randomUUID();
    const requestedAt = new Date().toISOString();
    const run = await runRepo.start({
      workflowId: id,
      threadId,
      idempotencyKey: `${id}::stream::${requestedAt}`,
      args,
      triggeredBy: "stream",
    });
    await stream.writeSSE({ event: "run_started", data: JSON.stringify({ runId: run.id }) });

    const outcome = await runWorkflowDefinition({
      tenantId,
      threadId,
      defaultModel: def.defaultModel,
      scriptSource: def.scriptSource,
      args,
      limits: {
        maxConcurrency: def.maxConcurrency,
        maxAgentsPerRun: def.maxAgentsPerRun,
        maxRetries: def.maxRetries,
        timeoutMs: def.timeoutMs,
      },
      // Hono serializes writes to the single SSE stream, preserving order.
      onEvent: (event) => {
        void stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
      },
    });

    await runRepo.finish(run.id, {
      status: outcome.ok ? "SUCCEEDED" : "FAILED",
      result: outcome.returnValue,
      error: outcome.error ?? null,
      events: [...outcome.events],
      stats: { agentCalls: outcome.agentCalls },
      tokenUsage: { ...outcome.usage },
    });

    await stream.writeSSE({
      event: outcome.ok ? "done" : "error",
      data: JSON.stringify({
        runId: run.id,
        ok: outcome.ok,
        returnValue: outcome.returnValue,
        ...(outcome.error ? { error: outcome.error } : {}),
        usage: outcome.usage,
        agentCalls: outcome.agentCalls,
      }),
    });
  });
});
