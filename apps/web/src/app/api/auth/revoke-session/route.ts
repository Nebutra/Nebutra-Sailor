import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session revoke request." }, { status: 400 });
  }

  try {
    const result = await db.authSession.deleteMany({
      where: {
        id: parsed.data.sessionId,
        userId: authState.userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[auth:revoke-session] Failed to revoke session", {
      userId: authState.userId,
      sessionId: parsed.data.sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to revoke session." }, { status: 500 });
  }
}
