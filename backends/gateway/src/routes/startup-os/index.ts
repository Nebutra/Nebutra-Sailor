import { OpenAPIHono, z } from "@hono/zod-openapi";
import { auditLogger } from "@nebutra/audit";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { AI_TOKENS, getMetering } from "@nebutra/metering";
import { generateField, invokeGenerateModel } from "@nebutra/startup-os/company-context/generate";
import { ensureTower } from "@nebutra/startup-os/company-context/migrate";
import { companyName } from "@nebutra/startup-os/company-context/projection";
import { InMemoryCompanyContextRepository } from "@nebutra/startup-os/company-context/repository";
import {
  approveGovernanceReview,
  compileStartupProject,
  STARTUP_ARENAS,
  type StartupArena,
} from "@nebutra/startup-os/compiler";
import {
  type StartupConversationEvent,
  type StreamStartupConversationResult,
  streamStartupConversation,
} from "@nebutra/startup-os/conversation";
import { ensureDevTenant } from "@nebutra/startup-os/dev-tenant";
import {
  executeStartupRun,
  hasStartupOSAIProviderKey,
  type StartupRunUsageEvent,
} from "@nebutra/startup-os/execution";
import { isStartupOSPrototypeEnabled } from "@nebutra/startup-os/feature-flag";
import {
  buildStartupPreviewHtml,
  buildStartupProjectFiles,
  patchStartupProjectFile,
  refreshCompilerGeneratedStartupFiles,
  shouldPersistStartupProjectFiles,
} from "@nebutra/startup-os/files";
import { recordStartupOSRunRollout, type StartupOSRolloutDb } from "@nebutra/startup-os/rollout";
import {
  getStartupProject,
  getStartupProjectRecord,
  listStartupProjects,
  type StartupOSDb,
  type StartupOSProjectRecord,
  type StartupTurnSnapshot,
  saveStartupCanvasLayout,
  saveStartupProjectFiles,
  saveStartupProjectRecord,
} from "@nebutra/startup-os/store";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const startupOsRoutes = new OpenAPIHono();

startupOsRoutes.use("*", requireAuth, requireOrganization);

const CreateStartupProjectSchema = z.object({
  thesis: z.string().trim().min(8).max(2000),
  arena: z.enum(STARTUP_ARENAS),
});

const UpdateStartupFileSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .refine((value) => !value.startsWith("/") && !value.includes(".."), {
      message: "Path must stay inside the generated project.",
    }),
  content: z.string().max(500_000),
});

const CanvasPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const SaveCanvasLayoutSchema = z.object({
  zoom: z.number().finite().min(0.5).max(1.5),
  updatedAt: z.string().datetime(),
  nodePositions: z.record(z.string().min(1), CanvasPointSchema),
});

const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"] as const;

const UpsertContextFieldSchema = z.object({
  layerId: z.enum(LAYER_IDS),
  fieldKey: z.string().min(1).max(64),
  value: z.unknown(),
});

const GenerateContextFieldSchema = z.object({
  layerId: z.enum(LAYER_IDS),
  fieldKey: z.string().min(1).max(64),
});

const ChatRequestSchema = z.object({
  instruction: z.string().min(1).max(4000),
});

const RevertSchema = z.object({ turnId: z.string().min(1).max(200) });

const CHAT_RUN_ID = "conversation";

type StartupOSRuntimeDb = StartupOSDb &
  StartupOSRolloutDb & {
    readonly $transaction?: <T>(
      action: (tx: StartupOSDb & StartupOSRolloutDb) => Promise<T>,
    ) => Promise<T>;
  };

type StartupOsContext =
  | {
      readonly ok: true;
      readonly orgId: string;
      readonly userId: string;
      readonly db: StartupOSRuntimeDb;
    }
  | {
      readonly ok: false;
      readonly response: Response;
    };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function disabledResponse() {
  return jsonResponse({ error: "Startup OS is not enabled." }, 404);
}

function getStartupOsContext(c: { get: (key: "tenant") => unknown }): StartupOsContext {
  if (!isStartupOSPrototypeEnabled()) {
    return { ok: false, response: disabledResponse() };
  }
  const tenant = c.get("tenant") as {
    organizationId?: string;
    userId?: string;
  };
  if (!tenant.userId) {
    return { ok: false, response: jsonResponse({ error: "Authentication required." }, 401) };
  }
  if (!tenant.organizationId) {
    return { ok: false, response: jsonResponse({ error: "Organization required." }, 403) };
  }
  return {
    ok: true,
    orgId: tenant.organizationId,
    userId: tenant.userId,
    db: getTenantDb(tenant.organizationId) as unknown as StartupOSRuntimeDb,
  };
}

async function maybeEnsureDevTenant() {
  if (getConfiguredAuthProvider() !== "dev") return;
  await ensureDevTenant();
}

async function recordStartupOSUsage(event: StartupRunUsageEvent) {
  try {
    const metering = await getMetering();
    await metering.defineMeter(AI_TOKENS);
    await metering.ingest({
      meterId: AI_TOKENS.id,
      tenantId: event.tenantId,
      value: event.tokens,
      timestamp: new Date().toISOString(),
      idempotencyKey: `startup-os:${event.projectId}:${event.runId}:${event.provider}:${event.model}`,
      properties: {
        surface: "startup_os",
        projectId: event.projectId,
        runId: event.runId,
        provider: event.provider,
        model: event.model,
      },
    });
  } catch (error) {
    logger.warn("[startup-os.gateway] Failed to record metering usage", {
      tenantId: event.tenantId,
      projectId: event.projectId,
      runId: event.runId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function persistStartupRunResult(input: {
  readonly db: StartupOSRuntimeDb;
  readonly tenantId: string;
  readonly runId: string;
  readonly result: Awaited<ReturnType<typeof executeStartupRun>>;
}): Promise<{
  readonly saved: StartupOSProjectRecord;
  readonly rollout: { readonly threadId: string };
}> {
  const persist = async (db: StartupOSDb & StartupOSRolloutDb) => {
    const saved = await saveStartupProjectRecord(db, input.tenantId, input.result.project, {
      events: input.result.events,
      ...(input.result.files ? { files: input.result.files } : {}),
    });
    const rollout = await recordStartupOSRunRollout({
      db,
      tenantId: input.tenantId,
      project: saved.project,
      runId: input.runId,
      events: input.result.events,
    });
    return { saved, rollout };
  };
  return input.db.$transaction ? input.db.$transaction(persist) : persist(input.db);
}

async function persistChatResult(input: {
  readonly db: StartupOSRuntimeDb;
  readonly tenantId: string;
  readonly result: StreamStartupConversationResult;
  readonly snapshot?: StartupTurnSnapshot;
}): Promise<{
  readonly saved: StartupOSProjectRecord;
  readonly rollout: { readonly threadId: string };
}> {
  const persist = async (db: StartupOSDb & StartupOSRolloutDb) => {
    const saved = await saveStartupProjectRecord(db, input.tenantId, input.result.project, {
      events: input.result.events,
      ...(input.result.files ? { files: input.result.files } : {}),
      ...(input.snapshot ? { snapshot: input.snapshot } : {}),
    });
    const rollout = await recordStartupOSRunRollout({
      db,
      tenantId: input.tenantId,
      project: saved.project,
      runId: CHAT_RUN_ID,
      events: input.result.events,
    });
    return { saved, rollout };
  };
  return input.db.$transaction ? input.db.$transaction(persist) : persist(input.db);
}

function eventFrame(event: { readonly type: string } & Record<string, unknown>): string {
  const { type, ...data } = event;
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function endFrame(): string {
  return "event: end\ndata: [DONE]\n\n";
}

function classifyStartupRunError(error: unknown) {
  const message = error instanceof Error ? error.message : "Failed to execute Startup OS run.";
  if (message.includes("not found")) return { status: 404, message };
  if (
    message.includes("Only planned") ||
    message.includes("governance review") ||
    message.includes("before execution")
  ) {
    return { status: 409, message };
  }
  return { status: 500, message: "Failed to execute Startup OS run." };
}

startupOsRoutes.get("/projects", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;

  try {
    await maybeEnsureDevTenant();
    const projects = await listStartupProjects(context.db, context.orgId);
    return c.json({ projects });
  } catch (error) {
    logger.error("[startup-os.gateway.projects.GET] Failed to load projects", {
      organizationId: context.orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to load Startup OS projects." }, 500);
  }
});

startupOsRoutes.post("/projects", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;

  const body = await c.req.json().catch(() => null);
  const parsed = CreateStartupProjectSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid input.", details: parsed.error.flatten() }, 400);
  }

  try {
    await maybeEnsureDevTenant();
    const project = compileStartupProject({
      id: `startup_${crypto.randomUUID()}`,
      thesis: parsed.data.thesis,
      arena: parsed.data.arena as StartupArena,
      now: new Date().toISOString(),
    });
    const files = buildStartupProjectFiles(project);
    const saved = await saveStartupProjectRecord(context.db, context.orgId, project, {
      files,
      event: {
        type: "project_created",
        occurredAt: project.createdAt,
        actorId: context.userId,
        summary: "Compiled Startup OS project from founder thesis.",
        metadata: { arena: project.arena, slug: project.slug },
      },
    });
    await auditLogger(c.req.raw, {
      actor: { id: context.userId, type: "user" },
      tenantId: context.orgId,
    }).log({
      action: "startup_os.project.created",
      outcome: "success",
      resource: {
        type: "startup_os_project",
        id: saved.project.id,
        name: companyName(saved.project.companyContext),
      },
      metadata: {
        arena: saved.project.arena,
        artifactCount: saved.project.artifacts.length,
        runCount: saved.project.runs.length,
      },
    });
    return jsonResponse(saved, 201);
  } catch (error) {
    logger.error("[startup-os.gateway.projects.POST] Failed to compile project", {
      organizationId: context.orgId,
      userId: context.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to compile Startup OS project." }, 500);
  }
});

startupOsRoutes.get("/projects/:projectId", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const record = await getStartupProjectRecord(context.db, context.orgId, projectId);
    if (!record) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const files = refreshCompilerGeneratedStartupFiles(record.project, record.files);
    const responseRecord = shouldPersistStartupProjectFiles(record.files, files)
      ? await saveStartupProjectFiles(context.db, context.orgId, projectId, files, {
          type: "file_updated",
          occurredAt: new Date().toISOString(),
          actorId: context.userId,
          summary: "Hydrated Startup OS workspace files from compiler output.",
          metadata: { source: "startup-os-compiler", fileCount: files.length },
        })
      : record;
    const responseFiles = responseRecord.files ?? files;
    return c.json({
      ...responseRecord,
      files: responseFiles,
      previewHtml: buildStartupPreviewHtml(responseFiles),
    });
  } catch (error) {
    logger.error("[startup-os.gateway.projects.detail.GET] Failed to load project", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to load Startup OS project." }, 500);
  }
});

startupOsRoutes.get("/projects/:projectId/files", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const record = await getStartupProjectRecord(context.db, context.orgId, projectId);
    if (!record) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const files = refreshCompilerGeneratedStartupFiles(record.project, record.files);
    const responseRecord = shouldPersistStartupProjectFiles(record.files, files)
      ? await saveStartupProjectFiles(context.db, context.orgId, projectId, files, {
          type: "file_updated",
          occurredAt: new Date().toISOString(),
          actorId: context.userId,
          summary: "Hydrated Startup OS workspace files from compiler output.",
          metadata: { source: "startup-os-compiler", fileCount: files.length },
        })
      : record;
    const responseFiles = responseRecord.files ?? files;
    return c.json({
      project: responseRecord.project,
      files: responseFiles,
      previewHtml: buildStartupPreviewHtml(responseFiles),
    });
  } catch (error) {
    logger.error("[startup-os.gateway.projects.files.GET] Failed to load files", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to load Startup OS files." }, 500);
  }
});

startupOsRoutes.patch("/projects/:projectId/files", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const projectId = decodeURIComponent(c.req.param("projectId"));
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateStartupFileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid input.", details: parsed.error.flatten() }, 400);
  }

  try {
    const record = await getStartupProjectRecord(context.db, context.orgId, projectId);
    if (!record) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const occurredAt = new Date().toISOString();
    const existingFiles = refreshCompilerGeneratedStartupFiles(record.project, record.files);
    const files = patchStartupProjectFile(existingFiles, {
      path: parsed.data.path,
      content: parsed.data.content,
      updatedAt: occurredAt,
    });
    const saved = await saveStartupProjectFiles(context.db, context.orgId, projectId, files, {
      type: "file_updated",
      occurredAt,
      actorId: context.userId,
      summary: `Updated ${parsed.data.path}.`,
      metadata: { path: parsed.data.path },
    });
    return c.json({ ...saved, previewHtml: buildStartupPreviewHtml(saved.files ?? files) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Startup OS file.";
    const status =
      message.toLowerCase().includes("file not found") ||
      message.toLowerCase().includes("project not found")
        ? 404
        : 500;
    logger.error("[startup-os.gateway.projects.files.PATCH] Failed to save file", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      path: parsed.data.path,
      status,
      error: message,
    });
    return jsonResponse(
      { error: status === 404 ? message : "Failed to save Startup OS file." },
      status,
    );
  }
});

startupOsRoutes.patch("/projects/:projectId/canvas", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const body = await c.req.json().catch(() => null);
  const parsed = SaveCanvasLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid canvas layout.", details: parsed.error.flatten() }, 400);
  }
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const record = await saveStartupCanvasLayout(context.db, context.orgId, projectId, parsed.data);
    return c.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return jsonResponse({ error: "Startup OS project not found." }, 404);
    }
    logger.error("[startup-os.gateway.projects.canvas.PATCH] Failed to save canvas layout", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      error: message,
    });
    return jsonResponse({ error: "Failed to save Startup OS canvas layout." }, 500);
  }
});

startupOsRoutes.patch("/projects/:projectId/context", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const body = await c.req.json().catch(() => null);
  const parsed = UpsertContextFieldSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid field edit.", details: parsed.error.flatten() }, 400);
  }
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const project = await getStartupProject(context.db, context.orgId, projectId);
    if (!project) return jsonResponse({ error: "Startup OS project not found." }, 404);

    const now = new Date().toISOString();
    const tower = ensureTower(project.companyContext, projectId, now);
    const repo = new InMemoryCompanyContextRepository();
    repo.save(tower);
    const nextContext = repo.upsertField(
      tower.projectId,
      parsed.data.layerId,
      parsed.data.fieldKey,
      parsed.data.value,
      { provenance: "user", now },
    );
    const saved = await saveStartupProjectRecord(context.db, context.orgId, {
      ...project,
      companyContext: nextContext,
      updatedAt: now,
    });
    return c.json({ context: saved.project.companyContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unknown field") || message.includes("locked")) {
      return jsonResponse({ error: message }, 400);
    }
    logger.error(
      "[startup-os.gateway.projects.context.PATCH] Failed to upsert company context field",
      {
        organizationId: context.orgId,
        userId: context.userId,
        projectId,
        error: message,
      },
    );
    return jsonResponse({ error: "Failed to update the company context." }, 500);
  }
});

startupOsRoutes.post("/projects/:projectId/context", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const body = await c.req.json().catch(() => null);
  const parsed = GenerateContextFieldSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Invalid generate request.", details: parsed.error.flatten() },
      400,
    );
  }
  if (!hasStartupOSAIProviderKey()) {
    return c.json({ needsProvider: true });
  }
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const project = await getStartupProject(context.db, context.orgId, projectId);
    if (!project) return jsonResponse({ error: "Startup OS project not found." }, 404);

    const now = new Date().toISOString();
    const tower = ensureTower(project.companyContext, projectId, now);
    const value = await generateField({
      context: tower,
      layerId: parsed.data.layerId,
      fieldKey: parsed.data.fieldKey,
      invokeModel: invokeGenerateModel,
    });
    if (value === null) {
      return jsonResponse({ error: "The model returned no value." }, 502);
    }

    const repo = new InMemoryCompanyContextRepository();
    repo.save(tower);
    const nextContext = repo.upsertField(
      tower.projectId,
      parsed.data.layerId,
      parsed.data.fieldKey,
      value,
      { provenance: "ai", now },
    );
    const saved = await saveStartupProjectRecord(context.db, context.orgId, {
      ...project,
      companyContext: nextContext,
      updatedAt: now,
    });
    return c.json({ context: saved.project.companyContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      "[startup-os.gateway.projects.context.POST] Failed to generate company context field",
      {
        organizationId: context.orgId,
        userId: context.userId,
        projectId,
        error: message,
      },
    );
    return jsonResponse({ error: "Failed to generate the field." }, 500);
  }
});

startupOsRoutes.post("/projects/:projectId/review", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const projectId = decodeURIComponent(c.req.param("projectId"));

  try {
    const existing = await getStartupProject(context.db, context.orgId, projectId);
    if (!existing) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const occurredAt = new Date().toISOString();
    const approved = approveGovernanceReview(existing, occurredAt);
    const saved = await saveStartupProjectRecord(context.db, context.orgId, approved, {
      event: {
        type: "review_approved",
        occurredAt,
        actorId: context.userId,
        summary: "Approved governance review gate.",
        metadata: { status: approved.status },
      },
    });
    await auditLogger(c.req.raw, {
      actor: { id: context.userId, type: "user" },
      tenantId: context.orgId,
    }).log({
      action: "startup_os.review.approved",
      outcome: "success",
      resource: {
        type: "startup_os_project",
        id: saved.project.id,
        name: companyName(saved.project.companyContext),
      },
      severity: "warning",
      metadata: { status: saved.project.status, approvedRun: "governance.review" },
    });
    return c.json(saved);
  } catch (error) {
    logger.error("[startup-os.gateway.projects.review.POST] Failed to approve review gate", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to approve review gate." }, 500);
  }
});

startupOsRoutes.post("/projects/:projectId/revert", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  const projectId = decodeURIComponent(c.req.param("projectId"));
  const body = await c.req.json().catch(() => null);
  const parsed = RevertSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "A turnId is required." }, 400);

  try {
    const record = await getStartupProjectRecord(context.db, context.orgId, projectId);
    if (!record) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const snapshot = record.snapshots?.find((item) => item.turnId === parsed.data.turnId);
    if (!snapshot) return jsonResponse({ error: "No snapshot for that turn." }, 404);
    const saved = await saveStartupProjectRecord(context.db, context.orgId, record.project, {
      files: snapshot.files,
      event: {
        type: "file_updated",
        occurredAt: new Date().toISOString(),
        actorId: context.userId,
        summary: `Reverted workspace to before: ${snapshot.prompt}`.slice(0, 280),
      },
    });
    const files = saved.files ?? snapshot.files;
    await auditLogger(c.req.raw, {
      actor: { id: context.userId, type: "user" },
      tenantId: context.orgId,
    }).log({
      action: "startup_os.revert",
      outcome: "success",
      resource: {
        type: "startup_os_project",
        id: saved.project.id,
        name: snapshot.prompt.slice(0, 80),
      },
      metadata: { turnId: snapshot.turnId },
    });
    return c.json({
      project: saved.project,
      files,
      previewHtml: buildStartupPreviewHtml(files),
      prompt: snapshot.prompt,
    });
  } catch (error) {
    logger.error("[startup-os.gateway.revert] Failed to revert workspace", {
      tenantId: context.orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: "Failed to revert the workspace." }, 500);
  }
});

startupOsRoutes.post("/projects/:projectId/runs/:runId/execute", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  if (!hasStartupOSAIProviderKey()) {
    return jsonResponse(
      {
        error:
          "Startup OS AI execution requires a private provider key: OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
      },
      503,
    );
  }
  const projectId = decodeURIComponent(c.req.param("projectId"));
  const runId = decodeURIComponent(c.req.param("runId"));

  try {
    const existing = await getStartupProjectRecord(context.db, context.orgId, projectId);
    if (!existing) return jsonResponse({ error: "Startup OS project not found." }, 404);
    const workspaceFiles = existing.files ?? buildStartupProjectFiles(existing.project);
    const result = await executeStartupRun(existing.project, runId, {
      tenantId: context.orgId,
      userId: context.userId,
      files: workspaceFiles,
      recordUsage: recordStartupOSUsage,
    });
    const { saved, rollout } = await persistStartupRunResult({
      db: context.db,
      tenantId: context.orgId,
      runId,
      result,
    });
    const failed = result.events.some((event) => event.type === "run_failed");
    await auditLogger(c.req.raw, {
      actor: { id: context.userId, type: "user" },
      tenantId: context.orgId,
    }).log({
      action: failed ? "startup_os.run.failed" : "startup_os.run.executed",
      outcome: failed ? "failure" : "success",
      resource: {
        type: "startup_os_project_run",
        id: `${saved.project.id}:${runId}`,
        name: companyName(saved.project.companyContext),
      },
      severity: "warning",
      metadata: {
        projectId: saved.project.id,
        runId,
        rolloutThreadId: rollout.threadId,
        status: failed ? "failed" : "completed",
      },
    });
    return c.json({
      ...saved,
      execution: {
        status: failed ? "failed" : "completed",
        rolloutThreadId: rollout.threadId,
      },
    });
  } catch (error) {
    const classified = classifyStartupRunError(error);
    logger.error("[startup-os.gateway.runs.execute.POST] Failed to execute Startup OS run", {
      organizationId: context.orgId,
      userId: context.userId,
      projectId,
      runId,
      status: classified.status,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ error: classified.message }, classified.status);
  }
});

startupOsRoutes.post("/projects/:projectId/chat", async (c) => {
  const context = getStartupOsContext(c);
  if (!context.ok) return context.response;
  if (!hasStartupOSAIProviderKey()) {
    return jsonResponse(
      {
        error:
          "Startup OS AI execution requires a private provider key: OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
      },
      503,
    );
  }
  const body = await c.req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "A non-empty instruction (1-4000 characters) is required." }, 400);
  }
  const projectId = decodeURIComponent(c.req.param("projectId"));
  const existing = await getStartupProjectRecord(context.db, context.orgId, projectId);
  if (!existing) return jsonResponse({ error: "Startup OS project not found." }, 404);

  const workspaceFiles = existing.files ?? buildStartupProjectFiles(existing.project);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        const turnId = globalThis.crypto.randomUUID();
        enqueue(eventFrame({ type: "turn", turnId }));
        const generator = streamStartupConversation(existing.project, parsed.data.instruction, {
          tenantId: context.orgId,
          userId: context.userId,
          files: workspaceFiles,
          recordUsage: recordStartupOSUsage,
        });

        let pendingDone: StartupConversationEvent | null = null;
        let next = await generator.next();
        while (!next.done) {
          const event = next.value;
          if (event.type === "done") {
            pendingDone = event;
          } else {
            enqueue(eventFrame(event));
          }
          next = await generator.next();
        }

        const result = next.value;
        const failed = result.events.some((event) => event.type === "conversation_failed");
        if (!failed) {
          const turnSnapshot: StartupTurnSnapshot = {
            turnId,
            prompt: parsed.data.instruction,
            files: workspaceFiles,
            createdAt: new Date().toISOString(),
          };
          const { saved, rollout } = await persistChatResult({
            db: context.db,
            tenantId: context.orgId,
            result,
            snapshot: turnSnapshot,
          });
          await auditLogger(c.req.raw, {
            actor: { id: context.userId, type: "user" },
            tenantId: context.orgId,
          }).log({
            action: "startup_os.chat.completed",
            outcome: "success",
            resource: {
              type: "startup_os_project_chat",
              id: `${saved.project.id}:${CHAT_RUN_ID}`,
              name: companyName(saved.project.companyContext),
            },
            severity: "info",
            metadata: {
              projectId: saved.project.id,
              rolloutThreadId: rollout.threadId,
              summary: result.summary,
            },
          });
          if (pendingDone) enqueue(eventFrame(pendingDone));
        }
        enqueue(endFrame());
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Startup OS conversation failed.";
        logger.error("[startup-os.gateway.chat.POST] Conversation turn failed after stream open", {
          organizationId: context.orgId,
          userId: context.userId,
          projectId,
          error: message,
        });
        enqueue(eventFrame({ type: "error", message, occurredAt: new Date().toISOString() }));
        enqueue(endFrame());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
