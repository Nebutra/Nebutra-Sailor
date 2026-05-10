import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveRole } from "@/lib/permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing key id." }, { status: 400 });
  }

  try {
    const existing = (await db.aPIKey.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        createdById: true,
        revokedAt: true,
      },
    })) as {
      id: string;
      organizationId: string;
      createdById: string | null;
      revokedAt: Date | null;
    } | null;

    if (!existing || existing.organizationId !== auth.orgId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
    const isAdmin = role === "admin";
    const isCreator = existing.createdById === auth.userId;
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.revokedAt) {
      // Idempotent — already revoked.
      return NextResponse.json({ ok: true });
    }

    await db.aPIKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    // SOC 2 audit — API key revocation is a security-sensitive event.
    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId,
    }).log({
      action: "api_key.revoked",
      outcome: "success",
      resource: { type: "api_key", id },
      severity: "warning",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[api-keys.DELETE] Failed to revoke key", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to revoke key." }, { status: 500 });
  }
}
