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

const FROM = process.env.EMAIL_FROM ?? "Nebutra <noreply@nebutra.ai>";
let resendClient: Resend | undefined;

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send email");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SendResult {
  id: string;
}

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
    id: "api-key-created",
    label: "API Key Created",
    description: "One-time API key creation notice",
    sendHelper: "sendApiKeyCreatedEmail",
    fileName: "api-key-created-email.html",
  },
  {
    id: "quota-warning",
    label: "Quota Warning",
    description: "Usage threshold and quota exhaustion warning",
    sendHelper: "sendQuotaWarningEmail",
    fileName: "quota-warning-email.html",
  },
  {
    id: "team-invitation",
    label: "Team Invitation",
    description: "Workspace team invitation",
    sendHelper: "sendInviteEmail",
    fileName: "team-invitation-email.html",
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
    id: "checkout-completed",
    label: "Checkout Completed",
    description: "Subscription checkout success",
    sendHelper: "sendCheckoutCompletedEmail",
    fileName: "checkout-completed-email.html",
  },
  {
    id: "trial-ending",
    label: "Trial Ending",
    description: "Trial expiry warning",
    sendHelper: "sendTrialEndingEmail",
    fileName: "trial-ending-email.html",
  },
  {
    id: "invoice-paid",
    label: "Invoice Paid",
    description: "Paid invoice receipt",
    sendHelper: "sendInvoicePaidEmail",
    fileName: "invoice-paid-email.html",
  },
  {
    id: "payment-failed",
    label: "Payment Failed",
    description: "Billing retry and action-required notice",
    sendHelper: "sendPaymentFailedEmail",
    fileName: "payment-failed-email.html",
  },
  {
    id: "subscription-canceled",
    label: "Subscription Canceled",
    description: "Subscription cancellation confirmation",
    sendHelper: "sendSubscriptionCanceledEmail",
    fileName: "subscription-canceled-email.html",
  },
  {
    id: "upcoming-invoice",
    label: "Upcoming Invoice",
    description: "Upcoming charge notice",
    sendHelper: "sendUpcomingInvoiceEmail",
    fileName: "upcoming-invoice-email.html",
  },
  {
    id: "plan-changed",
    label: "Plan Changed",
    description: "Plan upgrade or downgrade notice",
    sendHelper: "sendPlanChangedEmail",
    fileName: "plan-changed-email.html",
  },
  {
    id: "license-created",
    label: "License Created",
    description: "License key delivery email",
    sendHelper: "sendLicenseCreatedEmail",
    fileName: "license-created-email.html",
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
  const { data, error } = await getResendClient().emails.send({
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
 * Order confirmation email sent when an order successfully completes.
 */
export async function sendOrderConfirmationEmail(opts: {
  to: string;
  orderId: string;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number | string }>;
}): Promise<SendResult> {
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
      <strong>$${(opts.totalAmount / 100).toFixed(2)}</strong> and your order is now being processed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
      ${itemsHtml}
    </table>
    <a href="https://app.nebutra.ai/orders/${opts.orderId}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
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
 * Checkout completed — subscription created successfully.
 * Trigger: billing.checkout.completed
 */
export async function sendCheckoutCompletedEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  planName: string;
  dashboardUrl?: string;
}): Promise<SendResult> {
  const dashboardUrl = opts.dashboardUrl ?? "https://app.nebutra.ai";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">You're all set! 🎉</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.firstName}, great news — <strong>${opts.orgName}</strong> has been upgraded to the
      <strong style="color:#0033FE;">${opts.planName}</strong> plan.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      All premium features are now unlocked. Here's what you can do next:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:8px 0;font-size:15px;color:#475569;">✅ Invite unlimited team members</td></tr>
      <tr><td style="padding:8px 0;font-size:15px;color:#475569;">✅ Access advanced AI models</td></tr>
      <tr><td style="padding:8px 0;font-size:15px;color:#475569;">✅ Priority support SLA</td></tr>
    </table>
    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 16px;">
      Go to Dashboard →
    </a>
    `,
    `${opts.orgName} has been upgraded to ${opts.planName}`,
  );

  return send({
    to: opts.to,
    subject: `🎉 ${opts.orgName} is now on the ${opts.planName} plan`,
    html,
    tags: [{ name: "type", value: "checkout_completed" }],
  });
}

/**
 * Trial ending soon — 3 days before expiry (Stripe default).
 * Trigger: billing.trial.ending
 */
export async function sendTrialEndingEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  trialEndDate: string;
  billingUrl?: string;
}): Promise<SendResult> {
  const billingUrl = opts.billingUrl ?? "https://app.nebutra.ai/settings/billing";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#d97706;">⏳ Your trial ends soon</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.firstName}, the free trial for <strong>${opts.orgName}</strong> ends on
      <strong>${opts.trialEndDate}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      To keep your workspace and all your data, add a payment method before the trial expires.
      If you don't, your account will be downgraded to the Free plan.
    </p>
    <a href="${billingUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Add Payment Method →
    </a>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Questions? Reply to this email and our team will help.
    </p>
    `,
    `Your ${opts.orgName} trial ends on ${opts.trialEndDate}`,
  );

  return send({
    to: opts.to,
    subject: `⏳ Your ${opts.orgName} trial ends in 3 days`,
    html,
    tags: [{ name: "type", value: "trial_ending" }],
  });
}

/**
 * Invoice successfully paid — receipt.
 * Trigger: billing.invoice.paid
 */
export async function sendInvoicePaidEmail(opts: {
  to: string;
  orgName: string;
  invoiceId: string;
  amountPaid: number;
  currency?: string;
  invoiceUrl?: string;
}): Promise<SendResult> {
  const currency = opts.currency ?? "USD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(opts.amountPaid / 100);

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Payment Received ✓</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      We've received your payment of <strong>${formatted}</strong> for <strong>${opts.orgName}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#94a3b8;">Invoice</td>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">#${opts.invoiceId.slice(-8).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#94a3b8;">Amount</td>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;">${formatted}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:14px;color:#94a3b8;">Status</td>
        <td style="padding:12px 0;font-size:14px;color:#16a34a;text-align:right;font-weight:600;">Paid</td>
      </tr>
    </table>
    ${
      opts.invoiceUrl
        ? `<a href="${opts.invoiceUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 16px;">View Invoice →</a>`
        : ""
    }
    `,
    `Payment of ${formatted} received for ${opts.orgName}`,
  );

  return send({
    to: opts.to,
    subject: `✓ Payment received — ${formatted}`,
    html,
    tags: [{ name: "type", value: "invoice_paid" }],
  });
}

/**
 * Payment failed — retry notification.
 * Trigger: billing.invoice.payment_failed
 */
export async function sendPaymentFailedEmail(opts: {
  to: string;
  orgName: string;
  attemptCount: number;
  nextAttemptDate?: string;
  billingUrl?: string;
}): Promise<SendResult> {
  const billingUrl = opts.billingUrl ?? "https://app.nebutra.ai/settings/billing";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#dc2626;">⚠️ Payment Failed</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      We were unable to process the payment for <strong>${opts.orgName}</strong>.
      This was attempt <strong>${opts.attemptCount}</strong>.
    </p>
    ${
      opts.nextAttemptDate
        ? `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">We'll retry automatically on <strong>${opts.nextAttemptDate}</strong>.</p>`
        : ""
    }
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      To avoid service interruption, please update your payment method:
    </p>
    <a href="${billingUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Update Payment Method →
    </a>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      If you believe this is an error, please contact support.
    </p>
    `,
    `Payment failed for ${opts.orgName} — update your payment method`,
  );

  return send({
    to: opts.to,
    subject: `⚠️ Payment failed for ${opts.orgName} — action required`,
    html,
    tags: [
      { name: "type", value: "payment_failed" },
      { name: "attempt", value: String(opts.attemptCount) },
    ],
  });
}

/**
 * Subscription canceled — confirmation + what happens next.
 * Trigger: billing.subscription.canceled
 */
export async function sendSubscriptionCanceledEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  effectiveDate?: string;
  reactivateUrl?: string;
}): Promise<SendResult> {
  const reactivateUrl = opts.reactivateUrl ?? "https://app.nebutra.ai/settings/billing";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Subscription Canceled</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.firstName}, your subscription for <strong>${opts.orgName}</strong> has been canceled.
      ${opts.effectiveDate ? `It will remain active until <strong>${opts.effectiveDate}</strong>.` : ""}
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      After cancellation, your workspace will be downgraded to the <strong>Free</strong> plan.
      Your data will be preserved, but premium features will no longer be available.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Changed your mind? You can reactivate anytime:
    </p>
    <a href="${reactivateUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 24px;">
      Reactivate Subscription →
    </a>
    <p style="margin:0;font-size:13px;color:#94a3b8;">
      We'd love to know why you canceled — reply to this email with any feedback.
    </p>
    `,
    `Your ${opts.orgName} subscription has been canceled`,
  );

  return send({
    to: opts.to,
    subject: `Your ${opts.orgName} subscription has been canceled`,
    html,
    tags: [{ name: "type", value: "subscription_canceled" }],
  });
}

/**
 * Upcoming invoice notification — sent ~3 days before next charge.
 * Trigger: billing.invoice.upcoming
 */
export async function sendUpcomingInvoiceEmail(opts: {
  to: string;
  orgName: string;
  amountDue: number;
  currency?: string;
  billingUrl?: string;
}): Promise<SendResult> {
  const currency = opts.currency ?? "USD";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(opts.amountDue / 100);
  const billingUrl = opts.billingUrl ?? "https://app.nebutra.ai/settings/billing";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Upcoming Payment</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      A payment of <strong>${formatted}</strong> for <strong>${opts.orgName}</strong>
      will be charged to your payment method in the next few days.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      No action is required. If you'd like to review or update your billing details:
    </p>
    <a href="${billingUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 16px;">
      View Billing →
    </a>
    `,
    `Upcoming payment of ${formatted} for ${opts.orgName}`,
  );

  return send({
    to: opts.to,
    subject: `Upcoming payment: ${formatted} for ${opts.orgName}`,
    html,
    tags: [{ name: "type", value: "upcoming_invoice" }],
  });
}

/**
 * Plan changed — upgrade or downgrade notification.
 * Trigger: billing.subscription.plan_changed
 */
export async function sendPlanChangedEmail(opts: {
  to: string;
  firstName: string;
  orgName: string;
  newPlan: string;
  dashboardUrl?: string;
}): Promise<SendResult> {
  const dashboardUrl = opts.dashboardUrl ?? "https://app.nebutra.ai";

  const html = baseLayout(
    `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Plan Updated</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
      Hi ${opts.firstName}, the plan for <strong>${opts.orgName}</strong> has been changed to
      <strong style="color:#0033FE;">${opts.newPlan}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Your feature access and quotas have been updated accordingly. The change takes effect immediately.
    </p>
    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#0033FE,#0BF1C3);color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:600;margin:0 0 16px;">
      View Dashboard →
    </a>
    `,
    `${opts.orgName} plan changed to ${opts.newPlan}`,
  );

  return send({
    to: opts.to,
    subject: `Plan updated: ${opts.orgName} is now on ${opts.newPlan}`,
    html,
    tags: [{ name: "type", value: "plan_changed" }],
  });
}

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
