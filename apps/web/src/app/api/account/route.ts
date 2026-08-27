import { canonicalizeLocale } from "@nebutra/i18n/locales";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const SUPPORTED_LANGUAGES = [
  "en",
  "en-US",
  "zh",
  "zh-Hans",
  "zh-CN",
  "zh-Hans-CN",
  "de",
  "de-DE",
  "es",
  "es-ES",
  "fr",
  "fr-FR",
  "ja",
  "ja-JP",
  "ko",
  "ko-KR",
] as const;

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    language: z
      .enum(SUPPORTED_LANGUAGES)
      .transform((locale) => canonicalizeLocale(locale) ?? locale)
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.language !== undefined, {
    message: "At least one of `name` or `language` must be provided.",
  });

/**
 * PATCH /api/account
 *
 * Updates the authenticated user's profile (name and/or preferred language).
 * Email changes go through POST so they can be guarded by an out-of-band
 * verification email.
 */
export async function PATCH(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const updates: { name?: string } = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    // `language` is currently a UI-side preference (NEXT_LOCALE cookie) — it is
    // accepted by this endpoint for forward-compatibility once the User schema
    // gains a `language` column.
    let updated: { id: string; name: string | null; email: string } | undefined;
    if (Object.keys(updates).length > 0) {
      updated = await db.user.update({
        where: { id: authState.userId },
        data: updates,
        select: { id: true, name: true, email: true },
      });
    }

    return NextResponse.json({
      ok: true,
      user: updated ?? null,
      language: parsed.data.language ?? null,
    });
  } catch (error) {
    logger.error("[account] Failed to update profile", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

/**
 * POST /api/account
 *
 * Initiates an email-change flow. The implementation — minting the single-use
 * verification token, persisting the pending change in `auth_verifications`,
 * and dispatching the confirmation mail through `@nebutra/email` — lives in
 * `./email-change/route.ts`, and the token is consumed by
 * `./email-change/[token]/route.ts`.
 *
 * This path delegates rather than reimplementing so the two entry points
 * cannot drift apart. It answers `202 Accepted`: the address is not changed
 * until the link in the mail is confirmed.
 */
export { POST } from "./email-change/route";
