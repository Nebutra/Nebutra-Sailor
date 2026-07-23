/**
 * @nebutra/email — Multi-provider transactional email
 *
 * Provider-agnostic email system with auto-detection:
 *   1. EMAIL_PROVIDER env var (explicit: "resend" | "nodemailer" | "console")
 *   2. RESEND_API_KEY present → Resend
 *   3. SMTP_HOST present → Nodemailer (SMTP)
 *   4. Fallback → Console (dev/test, no API key needed)
 *
 * Usage:
 *   import { sendWelcomeEmail, sendApiKeyCreatedEmail } from "@nebutra/email";
 *   await sendWelcomeEmail({ to: "user@example.com", orgName: "Acme Corp" });
 *
 * Environment variables:
 *   EMAIL_PROVIDER  — explicit provider override (optional)
 *   EMAIL_FROM      — verified sender (e.g. "Nebutra <noreply@nebutra.com>")
 *   RESEND_API_KEY  — for Resend provider
 *   SMTP_HOST       — for Nodemailer provider (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE)
 */

import { getEmailProvider, type SendResult } from "./provider";

export type { EmailProvider, EmailProviderType, SendOptions, SendResult } from "./provider";
export { getEmailProvider, resetEmailProvider } from "./provider";
export { ConsoleEmailProvider } from "./providers/console";
export { NodemailerEmailProvider } from "./providers/nodemailer";
export { ResendEmailProvider } from "./providers/resend";

const FROM = process.env.EMAIL_FROM ?? "Nebutra <noreply@nebutra.com>";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmailTemplateCatalogEntry {
  id: string;
  label: string;
  description: string;
  sendHelper: string;
  fileName: string;
}

export const EMAIL_TEMPLATE_CATALOG = [
  {
    id: "welcome",
    label: "Welcome",
    description: "Workspace provisioning welcome email",
    sendHelper: "sendWelcomeEmail",
    fileName: "welcome-email.html",
  },
  {
    id: "order-confirmation",
    label: "Order Confirmation",
    description: "Commerce order receipt with line items",
    sendHelper: "sendOrderConfirmationEmail",
    fileName: "order-confirmation-email.html",
  },
  {
    id: "magic-link",
    label: "Magic Link",
    description: "Passwordless sign-in link",
    sendHelper: "sendMagicLinkEmail",
    fileName: "magic-link-email.html",
  },
  {
    id: "contact-form-received",
    label: "Contact Form Received",
    description: "Contact form acknowledgement",
    sendHelper: "sendContactFormReceivedEmail",
    fileName: "contact-form-received-email.html",
  },
  {
    id: "license-created",
    label: "License Created",
    description: "License key delivery email",
    sendHelper: "sendLicenseCreatedEmail",
    fileName: "license-created-email.html",
  },
  {
    id: "welcome-react",
    label: "Welcome (React Email)",
    description: "Account onboarding welcome message",
    sendHelper: "sendWelcomeReactEmail",
    fileName: "welcome-react-email.html",
  },
  {
    id: "password-reset",
    label: "Password Reset",
    description: "Secure password reset link with expiry",
    sendHelper: "sendPasswordResetEmail",
    fileName: "password-reset-email.html",
  },
  {
    id: "invitation",
    label: "Invitation",
    description: "Workspace invitation with role and expiry",
    sendHelper: "sendInvitationEmail",
    fileName: "invitation-email.html",
  },
  {
    id: "receipt",
    label: "Receipt",
    description: "Payment receipt with billing period and PDF link",
    sendHelper: "sendReceiptEmail",
    fileName: "receipt-email.html",
  },
] as const satisfies readonly EmailTemplateCatalogEntry[];

// ── Core send helper ───────────────────────────────────────────────────────

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendResult> {
  const provider = getEmailProvider();
  return provider.send({
    ...opts,
    from: FROM,
  });
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
        <tr><td style="background:#0033FE;padding:32px 40px;">
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
    <a href="${dashboardUrl}" style="display:inline-block;background:#0033FE;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
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
 * Order confirmation email sent when an order successfully completes.
 */
export async function sendOrderConfirmationEmail(opts: {
  to: string;
  orderId: string;
  /** Order total in minor units (integer cents). */
  totalAmount: number;
  /** ISO 4217 currency code (default "USD"). */
  currency?: string;
  /** BCP 47 locale tag (default "en-US"). */
  locale?: string;
  items: Array<{ productId: string; quantity: number | string }>;
}): Promise<SendResult> {
  const formattedTotal = new Intl.NumberFormat(opts.locale ?? "en-US", {
    style: "currency",
    currency: opts.currency ?? "USD",
  }).format(opts.totalAmount / 100);

  const itemsHtml = opts.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:15px;">${item.productId}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#475569;font-size:15px;text-align:right;">x${item.quantity}</td>
        </tr>`,
    )
    .join("");

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Order Confirmed!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Thank you for your order <strong>#${opts.orderId}</strong>. We've received your payment of
      <strong>${formattedTotal}</strong> and your order is now being processed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
      ${itemsHtml}
    </table>
    <a href="https://app.nebutra.ai/orders/${opts.orderId}" style="display:inline-block;background:#0033FE;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      View Order Details →
    </a>
    `,
    `Order #${opts.orderId} Confirmed`,
  );

  return send({
    to: opts.to,
    subject: `Order #${opts.orderId} Confirmed`,
    html,
    tags: [{ name: "type", value: "order_confirmation" }],
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
    <a href="${opts.magicLinkUrl}" style="display:inline-block;background:#0033FE;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:16px;font-weight:600;margin:0 0 24px;text-align:center;width:100%;max-width:280px;">
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

/**
 * Contact Form Receipt (Sent to the User)
 */
export async function sendContactFormReceivedEmail(opts: {
  to: string;
  name: string;
  subject: string;
}): Promise<SendResult> {
  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Message Received</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.name},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Thank you for contacting us regarding "<strong>${opts.subject}</strong>". 
      We've received your request and our team will get back to you within 1-2 business days.
    </p>
    <p style="margin:0;font-size:15px;color:#475569;line-height:1.6;">
      Best regards,<br/>The Nebutra Team
    </p>
    `,
    "We have received your message",
  );

  return send({
    to: opts.to,
    subject: "We've received your message - Nebutra",
    html,
    tags: [{ name: "type", value: "contact_receipt" }],
  });
}

// ── Billing Lifecycle Emails ───────────────────────────────────────────────

/**
 * License created email sent when a user claims their OPC/STARTUP license.
 */
export async function sendLicenseCreatedEmail(opts: {
  to: string;
  firstName: string;
  licenseKey: string;
  tier: string;
}): Promise<SendResult> {
  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Welcome to Nebutra-Sailor! 🚀</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.firstName}, your <strong>${opts.tier}</strong> license has been successfully generated.
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Your official License Key is:
    </p>
    <div style="background:#0f172a;border-radius:8px;padding:16px 20px;margin:0 0 24px;overflow-x:auto;">
      <code style="color:#0BF1C3;font-family:'Courier New',monospace;font-size:13px;word-break:break-all;">${opts.licenseKey}</code>
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      To unlock the premium capabilities of the Nebutra CLI locally, run the following command in your terminal:
    </p>
    <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin:0 0 24px;">
      <code style="color:#334155;font-family:'Courier New',monospace;font-size:13px;">nebutra license activate ${opts.licenseKey}</code>
    </div>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      If you have questions, reply to this email or visit our <a href="https://docs.nebutra.ai" style="color:#0033FE;">documentation</a>.
    </p>
    `,
    "Your Nebutra License Key is Ready",
  );

  return send({
    to: opts.to,
    subject: `Your Nebutra License Key is Ready (${opts.tier})`,
    html,
    tags: [{ name: "type", value: "license_created" }],
  });
}

// ── React Email-style templates (welcome, password-reset, invitation, receipt) ─

import {
  type InvitationEmailProps,
  invitationEmail,
  type PasswordResetEmailProps,
  passwordResetEmail,
  type ReceiptEmailProps,
  receiptEmail,
  type WelcomeEmailProps,
  welcomeEmail,
} from "./templates";

export {
  type InvitationEmailProps,
  invitationEmail,
  type PasswordResetEmailProps,
  passwordResetEmail,
  REACT_EMAIL_TEMPLATES,
  type ReactEmailTemplate,
  type ReceiptEmailProps,
  type RenderedEmail,
  receiptEmail,
  renderInvitationEmail,
  renderPasswordResetEmail,
  renderReceiptEmail,
  renderWelcomeEmail,
  type WelcomeEmailProps,
  welcomeEmail,
} from "./templates";

/**
 * Send the React Email-style welcome message. Mirrors `WelcomeEmailProps`
 * exactly so callers can compose messages without depending on the legacy
 * `sendWelcomeEmail` signature.
 */
export async function sendWelcomeReactEmail(
  opts: { to: string } & WelcomeEmailProps,
): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: welcomeEmail.subject(opts),
    html: welcomeEmail.render(opts),
    tags: [{ name: "type", value: "welcome_react" }],
  });
}

/**
 * Send a password reset email with a tokenized link and expiry note.
 */
export async function sendPasswordResetEmail(
  opts: { to: string } & PasswordResetEmailProps,
): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: passwordResetEmail.subject(opts),
    html: passwordResetEmail.render(opts),
    tags: [{ name: "type", value: "password_reset" }],
  });
}

/**
 * Send a workspace invitation with role and accept link.
 */
export async function sendInvitationEmail(
  opts: { to: string } & InvitationEmailProps,
): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: invitationEmail.subject(opts),
    html: invitationEmail.render(opts),
    tags: [{ name: "type", value: "invitation" }],
  });
}

/**
 * Send a payment receipt with billing period and PDF download URL.
 */
export async function sendReceiptEmail(
  opts: { to: string } & ReceiptEmailProps,
): Promise<SendResult> {
  return send({
    to: opts.to,
    subject: receiptEmail.subject(opts),
    html: receiptEmail.render(opts),
    tags: [{ name: "type", value: "receipt" }],
  });
}
