import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { buildStartupPreviewHtml } from "@/lib/startup-os/files";
import {
  getStartupProjectRecord,
  type StartupOSDb,
  saveStartupProjectRecord,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

const RevertSchema = z.object({ turnId: z.string().min(1).max(200) });

interface RouteContext {
  readonly params: Promise<{ projectId: string }>;
}

function disabledResponse() {
  return NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 });
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
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return {
    orgId: auth.orgId,
    userId: auth.userId,
    db: getTenantDb(auth.orgId) as unknown as StartupOSDb,
  } as const;
}

/**
 * Revert the workspace to the snapshot captured before a chat turn — the file
 * half of "revert and resend". Restores that turn's pre-patch files; the client
 * then resends the (optionally edited) instruction to continue from that state.
 */
export async function POST(request: Request, context: RouteContext) {
  const ctx = await getRequestContext(request);
  if ("response" in ctx) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = RevertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A turnId is required." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const record = await getStartupProjectRecord(ctx.db, ctx.orgId, decodedProjectId);
    if (!record) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }
    const snapshot = record.snapshots?.find((item) => item.turnId === parsed.data.turnId);
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshot for that turn." }, { status: 404 });
    }

    const saved = await saveStartupProjectRecord(ctx.db, ctx.orgId, record.project, {
      files: snapshot.files,
      event: {
        type: "file_updated",
        occurredAt: new Date().toISOString(),
        actorId: ctx.userId,
        summary: `Reverted workspace to before: ${snapshot.prompt}`.slice(0, 280),
      },
    });
    const files = saved.files ?? snapshot.files;

    await auditLogger(request, {
      actor: { id: ctx.userId, type: "user" },
      tenantId: ctx.orgId,
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

    return NextResponse.json({
      project: saved.project,
      files,
      previewHtml: buildStartupPreviewHtml(files),
      prompt: snapshot.prompt,
    });
  } catch (error) {
    logger.error("[startup-os.revert] Failed to revert workspace", {
      tenantId: ctx.orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to revert the workspace." }, { status: 500 });
  }
}
