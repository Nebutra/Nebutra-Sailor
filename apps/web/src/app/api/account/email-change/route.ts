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

function buildEmailChangeHtml(opts: { recipientEmail: string; confirmUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;">
      <tr><td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">
          <tr><td style="background:linear-gradient(135deg,#0033FE,#0BF1C3);padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nebutra</h1>
          </td></tr>
          <tr><td style="padding:40px;">
            <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Confirm your new email address</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              We received a request to change the email on your Nebutra account to
              <strong>${opts.recipientEmail}</strong>. Click the button below to confirm. This link expires in 1 hour.
            </p>
            <a href="${opts.confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
              Confirm email change →
            </a>
            <p style="margin:0;font-size:13px;color:#94a3b8;">
              If you did not request this change you can safely ignore this email — your address will not be updated.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
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

    // Compose and dispatch the confirmation email. We use the generic email
    // provider instead of a typed helper because no `email-change` template
    // exists in @nebutra/email yet — TODO: add `sendEmailChangeEmail` helper
    // there, and switch this call to use it.
    const origin = resolveServerRequestOrigin(new Headers(request.headers));
    const confirmUrl = `${origin}/email-change-confirm/${token}`;
    try {
      const emailModule = await import("@nebutra/email");
      const provider = emailModule.getEmailProvider();
      await provider.send({
        to: newEmail,
        from: process.env.EMAIL_FROM ?? "Nebutra <noreply@nebutra.ai>",
        subject: "Confirm your new Nebutra email address",
        html: buildEmailChangeHtml({ recipientEmail: newEmail, confirmUrl }),
        tags: [{ name: "type", value: "email_change_verification" }],
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
