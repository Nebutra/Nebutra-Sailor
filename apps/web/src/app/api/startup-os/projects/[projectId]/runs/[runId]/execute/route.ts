import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { AI_TOKENS, getMetering } from "@nebutra/metering";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import {
  executeStartupRun,
  hasStartupOSAIProviderKey,
  type StartupRunUsageEvent,
} from "@/lib/startup-os/execution";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { buildStartupProjectFiles } from "@/lib/startup-os/files";
import { recordStartupOSRunRollout, type StartupOSRolloutDb } from "@/lib/startup-os/rollout";
import {
  getStartupProjectRecord,
  type StartupOSDb,
  type StartupOSProjectRecord,
  saveStartupProjectRecord,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{
    readonly projectId: string;
    readonly runId: string;
  }>;
}

type StartupOSRuntimeDb = StartupOSDb &
  StartupOSRolloutDb & {
    readonly $transaction?: <T>(
      action: (tx: StartupOSDb & StartupOSRolloutDb) => Promise<T>,
    ) => Promise<T>;
  };

function disabledResponse() {
  return NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 });
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

async function getRequestContext(request: Request) {
  if (!isStartupOSPrototypeEnabled()) {
    return { response: disabledResponse() } as const;
  }

  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    } as const;
  }
  if (!auth.orgId) {
    return {
      response: NextResponse.json({ error: "Organization required." }, { status: 403 }),
    } as const;
  }
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "project:update")) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  const orgId = auth.orgId;

  return {
    auth,
    orgId,
    userId: auth.userId,
    db: getTenantDb(orgId) as unknown as StartupOSRuntimeDb,
  } as const;
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
    logger.warn("[startup-os.runs.execute] Failed to record metering usage", {
      tenantId: event.tenantId,
      projectId: event.projectId,
      runId: event.runId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  if (!hasStartupOSAIProviderKey()) {
    return NextResponse.json(
      {
        error:
          "Startup OS AI execution requires a private provider key: OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
      },
      { status: 503 },
    );
  }

  const { projectId, runId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);
  const decodedRunId = decodeURIComponent(runId);

  try {
    const existing = await getStartupProjectRecord(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (!existing) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const workspaceFiles = existing.files ?? buildStartupProjectFiles(existing.project);
    const result = await executeStartupRun(existing.project, decodedRunId, {
      tenantId: requestContext.orgId,
      userId: requestContext.userId,
      files: workspaceFiles,
      recordUsage: recordStartupOSUsage,
    });
    const { saved, rollout } = await persistStartupRunResult({
      db: requestContext.db,
      tenantId: requestContext.orgId,
      runId: decodedRunId,
      result,
    });
    const failed = result.events.some((event) => event.type === "run_failed");

    await auditLogger(request, {
      actor: { id: requestContext.userId, type: "user" },
      tenantId: requestContext.orgId,
    }).log({
      action: failed ? "startup_os.run.failed" : "startup_os.run.executed",
      outcome: failed ? "failure" : "success",
      resource: {
        type: "startup_os_project_run",
        id: `${saved.project.id}:${decodedRunId}`,
        name: saved.project.companyContext.name,
      },
      severity: "warning",
      metadata: {
        projectId: saved.project.id,
        runId: decodedRunId,
        rolloutThreadId: rollout.threadId,
        status: failed ? "failed" : "completed",
      },
    });

    return NextResponse.json({
      ...saved,
      execution: {
        status: failed ? "failed" : "completed",
        rolloutThreadId: rollout.threadId,
      },
    });
  } catch (error) {
    const classified = classifyStartupRunError(error);
    logger.error("[startup-os.runs.execute.POST] Failed to execute Startup OS run", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      runId: decodedRunId,
      status: classified.status,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: classified.message }, { status: classified.status });
  }
}
