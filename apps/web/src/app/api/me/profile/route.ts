import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * `/api/me/profile` — Personalization profile CRUD.
 *
 * Backs the `<PersonalizationPanel>` surface and is consumed by `/api/chat`
 * to inject custom instructions into the AI system prompt.
 *
 * Schema lives in `UserProfile` (one row per user, `userId` unique).
 */

const profileSchema = z.object({
  nickname: z.string().trim().max(80).optional().nullable(),
  occupation: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  customInstructions: z.string().trim().max(3000).optional().nullable(),
});

type ProfileBody = z.infer<typeof profileSchema>;

function normalize(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const profile = await db.userProfile.findUnique({
      where: { userId: auth.userId },
      select: {
        nickname: true,
        occupation: true,
        bio: true,
        customInstructions: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      profile: profile ?? {
        nickname: "",
        occupation: "",
        bio: "",
        customInstructions: "",
        updatedAt: null,
      },
    });
  } catch (error) {
    logger.error("[me/profile] GET failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const data: ProfileBody = parsed.data;
    const payload = {
      nickname: normalize(data.nickname),
      occupation: normalize(data.occupation),
      bio: normalize(data.bio),
      customInstructions: normalize(data.customInstructions),
    };

    const updated = await db.userProfile.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...payload },
      update: payload,
      select: {
        nickname: true,
        occupation: true,
        bio: true,
        customInstructions: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    logger.error("[me/profile] PUT failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
