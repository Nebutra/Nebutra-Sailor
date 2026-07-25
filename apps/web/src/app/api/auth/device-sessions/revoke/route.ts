import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { revokeDeviceSession } from "@/lib/auth/device-sessions";
import { db } from "@/lib/db";

const bodySchema = z.object({
  kind: z.enum(["web", "desktop"]),
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid device session revoke request." }, { status: 400 });
  }

  try {
    const result = await revokeDeviceSession({
      db,
      kind: parsed.data.kind,
      sessionId: parsed.data.sessionId,
      userId: authState.userId,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Device session not found." }, { status: 404 });
    }

    await auditLogger(request, {
      actor: { id: authState.userId, type: "user" },
      tenantId: authState.orgId ?? authState.userId,
    }).log({
      action: "auth.session.revoked",
      outcome: "success",
      resource: { type: "device_session", id: parsed.data.sessionId },
      severity: "warning",
      metadata: { kind: parsed.data.kind },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[auth:device-sessions:revoke] Failed to revoke device session", {
      userId: authState.userId,
      sessionId: parsed.data.sessionId,
      kind: parsed.data.kind,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to revoke device session." }, { status: 500 });
  }
}
