import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { type StartupOSDb, saveStartupCanvasLayout } from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

const CanvasPointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const SaveCanvasLayoutSchema = z.object({
  zoom: z.number().finite().min(0.5).max(1.5),
  updatedAt: z.string().datetime(),
  nodePositions: z.record(z.string().min(1), CanvasPointSchema),
});

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
  if (!hasPermission(role, "project:update")) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return {
    auth,
    orgId: auth.orgId,
    db: getTenantDb(auth.orgId) as unknown as StartupOSDb,
  } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SaveCanvasLayoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid canvas layout.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const record = await saveStartupCanvasLayout(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
      parsed.data,
    );
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }
    logger.error("[startup-os.projects.canvas.PATCH] Failed to save canvas layout", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: message,
    });
    return NextResponse.json(
      { error: "Failed to save Startup OS canvas layout." },
      { status: 500 },
    );
  }
}
