import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const bodySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid passkey rename request." }, { status: 400 });
  }

  try {
    const result = await db.bAPasskey.updateMany({
      where: {
        id: parsed.data.id,
        userId: authState.userId,
      },
      data: {
        name: parsed.data.name,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Passkey not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[auth:passkey-rename] Failed to rename passkey", {
      userId: authState.userId,
      passkeyId: parsed.data.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to rename passkey." }, { status: 500 });
  }
}
