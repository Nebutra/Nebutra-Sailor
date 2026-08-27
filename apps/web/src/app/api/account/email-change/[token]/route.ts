import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/account/email-change/[token]
 *
 * Confirms an email-change request: looks up the pending verification row,
 * checks it has not expired, atomically updates the user's email, and deletes
 * the verification row so it cannot be reused.
 *
 * NOTE: Authentication is intentionally optional here — the link is delivered
 * out-of-band to the new mailbox and proves possession on its own. If a
 * session cookie *is* present we additionally enforce that it belongs to the
 * user the verification row points to, to defeat token-replay against another
 * account.
 */

const TOKEN_REGEX = /^[A-Za-z0-9._-]{8,}$/;

interface RouteContext {
  params: Promise<{ token: string }>;
}

function parseValue(value: string): { newEmail: string; token: string } | null {
  const lastColon = value.lastIndexOf(":");
  if (lastColon <= 0) return null;
  return {
    newEmail: value.slice(0, lastColon),
    token: value.slice(lastColon + 1),
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (typeof token !== "string" || !TOKEN_REGEX.test(token)) {
      return NextResponse.json(
        { error: "Malformed verification token.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }

    // Locate the pending verification row by scanning for the token suffix.
    // (Identifier alone is per-user; the token uniquely identifies the row.)
    const candidates = await db.authVerification.findMany({
      where: { identifier: { startsWith: "email-change:" } },
    });
    const match = candidates.find((row) => row.value.endsWith(`:${token}`));

    if (!match) {
      return NextResponse.json(
        { error: "Verification not found.", code: "TOKEN_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (match.expiresAt.getTime() < Date.now()) {
      await db.authVerification.delete({ where: { id: match.id } }).catch(() => undefined);
      return NextResponse.json(
        { error: "Verification link has expired.", code: "TOKEN_EXPIRED" },
        { status: 410 },
      );
    }

    const parsed = parseValue(match.value);
    if (!parsed) {
      return NextResponse.json(
        { error: "Corrupted verification record.", code: "INVALID_TOKEN" },
        { status: 400 },
      );
    }
    const userId = match.identifier.slice("email-change:".length);

    // If a session is present, ensure it matches.
    const authState = await getAuth(request);
    if (authState.userId && authState.userId !== userId) {
      return NextResponse.json(
        {
          error: "Verification token does not belong to current session.",
          code: "SESSION_MISMATCH",
        },
        { status: 403 },
      );
    }

    // Re-check that the address is still free (a race could have claimed it).
    const taken = await db.user.findUnique({
      where: { email: parsed.newEmail },
      select: { id: true },
    });
    if (taken && taken.id !== userId) {
      await db.authVerification.delete({ where: { id: match.id } }).catch(() => undefined);
      return NextResponse.json(
        { error: "This email is already in use.", code: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }

    await db.user.update({
      where: { id: userId },
      data: { email: parsed.newEmail },
    });

    // Best-effort sync to the auth provider's user record.
    try {
      await db.authUser.updateMany({
        where: { id: userId },
        data: { email: parsed.newEmail, emailVerified: true },
      });
    } catch (error) {
      logger.warn("[account/email-change/confirm] Failed to sync auth user email", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    await db.authVerification.delete({ where: { id: match.id } }).catch(() => undefined);

    logger.info("[account/email-change/confirm] Email changed", {
      userId,
      newEmail: parsed.newEmail,
    });

    return NextResponse.json({ ok: true, newEmail: parsed.newEmail });
  } catch (error) {
    logger.error("[account/email-change/confirm] failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to confirm email change.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
