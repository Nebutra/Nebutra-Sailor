import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { companyName } from "@/lib/startup-os/company-context/projection";
import { approveGovernanceReview } from "@/lib/startup-os/compiler";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import {
  getStartupProject,
  type StartupOSDb,
  saveStartupProjectRecord,
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
    db: getTenantDb(orgId) as unknown as StartupOSDb,
  } as const;
}

export async function POST(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const existing = await getStartupProject(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (!existing) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const occurredAt = new Date().toISOString();
    const approved = approveGovernanceReview(existing, occurredAt);
    const saved = await saveStartupProjectRecord(
      requestContext.db,
      requestContext.orgId,
      approved,
      {
        event: {
          type: "review_approved",
          occurredAt,
          actorId: requestContext.userId,
          summary: "Approved governance review gate.",
          metadata: {
            status: approved.status,
          },
        },
      },
    );
    await auditLogger(request, {
      actor: { id: requestContext.userId, type: "user" },
      tenantId: requestContext.orgId,
    }).log({
      action: "startup_os.review.approved",
      outcome: "success",
      resource: {
        type: "startup_os_project",
        id: saved.project.id,
        name: companyName(saved.project.companyContext),
      },
      severity: "warning",
      metadata: {
        status: saved.project.status,
        approvedRun: "governance.review",
      },
    });
    return NextResponse.json(saved);
  } catch (error) {
    logger.error("[startup-os.projects.review.POST] Failed to approve review gate", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to approve review gate." }, { status: 500 });
  }
}
