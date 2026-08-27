import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/auth/current-session
 *
 * Returns the AuthSession.id of the session that issued this request.
 * Used by ActiveSessionsBlock to flag the row corresponding to the
 * device the user is currently signed in on.
 *
 * Returns `{ sessionId: null }` when the cookie is absent or the lookup
 * fails — callers should treat null as "unknown" and not crash.
 */
export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const token = readSessionToken(request);

  if (!token) {
    return NextResponse.json({ sessionId: null });
  }

  try {
    const session = await db.authSession.findUnique({
      where: { token },
      select: { id: true, userId: true },
    });

    // Only return the id if the token belongs to the authenticated user;
    // otherwise treat as unknown to avoid leaking session ids across users.
    if (!session || session.userId !== authState.userId) {
      return NextResponse.json({ sessionId: null });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    logger.error("[auth:current-session] Failed to resolve current session", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to resolve current session." }, { status: 500 });
  }
}

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
