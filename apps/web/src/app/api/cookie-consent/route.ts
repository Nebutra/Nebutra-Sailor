import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/cookie-consent
 *
 * Persists a GDPR/CCPA cookie-consent record for audit purposes.
 *
 * - Anonymous visitors are accepted: `userId` is `null` and we key on
 *   `visitorId` (a client-generated fingerprint or random UUID).
 * - Signed-in users have their `userId` attached automatically.
 * - `necessary` is forced to `true` regardless of input — strictly necessary
 *   cookies cannot be opted out of.
 *
 * Returns `{ ok: true }` on success, `{ error }` with status 400 on
 * validation errors, and `{ error }` with status 500 on unexpected failures.
 */
const requestSchema = z.object({
  visitorId: z.string().min(1).max(128).optional(),
  necessary: z.boolean(),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  timestamp: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth(request);

    const json = (await request.json().catch(() => null)) as unknown;
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const { visitorId, functional, analytics, marketing, expiresAt } = parsed.data;
    const userId = auth.userId ?? null;
    const stableVisitorId = visitorId ?? userId ?? `anon_${crypto.randomUUID()}`;

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await db.cookieConsent.upsert({
      where: { visitorId: stableVisitorId },
      create: {
        visitorId: stableVisitorId,
        userId,
        necessary: true,
        functional,
        analytics,
        marketing,
        ipAddress,
        userAgent,
        expiresAt: new Date(expiresAt),
      },
      update: {
        userId,
        necessary: true,
        functional,
        analytics,
        marketing,
        ipAddress,
        userAgent,
        expiresAt: new Date(expiresAt),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[cookie-consent] Failed to persist consent", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to persist cookie consent." }, { status: 500 });
  }
}
