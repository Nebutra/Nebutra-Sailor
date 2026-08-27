import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { readBetterAuthSessionToken, revokeOtherDeviceSessions } from "@/lib/auth/device-sessions";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const currentWebSessionToken = readBetterAuthSessionToken(request);
  if (!currentWebSessionToken) {
    return NextResponse.json(
      { error: "Current session is required to revoke other devices." },
      { status: 400 },
    );
  }

  try {
    const result = await revokeOtherDeviceSessions({
      currentWebSessionToken,
      db,
      userId: authState.userId,
    });

    await auditLogger(request, {
      actor: { id: authState.userId, type: "user" },
      tenantId: authState.orgId ?? authState.userId,
    }).log({
      action: "auth.session.revoked_other",
      outcome: "success",
      resource: { type: "user", id: authState.userId },
      severity: "warning",
      metadata: {
        revokedCount: result.total,
        webRevoked: result.web,
        desktopRevoked: result.desktop,
      },
    });

    return NextResponse.json({ ok: true, revoked: result.total });
  } catch (error) {
    logger.error("[auth:device-sessions:revoke-others] Failed to revoke device sessions", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to revoke device sessions." }, { status: 500 });
  }
}
