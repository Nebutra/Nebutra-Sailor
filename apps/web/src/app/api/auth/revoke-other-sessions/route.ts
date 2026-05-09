import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Revoke every active session for the current user EXCEPT the one making
 * this request. Used by the "Sign out of all other devices" action in
 * /settings/security.
 */
export async function POST(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const sessionToken = readSessionToken(request);

  try {
    const result = await db.authSession.deleteMany({
      where: {
        userId: authState.userId,
        ...(sessionToken ? { NOT: { token: sessionToken } } : {}),
      },
    });

    return NextResponse.json({ ok: true, revoked: result.count });
  } catch (error) {
    logger.error("[auth:revoke-other-sessions] Failed to revoke sessions", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to revoke sessions." }, { status: 500 });
  }
}

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
