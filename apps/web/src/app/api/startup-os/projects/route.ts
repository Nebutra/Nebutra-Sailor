import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole, type Scope } from "@/lib/permissions";
import {
  compileStartupProject,
  STARTUP_ARENAS,
  type StartupArena,
} from "@/lib/startup-os/compiler";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { buildStartupProjectFiles } from "@/lib/startup-os/files";
import {
  listStartupProjects,
  type StartupOSDb,
  saveStartupProjectRecord,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

const CreateStartupProjectSchema = z.object({
  thesis: z.string().trim().min(8).max(2000),
  arena: z.enum(STARTUP_ARENAS),
});

function disabledResponse() {
  return NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 });
}

async function getRequestContext(request: Request, scope: Scope) {
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
  if (!hasPermission(role, scope)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  const orgId = auth.orgId;

  return {
    auth,
    orgId,
    userId: auth.userId,
    db: getTenantDb(orgId) as unknown as StartupOSDb,
  } as const;
}

export async function GET(request: Request) {
  const context = await getRequestContext(request, "project:read");
  if ("response" in context) return context.response;

  try {
    const projects = await listStartupProjects(context.db, context.orgId);
    return NextResponse.json({ projects });
  } catch (error) {
    logger.error("[startup-os.projects.GET] Failed to load Startup OS projects", {
      organizationId: context.orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load Startup OS projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await getRequestContext(request, "project:create");
  if ("response" in context) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateStartupProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
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
        metadata: {
          arena: project.arena,
          slug: project.slug,
        },
      },
    });
    await auditLogger(request, {
      actor: { id: context.userId, type: "user" },
      tenantId: context.orgId,
    }).log({
      action: "startup_os.project.created",
      outcome: "success",
      resource: {
        type: "startup_os_project",
        id: saved.project.id,
        name: saved.project.companyContext.name,
      },
      metadata: {
        arena: saved.project.arena,
        artifactCount: saved.project.artifacts.length,
        runCount: saved.project.runs.length,
      },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    logger.error("[startup-os.projects.POST] Failed to compile Startup OS project", {
      organizationId: context.orgId,
      userId: context.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to compile Startup OS project." }, { status: 500 });
  }
}
