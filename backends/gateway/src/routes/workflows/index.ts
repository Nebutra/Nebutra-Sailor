/**
 * /api/v1/workflows — tenant workflow definitions: CRUD + run triggers.
 *
 * Definitions:
 *  - GET    /            — list (cursor-paginated)
 *  - POST   /            — create
 *  - GET    /:id         — get one
 *  - PATCH  /:id         — update
 *  - DELETE /:id         — delete
 *  - GET    /:id/runs    — list this workflow's runs (cursor-paginated)
 * Execution:
 *  - POST   /:id/run        — DURABLE. Enqueues nebutra/workflow.run.requested;
 *    the Inngest workflowRunner runs it in the background + persists a WorkflowRun.
 *  - POST   /:id/run-stream — INLINE. Runs in-request and streams events
 *    (phase/log/agent_start/agent_finish) over SSE, then finalizes the run.
 *
 * Tenant-scoped (requireAuth + requireOrganization) and CASL-gated on the
 * `Workflow` resource (owner/admin): reads + runs need `read`, create/update/
 * delete need the matching action — aligned with the web workflow:* matrix.
 * `scriptSource` is untrusted JS — stored here, executed ONLY in the QuickJS
 * sandbox (workflow-runtime), never in this process.
 */

import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { WorkflowDefinition, WorkflowRun } from "@nebutra/db";
import { getStatusCode, toApiError } from "@nebutra/errors";
import {
  type CreateWorkflowData,
  getWorkflowRepository,
  getWorkflowRunRepository,
  type UpdateWorkflowData,
} from "@nebutra/repositories";
import { streamSSE } from "hono/streaming";
import { inngest } from "../../inngest/client.js";
import { runWorkflowDefinition } from "../../lib/workflow-execute.js";
import { requirePermission } from "../../middlewares/permissions.js";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const workflowRoutes = new OpenAPIHono();

workflowRoutes.use("*", requireAuth, requireOrganization);

/** Map the request to the CASL action it requires on the Workflow resource. */
function workflowAction(method: string, path: string): "read" | "create" | "update" | "delete" {
  if (method === "GET") return "read";
  if (method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  // POST: running a workflow reads its definition; a bare POST creates one.
  if (path.endsWith("/run") || path.endsWith("/run-stream")) return "read";
  return "create";
}

workflowRoutes.use("*", (c, next) =>
  requirePermission(workflowAction(c.req.method, c.req.path), "Workflow")(c, next),
);

const orgId = (c: { get: (k: "tenant") => { organizationId?: string } }): string =>
  c.get("tenant").organizationId as string;

function errorBody(err: unknown): { error: string } {
  return { error: toApiError(err).error.message };
}

/** Drop undefined-valued keys (and their `| undefined` types) for exactOptional targets. */
function compact<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  scriptSource: z.string().min(1).max(100_000),
  description: z.string().max(500).optional(),
  defaultModel: z.string().max(128).optional(),
  maxConcurrency: z.number().int().min(1).max(64).optional(),
  maxAgentsPerRun: z.number().int().min(1).max(10_000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(600_000).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

const IsoDateTimeSchema = z.string().datetime();
const JsonErrorSchema = z.object({ error: z.string() });
const SseStreamSchema = z.string().openapi({
  description: "Server-sent events stream; each event data field carries workflow event JSON.",
  example: 'event: run_started\ndata: {"runId":"run_1"}\n\n',
});
const WorkflowStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
const WorkflowRunStatusSchema = z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]);

const jsonErrorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: JsonErrorSchema } },
});

const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scriptSource: z.string(),
  status: WorkflowStatusSchema,
  defaultModel: z.string(),
  maxConcurrency: z.number().int(),
  maxAgentsPerRun: z.number().int(),
  maxRetries: z.number().int(),
  timeoutMs: z.number().int(),
  metadata: z.unknown(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

const WorkflowRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workflowId: z.string(),
  status: WorkflowRunStatusSchema,
  idempotencyKey: z.string(),
  threadId: z.string(),
  triggeredBy: z.string(),
  args: z.unknown(),
  result: z.unknown().nullable(),
  events: z.unknown(),
  error: z.string().nullable(),
  stats: z.unknown(),
  tokenUsage: z.unknown(),
  startedAt: IsoDateTimeSchema.nullable(),
  finishedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

const WorkflowPageSchema = z.object({
  items: z.array(WorkflowDefinitionSchema),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});

const WorkflowRunPageSchema = z.object({
  items: z.array(WorkflowRunSchema),
  nextCursor: z.string().nullable(),
  hasNextPage: z.boolean(),
});

const WorkflowDeletedSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});

type WorkflowDefinitionResponse = z.infer<typeof WorkflowDefinitionSchema>;
type WorkflowRunResponse = z.infer<typeof WorkflowRunSchema>;

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNullableIsoString(value: Date | string | null): string | null {
  if (!value) return null;
  return toIsoString(value);
}

function serializeWorkflowDefinition(row: WorkflowDefinition): WorkflowDefinitionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    scriptSource: row.scriptSource,
    status: row.status,
    defaultModel: row.defaultModel,
    maxConcurrency: row.maxConcurrency,
    maxAgentsPerRun: row.maxAgentsPerRun,
    maxRetries: row.maxRetries,
    timeoutMs: row.timeoutMs,
    metadata: row.metadata,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function serializeWorkflowRun(row: WorkflowRun): WorkflowRunResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workflowId: row.workflowId,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    threadId: row.threadId,
    triggeredBy: row.triggeredBy,
    args: row.args,
    result: row.result,
    events: row.events,
    error: row.error,
    stats: row.stats,
    tokenUsage: row.tokenUsage,
    startedAt: toNullableIsoString(row.startedAt),
    finishedAt: toNullableIsoString(row.finishedAt),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

// ── List ─────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Workflows"],
  operationId: "listWorkflows",
  summary: "List workflow definitions",
  request: { query: PaginationQuery },
  responses: {
    200: {
      description: "Cursor page of workflows",
      content: { "application/json": { schema: WorkflowPageSchema } },
    },
    500: jsonErrorResponse("Failed to list workflows"),
  },
});

workflowRoutes.openapi(listRoute, async (c) => {
  const { cursor, limit } = c.req.valid("query");
  try {
    const page = await getWorkflowRepository(orgId(c)).findPaginated(compact({ cursor, limit }));
    return c.json(
      {
        ...page,
        items: page.items.map(serializeWorkflowDefinition),
      },
      200,
    );
  } catch (err) {
    return c.json(errorBody(err), 500);
  }
});

// ── Create ─────────────────────────────────────────────────────────────────────

const createWorkflowRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Workflows"],
  operationId: "createWorkflow",
  summary: "Create a workflow definition",
  request: {
    body: { content: { "application/json": { schema: CreateWorkflowSchema } } },
  },
  responses: {
    201: {
      description: "Workflow created",
      content: { "application/json": { schema: WorkflowDefinitionSchema } },
    },
    400: jsonErrorResponse("Invalid request"),
    409: jsonErrorResponse("A workflow with this name already exists"),
    500: jsonErrorResponse("Failed to create workflow"),
  },
});

workflowRoutes.openapi(createWorkflowRoute, async (c) => {
  const body = c.req.valid("json");
  try {
    const created = await getWorkflowRepository(orgId(c)).create(
      compact(body) as CreateWorkflowData,
    );
    return c.json(serializeWorkflowDefinition(created), 201);
  } catch (err) {
    const status = getStatusCode(err);
    if (status === 400) return c.json(errorBody(err), 400);
    if (status === 409) return c.json(errorBody(err), 409);
    return c.json(errorBody(err), 500);
  }
});

// ── Get one ──────────────────────────────────────────────────────────────────

const getWorkflowRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Workflows"],
  operationId: "getWorkflow",
  summary: "Get a workflow definition",
  request: { params: z.object({ id: z.string().min(1) }) },
  responses: {
    200: {
      description: "Workflow definition",
      content: { "application/json": { schema: WorkflowDefinitionSchema } },
    },
    404: jsonErrorResponse("Workflow not found"),
  },
});

workflowRoutes.openapi(getWorkflowRoute, async (c) => {
  const { id } = c.req.valid("param");
  const def = await getWorkflowRepository(orgId(c)).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);
  return c.json(serializeWorkflowDefinition(def), 200);
});

// ── Update ───────────────────────────────────────────────────────────────────

const updateWorkflowRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Workflows"],
  operationId: "updateWorkflow",
  summary: "Update a workflow definition",
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: { content: { "application/json": { schema: UpdateWorkflowSchema } } },
  },
  responses: {
    200: {
      description: "Workflow updated",
      content: { "application/json": { schema: WorkflowDefinitionSchema } },
    },
    400: jsonErrorResponse("Invalid request"),
    404: jsonErrorResponse("Workflow not found"),
    500: jsonErrorResponse("Failed to update workflow"),
  },
});

workflowRoutes.openapi(updateWorkflowRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const repo = getWorkflowRepository(orgId(c));
  // Ownership check before mutating (repo.update is RLS-scoped, not by tenantId).
  const existing = await repo.findById(id);
  if (!existing) return c.json({ error: "workflow not found" }, 404);
  try {
    const updated = await repo.update(id, compact(body) as UpdateWorkflowData);
    return c.json(serializeWorkflowDefinition(updated), 200);
  } catch (err) {
    const status = getStatusCode(err);
    if (status === 400) return c.json(errorBody(err), 400);
    if (status === 404) return c.json(errorBody(err), 404);
    return c.json(errorBody(err), 500);
  }
});

// ── Delete ───────────────────────────────────────────────────────────────────

const deleteWorkflowRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Workflows"],
  operationId: "deleteWorkflow",
  summary: "Delete a workflow definition",
  request: { params: z.object({ id: z.string().min(1) }) },
  responses: {
    200: {
      description: "Workflow deleted",
      content: { "application/json": { schema: WorkflowDeletedSchema } },
    },
    404: jsonErrorResponse("Workflow not found"),
    500: jsonErrorResponse("Failed to delete workflow"),
  },
});

workflowRoutes.openapi(deleteWorkflowRoute, async (c) => {
  const { id } = c.req.valid("param");
  const repo = getWorkflowRepository(orgId(c));
  const existing = await repo.findById(id);
  if (!existing) return c.json({ error: "workflow not found" }, 404);
  try {
    await repo.delete(id);
    return c.json({ deleted: true, id }, 200);
  } catch (err) {
    if (getStatusCode(err) === 404) return c.json(errorBody(err), 404);
    return c.json(errorBody(err), 500);
  }
});

// ── List runs ────────────────────────────────────────────────────────────────

const listRunsRoute = createRoute({
  method: "get",
  path: "/{id}/runs",
  tags: ["Workflows"],
  operationId: "listWorkflowRuns",
  summary: "List a workflow's runs",
  request: {
    params: z.object({ id: z.string().min(1) }),
    query: PaginationQuery,
  },
  responses: {
    200: {
      description: "Cursor page of runs",
      content: { "application/json": { schema: WorkflowRunPageSchema } },
    },
    404: jsonErrorResponse("Workflow not found"),
  },
});

workflowRoutes.openapi(listRunsRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { cursor, limit } = c.req.valid("query");
  const def = await getWorkflowRepository(orgId(c)).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);
  const page = await getWorkflowRunRepository(orgId(c)).listForWorkflow(
    id,
    compact({ cursor, limit }),
  );
  return c.json(
    {
      ...page,
      items: page.items.map(serializeWorkflowRun),
    },
    200,
  );
});

// ── Run (durable, Inngest) ───────────────────────────────────────────────────

const runRoute = createRoute({
  method: "post",
  path: "/{id}/run",
  tags: ["Workflows"],
  operationId: "runWorkflow",
  summary: "Enqueue a durable workflow run",
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
    202: {
      description: "Run enqueued",
      content: {
        "application/json": {
          schema: z.object({
            enqueued: z.boolean(),
            workflowId: z.string(),
            requestedAt: IsoDateTimeSchema,
          }),
        },
      },
    },
    404: jsonErrorResponse("Workflow not found"),
  },
});

workflowRoutes.openapi(runRoute, async (c) => {
  const tenantId = orgId(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const def = await getWorkflowRepository(tenantId).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);

  const requestedAt = new Date().toISOString();
  await inngest.send({
    name: "nebutra/workflow.run.requested",
    data: { tenantId, workflowId: id, requestedAt, args: body?.args ?? {}, triggeredBy: "manual" },
  });

  return c.json({ enqueued: true, workflowId: id, requestedAt }, 202);
});

// ── Run (inline, SSE) ────────────────────────────────────────────────────────

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
    200: {
      description: "SSE stream of workflow events",
      content: { "text/event-stream": { schema: SseStreamSchema } },
    },
    404: jsonErrorResponse("Workflow not found"),
  },
});

workflowRoutes.openapi(runStreamRoute, async (c) => {
  const tenantId = orgId(c);
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
