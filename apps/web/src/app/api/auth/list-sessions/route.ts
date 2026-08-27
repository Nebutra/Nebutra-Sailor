import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const sessions = await db.authSession.findMany({
      where: { userId: authState.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return NextResponse.json(
      sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })),
    );
  } catch (error) {
    logger.error("[auth:list-sessions] Failed to load sessions", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load active sessions." }, { status: 500 });
  }
}
