/**
 * @nebutra/email — Transactional email via Resend
 *
 * Thin, typed wrapper around the Resend SDK.
 * All templates live here so designs are co-located with send logic.
 *
 * Usage:
 *   import { sendWelcomeEmail, sendApiKeyCreatedEmail } from "@nebutra/email";
 *   await sendWelcomeEmail({ to: "user@example.com", orgName: "Acme Corp" });
 *
 * Environment variables required:
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 *   EMAIL_FROM      — verified sender (e.g. "Nebutra <noreply@nebutra.ai>")
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Nebutra <noreply@nebutra.ai>";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SendResult {
  id: string;
}

// ── Core send helper ───────────────────────────────────────────────────────

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendResult> {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts.tags ? { tags: opts.tags } : {}),
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { id: data?.id };
}

// ── Templates ──────────────────────────────────────────────────────────────

function baseLayout(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Nebutra</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;‌&zwnj;&nbsp;</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0033FE,#0BF1C3);padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Nebutra</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} Nebutra Intelligence Inc. ·
            <a href="https://nebutra.ai/privacy" style="color:#94a3b8;">Privacy</a> ·
            <a href="https://nebutra.ai/unsubscribe" style="color:#94a3b8;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email senders ──────────────────────────────────────────────────────────

/**
 * Welcome email sent when a new organization is provisioned.
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  dashboardUrl?: string;
}): Promise<SendResult> {
  const dashboardUrl = opts.dashboardUrl ?? "https://app.nebutra.ai";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Welcome to Nebutra, ${opts.firstName}!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Your workspace <strong>${opts.orgName}</strong> is ready. You can now invite team members,
      create API keys, and start building with the Nebutra platform.
    </p>
    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Open Dashboard →
    </a>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      If you have questions, reply to this email or visit our <a href="https://docs.nebutra.ai" style="color:#0033FE;">documentation</a>.
    </p>
    `,
    `Welcome to Nebutra — ${opts.orgName} is ready`,
  );

  return send({
    to: opts.to,
    subject: `Welcome to Nebutra — ${opts.orgName} is ready`,
    html,
    tags: [{ name: "type", value: "welcome" }],
  });
}

/**
 * Email sent when a new API key is created (shows the key one time).
 */
export async function sendApiKeyCreatedEmail(opts: {
  to: string;
  firstName: string;
  keyPrefix: string;
  keyName: string;
  plaintextKey: string;
}): Promise<SendResult> {
  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">New API Key Created</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      A new API key <strong>${opts.keyName}</strong> was created for your account.
      Copy it now — it will not be shown again.
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin:0 0 24px;overflow-x:auto;">
      <code style="color:#0BF1C3;font-family:'Courier New',monospace;font-size:13px;word-break:break-all;">${opts.plaintextKey}</code>
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
      Key prefix: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${opts.keyPrefix}…</code>
    </p>
    <p style="margin:0;font-size:13px;color:#ef4444;">
      ⚠️ If you did not create this key, revoke it immediately in your
      <a href="https://app.nebutra.ai/settings/api-keys" style="color:#ef4444;">API key settings</a>.
    </p>
    `,
    "New API key created — copy it now",
  );

  return send({
    to: opts.to,
    subject: `API key "${opts.keyName}" created`,
    html,
    tags: [{ name: "type", value: "api_key_created" }],
  });
}

/**
 * Quota warning: tenant has consumed 80% or 100% of their plan quota.
 */
export async function sendQuotaWarningEmail(opts: {
  to: string;
  orgName: string;
  metric: string;
  used: number;
  limit: number;
  percentUsed: number;
  upgradeUrl?: string;
}): Promise<SendResult> {
  const upgradeUrl = opts.upgradeUrl ?? "https://app.nebutra.ai/settings/billing";
  const isCritical = opts.percentUsed >= 100;

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:${isCritical ? "#dc2626" : "#d97706"};">
      ${isCritical ? "⛔ Quota Exhausted" : "⚠️ Quota Warning"}: ${opts.metric}
    </h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      <strong>${opts.orgName}</strong> has used <strong>${opts.percentUsed.toFixed(0)}%</strong>
      of its ${opts.metric} quota this period
      (<strong>${opts.used.toLocaleString()} / ${opts.limit.toLocaleString()}</strong>).
      ${isCritical ? "Further requests will be rejected until you upgrade or the period resets." : ""}
    </p>
    <a href="${upgradeUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 16px;">
      Upgrade Plan →
    </a>
    `,
    `${opts.orgName} has used ${opts.percentUsed.toFixed(0)}% of ${opts.metric} quota`,
  );

  return send({
    to: opts.to,
    subject: `${isCritical ? "[Action Required]" : "[Warning]"} ${opts.orgName} ${opts.metric} quota at ${opts.percentUsed.toFixed(0)}%`,
    html,
    tags: [
      { name: "type", value: "quota_warning" },
      { name: "critical", value: isCritical ? "true" : "false" },
    ],
  });
}

/**
 * Team member invitation email.
 */
export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  expiresInDays?: number;
}): Promise<SendResult> {
  const expiresInDays = opts.expiresInDays ?? 7;

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">You've been invited to join ${opts.orgName}</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      <strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.orgName}</strong>
      on Nebutra as a <strong>${opts.role}</strong>.
    </p>
    <a href="${opts.inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Accept Invitation →
    </a>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      This invitation expires in ${expiresInDays} days.
      If you weren't expecting this, you can safely ignore this email.
    </p>
    `,
    `You've been invited to join ${opts.orgName} on Nebutra`,
  );

  return send({
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.orgName} on Nebutra`,
    html,
    tags: [{ name: "type", value: "invite" }],
  });
}

/**
 * Shipfast-style Magic Link Email for 1-click Authentication.
 */
export async function sendMagicLinkEmail(opts: {
  to: string;
  magicLinkUrl: string;
}): Promise<SendResult> {
  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Sign in to Nebutra</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Click the button below to sign in securely. No password required.
    </p>
    <a href="${opts.magicLinkUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:16px;font-weight:600;margin:0 0 24px;text-align:center;width:100%;max-width:280px;">
      ✨ Sign In Automatically
    </a>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;">
      If you did not request this email, you can safely ignore it.
      This link expires in 15 minutes.
    </p>
    `,
    "Click here to sign in to your Nebutra account",
  );

  return send({
    to: opts.to,
    subject: "Sign in to Nebutra ✨",
    html,
    tags: [{ name: "type", value: "magic_link" }],
  });
}
