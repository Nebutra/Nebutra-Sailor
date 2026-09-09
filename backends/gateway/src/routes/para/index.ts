/**
 * /api/v1/para — PARA workspace slice: projects, workspaces, embedded documents, assets, jobs.
 *
 * Documents and assets are gateway-owned (repository seam → Prisma, RLS). Jobs are the existing
 * task envelope: the ECS origin owns dispatch and persistence; this module maps its statuses onto
 * PARA's `queued(position) / running / completed / failed{type,message}` and proxies cancel + events.
 * Contract: docs/product-intelligence/{canvas,jobs,library}.md.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { toApiError } from "@nebutra/errors";
import {
  DocumentVersionConflictError,
  getParaAssetRepository,
  getParaWorkspaceRepository,
} from "@nebutra/repositories";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Context } from "hono";
import { env } from "../../config/env.js";
import { requirePermission } from "../../middlewares/permissions.js";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";
import { aiServiceBreaker, CircuitOpenError } from "../../services/circuitBreaker.js";
import {
  type AuthenticatedAiOriginHeaderInput,
  buildAuthenticatedAiOriginHeaders,
  resolveAiOriginClientIp,
} from "../ai/origin-headers.js";

const tracer = trace.getTracer("api-gateway.para");

export const paraRoutes = new OpenAPIHono();
paraRoutes.use("*", requireAuth, requireOrganization);

/**
 * Map a request to the CASL action it needs. PARA's objects are Projects and Documents: a canvas
 * workspace, its document, an asset and a generation job are all content inside a project, so they
 * authorize as `Document`. The permissions package reserves `Workspace` for the tenant workspace,
 * which is a different thing entirely and would lock members out of their own canvases.
 */
function paraAction(method: string): "read" | "create" | "update" | "delete" {
  if (method === "GET") return "read";
  if (method === "PATCH" || method === "PUT" || method === "POST") {
    return method === "POST" ? "create" : "update";
  }
  return "delete";
}

function paraResource(path: string): "Project" | "Document" {
  // Only the project collection itself is a Project; everything under it is content.
  return /\/projects\/?$/.test(path) ? "Project" : "Document";
}

paraRoutes.use("*", (c, next) =>
  requirePermission(paraAction(c.req.method), paraResource(c.req.path))(c, next),
);

const DOCUMENT_MAX_BYTES = 1_000_000;

const orgId = (c: Context): string => c.get("tenant").organizationId as string;

// ── Schemas ──────────────────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() });
const IdParam = z.object({ id: z.string().min(1).max(64) });

const ProjectSchema = z.object({ id: z.string(), name: z.string(), updatedAt: z.string() });
const WorkspaceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  documentVersion: z.number().int(),
  updatedAt: z.string(),
});
const DocumentSchema = z
  .object({
    version: z.number().int(),
    nodes: z.record(z.string(), z.unknown()),
    edges: z.record(z.string(), z.unknown()).default({}),
    viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  })
  .passthrough();
const DocumentEnvelopeSchema = z.object({
  documentVersion: z.number().int(),
  document: DocumentSchema,
});

const AssetTypeSchema = z.enum(["image", "video", "audio"]);
const AssetOriginSchema = z.enum(["upload", "generated"]);
const AssetSchema = z.object({
  id: z.string(),
  type: AssetTypeSchema,
  origin: AssetOriginSchema,
  scope: z.enum(["account", "team"]),
  url: z.string(),
  label: z.string(),
  aspect: z.string(),
  jobId: z.string().nullable(),
  workspaceId: z.string().nullable(),
  projectId: z.string().nullable(),
  favorite: z.boolean(),
  createdAt: z.string(),
});
const AssetCreateSchema = z.object({
  type: AssetTypeSchema,
  origin: AssetOriginSchema,
  url: z.string().url().max(2048),
  label: z.string().min(1).max(200),
  aspect: z.enum(["16:9", "1:1", "9:16", "4:3"]).default("16:9"),
  jobId: z.string().max(160).optional(),
  workspaceId: z.string().max(64).optional(),
  projectId: z.string().max(64).optional(),
});

const JobStatusSchema = z.enum(["queued", "running", "completed", "failed"]);
const JobSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  workspaceId: z.string(),
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
  queuePosition: z.number().int().optional(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  error: z
    .object({ type: z.string(), message: z.string(), retryable: z.boolean().optional() })
    .optional(),
  result: z.record(z.string(), z.unknown()).nullable(),
});
const JobCreateSchema = z.object({
  workspaceId: z.string().min(1).max(64),
  nodeId: z.string().min(1).max(64),
  generator: z
    .object({
      mode: z.enum(["image", "video", "text", "audio"]),
      model: z.string().max(120).optional(),
      prompt: z.string().max(4000).optional(),
      params: z.record(z.string(), z.unknown()).optional(),
      references: z
        .array(z.object({ kind: z.enum(["asset", "subject", "node"]), id: z.string() }))
        .max(16)
        .optional(),
      count: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
    })
    .passthrough(),
  idempotencyKey: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_.:-]+$/)
    .optional(),
});

// ── Serializers ──────────────────────────────────────────────────────────────

function serializeProject(p: { id: string; name: string; updatedAt: Date }) {
  return { id: p.id, name: p.name, updatedAt: p.updatedAt.toISOString() };
}
function serializeWorkspace(w: {
  id: string;
  projectId: string;
  name: string;
  documentVersion: number;
  updatedAt: Date;
}) {
  return {
    id: w.id,
    projectId: w.projectId,
    name: w.name,
    documentVersion: w.documentVersion,
    updatedAt: w.updatedAt.toISOString(),
  };
}
function serializeAsset(a: {
  id: string;
  type: string;
  origin: string;
  scope: string;
  url: string;
  label: string;
  aspect: string;
  jobId: string | null;
  workspaceId: string | null;
  projectId: string | null;
  favorite: boolean;
  createdAt: Date;
}) {
  return {
    id: a.id,
    type: a.type.toLowerCase() as "image" | "video" | "audio",
    origin: a.origin.toLowerCase() as "upload" | "generated",
    scope: a.scope.toLowerCase() as "account" | "team",
    url: a.url,
    label: a.label,
    aspect: a.aspect,
    jobId: a.jobId,
    workspaceId: a.workspaceId,
    projectId: a.projectId,
    favorite: a.favorite,
    createdAt: a.createdAt.toISOString(),
  };
}

/** Origin task envelope → PARA job. Failure is a terminal payload with a type (jobs.md decision 4). */
export function taskToJob(task: Record<string, unknown>): z.infer<typeof JobSchema> {
  const payload = (task.payload as Record<string, unknown> | undefined) ?? {};
  const metadata = (task.metadata as Record<string, unknown> | undefined) ?? {};
  const status = String(task.status ?? "queued");
  const err = task.error as Record<string, unknown> | null | undefined;
  const mapped: z.infer<typeof JobSchema>["status"] =
    status === "succeeded"
      ? "completed"
      : status === "running"
        ? "running"
        : status === "queued"
          ? "queued"
          : "failed";
  const error =
    mapped === "failed"
      ? {
          type: String(
            status === "cancelled" ? "cancelled" : (err?.code ?? err?.type ?? "task_failed"),
          ),
          message: String(
            err?.message ?? (status === "cancelled" ? "Cancelled" : "Generation failed"),
          ),
          ...(status === "cancelled" ? { retryable: true } : {}),
        }
      : undefined;
  const queuePosition =
    typeof metadata.queue_position === "number" ? metadata.queue_position : undefined;
  return {
    id: String(task.id),
    nodeId: String(payload.nodeId ?? metadata.nodeId ?? ""),
    workspaceId: String(payload.workspaceId ?? metadata.workspaceId ?? ""),
    status: mapped,
    progress: Math.max(0, Math.min(1, Number(task.progress ?? 0) / 100)),
    ...(queuePosition !== undefined ? { queuePosition } : {}),
    startedAt: typeof task.started_at === "string" ? task.started_at : null,
    finishedAt: typeof task.completed_at === "string" ? task.completed_at : null,
    ...(error ? { error } : {}),
    result: (task.result as Record<string, unknown> | null | undefined) ?? null,
  };
}

// ── Origin proxy (same shape as routes/tasks) ─────────────────────────────────

function originUrl(path: string): string {
  if (!env.AI_SERVICE_URL) throw new Error("AI_SERVICE_URL is required to run PARA jobs");
  return `${env.AI_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

function originContext(c: Context): AuthenticatedAiOriginHeaderInput {
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

async function originFetch(
  c: Context,
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const headers = await buildAuthenticatedAiOriginHeaders(originContext(c));
  return aiServiceBreaker.call(() =>
    fetch(originUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(120_000),
    }),
  );
}

async function withOrigin(
  c: Context,
  span: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  return tracer.startActiveSpan(span, async (s) => {
    try {
      return await fn();
    } catch (err) {
      s.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      if (err instanceof CircuitOpenError)
        return c.json({ error: "Generation origin temporarily unavailable" }, 503);
      return c.json({ error: toApiError(err).error.message }, 503);
    } finally {
      s.end();
    }
  });
}

// ── Projects ─────────────────────────────────────────────────────────────────

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/projects",
    tags: ["PARA"],
    operationId: "paraListProjects",
    summary: "List PARA projects",
    responses: {
      200: {
        description: "Projects",
        content: { "application/json": { schema: z.object({ items: z.array(ProjectSchema) }) } },
      },
    },
  }),
  async (c) =>
    c.json(
      { items: (await getParaWorkspaceRepository(orgId(c)).listProjects()).map(serializeProject) },
      200,
    ),
);

paraRoutes.openapi(
  createRoute({
    method: "post",
    path: "/projects",
    tags: ["PARA"],
    operationId: "paraCreateProject",
    summary: "Create a PARA project",
    request: {
      body: {
        content: { "application/json": { schema: z.object({ name: z.string().min(1).max(200) }) } },
      },
    },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: ProjectSchema } } },
    },
  }),
  async (c) =>
    c.json(
      serializeProject(
        await getParaWorkspaceRepository(orgId(c)).createProject(c.req.valid("json").name),
      ),
      201,
    ),
);

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/projects/{id}",
    tags: ["PARA"],
    operationId: "paraGetProject",
    summary: "Get a PARA project",
    request: { params: IdParam },
    responses: {
      200: { description: "Project", content: { "application/json": { schema: ProjectSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const p = await getParaWorkspaceRepository(orgId(c)).findProject(c.req.valid("param").id);
    return p ? c.json(serializeProject(p), 200) : c.json({ error: "project not found" }, 404);
  },
);

// ── Workspaces ───────────────────────────────────────────────────────────────

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/projects/{id}/workspaces",
    tags: ["PARA"],
    operationId: "paraListWorkspaces",
    summary: "List a project's workspaces",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Workspaces",
        content: { "application/json": { schema: z.object({ items: z.array(WorkspaceSchema) }) } },
      },
    },
  }),
  async (c) =>
    c.json(
      {
        items: (
          await getParaWorkspaceRepository(orgId(c)).listWorkspaces(c.req.valid("param").id)
        ).map(serializeWorkspace),
      },
      200,
    ),
);

/** Zero-step create (A): no name dialog. */
paraRoutes.openapi(
  createRoute({
    method: "post",
    path: "/projects/{id}/workspaces",
    tags: ["PARA"],
    operationId: "paraCreateWorkspace",
    summary: "Create a workspace (zero-step, auto-named)",
    request: {
      params: IdParam,
      body: {
        content: {
          "application/json": { schema: z.object({ name: z.string().min(1).max(200).optional() }) },
        },
        required: false,
      },
    },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: WorkspaceSchema } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const repo = getParaWorkspaceRepository(orgId(c));
    const { id } = c.req.valid("param");
    if (!(await repo.findProject(id))) return c.json({ error: "project not found" }, 404);
    const body = c.req.valid("json") as { name?: string } | undefined;
    return c.json(serializeWorkspace(await repo.createWorkspace(id, body?.name)), 201);
  },
);

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/workspaces/{id}",
    tags: ["PARA"],
    operationId: "paraGetWorkspace",
    summary: "Get a workspace",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Workspace",
        content: { "application/json": { schema: WorkspaceSchema } },
      },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const w = await getParaWorkspaceRepository(orgId(c)).findWorkspace(c.req.valid("param").id);
    return w ? c.json(serializeWorkspace(w), 200) : c.json({ error: "workspace not found" }, 404);
  },
);

// ── Document (silent autosave, optimistic concurrency) ───────────────────────

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/workspaces/{id}/document",
    tags: ["PARA"],
    operationId: "paraGetDocument",
    summary: "Get a workspace document with its version",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Document",
        content: { "application/json": { schema: DocumentEnvelopeSchema } },
      },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const w = await getParaWorkspaceRepository(orgId(c)).findWorkspace(c.req.valid("param").id);
    if (!w) return c.json({ error: "workspace not found" }, 404);
    c.header("ETag", `"${w.documentVersion}"`);
    return c.json(
      {
        documentVersion: w.documentVersion,
        document: w.document as z.infer<typeof DocumentSchema>,
      },
      200,
    );
  },
);

paraRoutes.openapi(
  createRoute({
    method: "put",
    path: "/workspaces/{id}/document",
    tags: ["PARA"],
    operationId: "paraPutDocument",
    summary: "Replace a workspace document (optimistic concurrency)",
    description:
      "Replace the document. `If-Match` carries the documentVersion the client last saw; a mismatch returns 409 with the server copy.",
    request: {
      params: IdParam,
      headers: z.object({ "if-match": z.string().regex(/^"?\d+"?$/) }),
      body: { content: { "application/json": { schema: DocumentSchema } } },
    },
    responses: {
      200: {
        description: "Saved",
        content: { "application/json": { schema: DocumentEnvelopeSchema } },
      },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
      409: {
        description: "Version conflict",
        content: {
          "application/json": { schema: DocumentEnvelopeSchema.extend({ error: z.string() }) },
        },
      },
      413: { description: "Too large", content: { "application/json": { schema: ErrorSchema } } },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const expected = Number(c.req.valid("header")["if-match"].replaceAll('"', ""));
    const document = c.req.valid("json");
    if (JSON.stringify(document).length > DOCUMENT_MAX_BYTES)
      return c.json({ error: "document exceeds 1 MB" }, 413);
    try {
      const { workspace } = await getParaWorkspaceRepository(orgId(c)).putDocument(
        id,
        expected,
        document,
      );
      c.header("ETag", `"${workspace.documentVersion}"`);
      return c.json(
        {
          documentVersion: workspace.documentVersion,
          document: workspace.document as z.infer<typeof DocumentSchema>,
        },
        200,
      );
    } catch (err) {
      if (err instanceof DocumentVersionConflictError) {
        return c.json(
          {
            error: "document version conflict",
            documentVersion: err.currentVersion,
            document: err.current as z.infer<typeof DocumentSchema>,
          },
          409,
        );
      }
      if (err instanceof Error && /not found/.test(err.message)) {
        return c.json({ error: "workspace not found" }, 404);
      }
      throw err;
    }
  },
);

// ── Assets ───────────────────────────────────────────────────────────────────

paraRoutes.openapi(
  createRoute({
    method: "get",
    path: "/assets",
    tags: ["PARA"],
    operationId: "paraListAssets",
    summary: "List assets, filtered by origin, workspace or project",
    request: {
      query: z.object({
        origin: AssetOriginSchema.optional(),
        workspaceId: z.string().optional(),
        projectId: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
      }),
    },
    responses: {
      200: {
        description: "Assets",
        content: { "application/json": { schema: z.object({ items: z.array(AssetSchema) }) } },
      },
    },
  }),
  async (c) => {
    const q = c.req.valid("query");
    const items = await getParaAssetRepository(orgId(c)).list({
      ...(q.origin ? { origin: q.origin.toUpperCase() as "UPLOAD" | "GENERATED" } : {}),
      ...(q.workspaceId ? { workspaceId: q.workspaceId } : {}),
      ...(q.projectId ? { projectId: q.projectId } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    });
    return c.json({ items: items.map(serializeAsset) }, 200);
  },
);

/** Record an asset after `/api/v1/uploads` completed, or a generated output. */
paraRoutes.openapi(
  createRoute({
    method: "post",
    path: "/assets",
    tags: ["PARA"],
    operationId: "paraCreateAsset",
    summary: "Record an uploaded or generated asset",
    request: { body: { content: { "application/json": { schema: AssetCreateSchema } } } },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: AssetSchema } } },
    },
  }),
  async (c) => {
    const b = c.req.valid("json");
    const created = await getParaAssetRepository(orgId(c)).create({
      type: b.type.toUpperCase() as "IMAGE" | "VIDEO" | "AUDIO",
      origin: b.origin.toUpperCase() as "UPLOAD" | "GENERATED",
      url: b.url,
      label: b.label,
      aspect: b.aspect,
      ...(b.jobId ? { jobId: b.jobId } : {}),
      ...(b.workspaceId ? { workspaceId: b.workspaceId } : {}),
      ...(b.projectId ? { projectId: b.projectId } : {}),
    });
    return c.json(serializeAsset(created), 201);
  },
);

// ── Jobs = task envelope ─────────────────────────────────────────────────────
// Plain handlers: these return proxied Responses, which zod-openapi's typed responses cannot express.

paraRoutes.post("/jobs", async (c) => {
  const parsed = JobCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid job", issues: parsed.error.issues }, 400);
  const b = parsed.data;
  return withOrigin(c, "para.jobs.create", async () => {
    const upstream = await originFetch(c, "/api/v1/tasks/", "POST", {
      type: "para.generate",
      queue: "ai",
      priority: "normal",
      payload: { workspaceId: b.workspaceId, nodeId: b.nodeId, generator: b.generator },
      metadata: { product: "para", workspaceId: b.workspaceId, nodeId: b.nodeId },
      ...(b.idempotencyKey ? { idempotency_key: b.idempotencyKey } : {}),
    });
    if (!upstream.ok) {
      // Pre-admission rejection: no job, no node — shown inline at the trigger (jobs.md decision 5).
      const detail = await upstream.text().catch(() => "");
      return c.json({ error: detail || `origin rejected the job (${upstream.status})` }, 502);
    }
    return c.json(taskToJob((await upstream.json()) as Record<string, unknown>), 202);
  });
});

paraRoutes.get("/jobs/:id", (c) =>
  withOrigin(c, "para.jobs.get", async () => {
    const upstream = await originFetch(
      c,
      `/api/v1/tasks/${encodeURIComponent(c.req.param("id"))}`,
      "GET",
    );
    if (upstream.status === 404) return c.json({ error: "job not found" }, 404);
    if (!upstream.ok) return c.json({ error: `origin error (${upstream.status})` }, 503);
    return c.json(taskToJob((await upstream.json()) as Record<string, unknown>), 200);
  }),
);

/** Immediate when queued, best-effort when running (C — fal semantics). */
paraRoutes.post("/jobs/:id/cancel", (c) =>
  withOrigin(c, "para.jobs.cancel", async () => {
    const upstream = await originFetch(
      c,
      `/api/v1/tasks/${encodeURIComponent(c.req.param("id"))}/cancel`,
      "POST",
    );
    if (upstream.status === 404) return c.json({ error: "job not found" }, 404);
    if (!upstream.ok) return c.json({ error: `origin error (${upstream.status})` }, 503);
    return c.json(taskToJob((await upstream.json()) as Record<string, unknown>), 200);
  }),
);

/**
 * SSE of job progress. The origin emits task envelopes (`succeeded`, progress 0-100, node id
 * buried in the payload); the browser only ever sees PARA jobs, so every `task` frame is mapped
 * through `taskToJob` here. Mapping stays in one place — the client must not learn the envelope.
 */
export function mapTaskEventStream(
  upstream: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const emit = (controller: TransformStreamDefaultController<Uint8Array>, frame: string) => {
    const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
    // Only `task` frames carry an envelope; `error` frames pass through untouched.
    if (!frame.includes("event: task") || !dataLine) {
      controller.enqueue(encoder.encode(`${frame}\n\n`));
      return;
    }
    try {
      const task = JSON.parse(dataLine.slice("data:".length).trim()) as Record<string, unknown>;
      controller.enqueue(
        encoder.encode(`event: task\ndata: ${JSON.stringify(taskToJob(task))}\n\n`),
      );
    } catch {
      controller.enqueue(encoder.encode(`${frame}\n\n`));
    }
  };

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        let index = buffer.indexOf("\n\n");
        while (index !== -1) {
          const frame = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (frame.trim()) emit(controller, frame);
          index = buffer.indexOf("\n\n");
        }
      },
      flush(controller) {
        const tail = buffer.trim();
        if (tail) emit(controller, tail);
      },
    }),
  );
}

paraRoutes.get("/jobs/:id/events", (c) =>
  withOrigin(c, "para.jobs.events", async () => {
    const upstream = await originFetch(
      c,
      `/api/v1/tasks/${encodeURIComponent(c.req.param("id"))}/events`,
      "GET",
    );
    if (upstream.status === 404) return c.json({ error: "job not found" }, 404);
    if (!upstream.ok || !upstream.body) {
      return c.json({ error: `origin error (${upstream.status})` }, 503);
    }
    return new Response(mapTaskEventStream(upstream.body), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "x-accel-buffering": "no",
      },
    });
  }),
);
