import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import {
  buildStartupPreviewHtml,
  refreshCompilerGeneratedStartupFiles,
  shouldPersistStartupProjectFiles,
} from "@/lib/startup-os/files";
import {
  getStartupProjectRecord,
  type StartupOSDb,
  saveStartupProjectFiles,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{
    readonly projectId: string;
  }>;
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
  if (!hasPermission(role, "project:read")) {
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

export async function GET(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const record = await getStartupProjectRecord(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (!record) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const files = refreshCompilerGeneratedStartupFiles(record.project, record.files);
    const responseRecord = shouldPersistStartupProjectFiles(record.files, files)
      ? await saveStartupProjectFiles(
          requestContext.db,
          requestContext.orgId,
          decodedProjectId,
          files,
          {
            type: "file_updated",
            occurredAt: new Date().toISOString(),
            actorId: requestContext.userId,
            summary: "Hydrated Startup OS workspace files from compiler output.",
            metadata: { source: "startup-os-compiler", fileCount: files.length },
          },
        )
      : record;
    const responseFiles = responseRecord.files ?? files;
    return NextResponse.json({
      ...responseRecord,
      files: responseFiles,
      previewHtml: buildStartupPreviewHtml(responseFiles),
    });
  } catch (error) {
    logger.error("[startup-os.projects.detail.GET] Failed to load Startup OS project", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load Startup OS project." }, { status: 500 });
  }
}
