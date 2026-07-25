import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDeviceSessions, readBetterAuthSessionToken } from "@/lib/auth/device-sessions";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const sessions = await getDeviceSessions({
      currentWebSessionToken: readBetterAuthSessionToken(request),
      db,
      userId: authState.userId,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    logger.error("[auth:device-sessions] Failed to load device sessions", {
      userId: authState.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load device sessions." }, { status: 500 });
  }
}
