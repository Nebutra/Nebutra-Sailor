import crypto from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, resolveServerRequestOrigin } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/account/email-change
 *
 * Initiates an email-change flow. We generate an opaque verification token,
 * persist it in `auth_verifications` keyed by `email-change:${userId}`, and
 * email a confirmation link to the *new* address. Confirming the link
 * (POST /api/account/email-change/[token]) flips the user's email atomically.
 */

const TOKEN_BYTES = 32; // 256-bit URL-safe token
const TTL_MS = 60 * 60 * 1000; // 1 hour

const bodySchema = z.object({
  newEmail: z.string().trim().toLowerCase().email(),
});

function identifierFor(userId: string): string {
  return `email-change:${userId}`;
}

export async function POST(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request body.",
          code: "INVALID_EMAIL",
        },
        { status: 400 },
      );
    }

    const { newEmail } = parsed.data;

    // Compare against the user's *current* email to short-circuit no-op changes.
    const currentUser = await db.user.findUnique({
      where: { id: authState.userId },
      select: { id: true, email: true, name: true },
    });
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found.", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (currentUser.email.toLowerCase() === newEmail) {
      return NextResponse.json(
        { error: "New email must differ from the current one.", code: "EMAIL_UNCHANGED" },
        { status: 400 },
      );
    }

    const taken = await db.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "This email is already in use.", code: "EMAIL_TAKEN" },
        { status: 409 },
      );
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
    const expiresAt = new Date(Date.now() + TTL_MS);
    const identifier = identifierFor(authState.userId);

    // Invalidate any prior pending change requests for this user.
    await db.authVerification.deleteMany({ where: { identifier } });
    await db.authVerification.create({
      data: {
        identifier,
        value: `${newEmail}:${token}`,
        expiresAt,
      },
    });

    // Typed helper in @nebutra/email (closes TODO #126 for this path).
    const origin = resolveServerRequestOrigin(new Headers(request.headers));
    const confirmUrl = `${origin}/email-change-confirm/${token}`;
    try {
      const { sendEmailChangeEmail } = await import("@nebutra/email");
      await sendEmailChangeEmail({
        to: newEmail,
        newEmail,
        confirmUrl,
      });
    } catch (error) {
      logger.error("[account/email-change] Failed to send verification email", {
        userId: authState.userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // We still return 202 because the verification row was written — the
      // user can request another email if delivery fails.
    }

    logger.info("[account/email-change] Verification requested", {
      userId: authState.userId,
      newEmail,
    });

    // Note: this is the *initiation* of the change — the address is only
    // updated when the user confirms via the link. We log here because the
    // request itself is security-relevant (initiation requires the current
    // session, attackers will trigger this).
    await auditLogger(request, {
      actor: { id: authState.userId, type: "user" },
      tenantId: authState.orgId ?? authState.userId,
    }).log({
      action: "account.email.changed",
      outcome: "success",
      resource: { type: "user", id: authState.userId },
      severity: "warning",
      changes: {
        before: { email: currentUser.email },
        after: { email: newEmail },
      },
      metadata: { state: "verification_pending" },
    });

    return NextResponse.json({ ok: true, verificationSent: true, newEmail }, { status: 202 });
  } catch (error) {
    logger.error("[account/email-change] POST failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to request email change.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
