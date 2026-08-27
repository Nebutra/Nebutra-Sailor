import "server-only";

import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveLogoUrl } from "@/lib/logo-url";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * GET /api/organizations/[orgId]/logo-url
 *
 * Returns the resolved public URL for the organization's logo, or null if
 * no logo is set.
 *
 * Authorization: read = member boundary — any member of the active org may
 * read the logo URL. This mirrors the sibling org routes (authState.orgId === orgId).
 * Mutation routes (POST/DELETE on /logo) require OWNER/ADMIN.
 *
 * Note: Organization.logo stores a storage KEY (not a URL). This route always
 * resolves the key through resolveLogoUrl before returning.
 *
 * AUDIT(no-tenant): This route uses db directly (not the repository seam) because
 * apps/web/src/app/api/organizations/** is not a coreDomain per governance.config.json.
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { orgId } = await context.params;

  const authState = await getAuth();
  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (authState.orgId !== orgId) {
    return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
  }

  try {
    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: { logo: true },
    });

    const logoUrl = organization?.logo ? resolveLogoUrl(organization.logo) : null;

    return NextResponse.json({ logoUrl });
  } catch (error) {
    logger.error("[organizations] Failed to load logo URL", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load organization logo." }, { status: 500 });
  }
}
