import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole, type Scope } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import {
  buildStartupPreviewHtml,
  patchStartupProjectFile,
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

  return {
    auth,
    orgId: auth.orgId,
    userId: auth.userId,
    db: getTenantDb(auth.orgId) as unknown as StartupOSDb,
  } as const;
}

export async function GET(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request, "project:read");
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
      project: responseRecord.project,
      files: responseFiles,
      previewHtml: buildStartupPreviewHtml(responseFiles),
    });
  } catch (error) {
    logger.error("[startup-os.projects.files.GET] Failed to load Startup OS files", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load Startup OS files." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request, "project:update");
  if ("response" in requestContext) return requestContext.response;

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpdateStartupFileSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const record = await getStartupProjectRecord(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (!record) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const occurredAt = new Date().toISOString();
    const existingFiles = refreshCompilerGeneratedStartupFiles(record.project, record.files);
    const files = patchStartupProjectFile(existingFiles, {
      path: parsed.data.path,
      content: parsed.data.content,
      updatedAt: occurredAt,
    });
    const saved = await saveStartupProjectFiles(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
      files,
      {
        type: "file_updated",
        occurredAt,
        actorId: requestContext.userId,
        summary: `Updated ${parsed.data.path}.`,
        metadata: { path: parsed.data.path },
      },
    );

    return NextResponse.json({
      ...saved,
      previewHtml: buildStartupPreviewHtml(saved.files ?? files),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Startup OS file.";
    const normalizedMessage = message.toLowerCase();
    const status =
      normalizedMessage.includes("file not found") ||
      normalizedMessage.includes("project not found")
        ? 404
        : 500;
    logger.error("[startup-os.projects.files.PATCH] Failed to save Startup OS file", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      path: parsed.data.path,
      status,
      error: message,
    });
    return NextResponse.json(
      { error: status === 404 ? message : "Failed to save Startup OS file." },
      { status },
    );
  }
}
