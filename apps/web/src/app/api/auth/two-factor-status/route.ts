import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/auth/two-factor-status
 *
 * Returns the current user's 2FA enrollment state.
 * The TwoFactorBlock UI calls this on mount and after successful enroll/disable
 * actions to keep its enabled/disabled pill in sync with the AuthUser record.
 */
export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const user = await db.authUser.findUnique({
      where: { id: authState.userId },
      select: { twoFactorEnabled: true },
    });

    return NextResponse.json({ enabled: user?.twoFactorEnabled ?? false });
  } catch (error) {
    logger.error("[auth:two-factor-status] Failed to load 2FA state", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load two-factor status." }, { status: 500 });
  }
}
