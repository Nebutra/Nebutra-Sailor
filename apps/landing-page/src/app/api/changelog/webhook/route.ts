import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sanity webhook payload shape for changelogEntry documents
 */
interface SanityWebhookPayload {
  _id: string;
  _type: string;
  _rev: string;
  version?: string;
  title?: string;
  publishedAt?: string;
  type?: "feature" | "improvement" | "fix" | "breaking" | "security";
  summary?: string;
}

/**
 * POST /api/changelog/webhook
 *
 * Receives webhook payloads from Sanity Studio when a changelogEntry document
 * is published. Validates the signature, extracts data, and fans out notifications
 * to email subscribers, Slack, and external webhooks via Svix.
 *
 * Environment variables:
 * - SANITY_WEBHOOK_SECRET: HMAC signature validation secret (required)
 * - RESEND_API_KEY: Resend API key for email notifications (optional)
 * - RESEND_AUDIENCE_ID: Resend audience ID for subscribers (optional)
 * - SVIX_API_KEY: Svix API key for outbound webhooks (optional)
 * - SLACK_CHANGELOG_WEBHOOK_URL: Slack incoming webhook URL (optional)
 */
export async function POST(req: NextRequest) {
  // 1. VALIDATE WEBHOOK SIGNATURE
  const signature = req.headers.get("sanity-webhook-signature");
  const secret = process.env.SANITY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("[changelog-webhook] SANITY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ ok: true, skipped: "no secret configured" });
  }

  const body = await req.text();

  // Compute HMAC-SHA256 signature for validation
  const crypto = await import("node:crypto");
  const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (signature !== expectedSignature) {
    console.error("[changelog-webhook] Signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    console.error("[changelog-webhook] JSON parse error:", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 2. FILTER FOR CHANGELOG ENTRIES ONLY
  if (payload._type !== "changelogEntry") {
    return NextResponse.json({ ok: true, skipped: "not a changelog entry" });
  }

  if (!payload.version || !payload.title) {
    console.warn("[changelog-webhook] Missing required fields (version, title)");
    return NextResponse.json({ ok: true, skipped: "incomplete changelog entry" });
  }

  // 3. BUILD NOTIFICATION CONTENT
  const title = `v${payload.version}: ${payload.title}`;
  const url = `https://nebutra.com/changelog/${payload.version}`;
  const summary = payload.summary || payload.title;
  const type = payload.type || "feature";

  // 4. FAN-OUT NOTIFICATIONS (best-effort, don't block on failures)
  const notifications: Promise<any>[] = [];

  // 4a. Email via Resend
  if (process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID) {
    notifications.push(
      sendReleaseEmail({ title, url, summary, tag: type, version: payload.version }).catch((e) => {
        console.error("[changelog-webhook] Email failed:", e instanceof Error ? e.message : e);
        return null;
      }),
    );
  }

  // 4b. Outbound webhooks via Svix
  if (process.env.SVIX_API_KEY) {
    notifications.push(
      sendWebhookEvent({ title, url, summary, version: payload.version, type }).catch((e) => {
        console.error(
          "[changelog-webhook] Svix webhook failed:",
          e instanceof Error ? e.message : e,
        );
        return null;
      }),
    );
  }

  // 4c. Slack notification
  if (process.env.SLACK_CHANGELOG_WEBHOOK_URL) {
    notifications.push(
      sendSlackNotification({ title, url, summary, tag: type }).catch((e) => {
        console.error("[changelog-webhook] Slack failed:", e instanceof Error ? e.message : e);
        return null;
      }),
    );
  }

  // 4d. Revalidate changelog pages in Next.js cache
  notifications.push(
    revalidateChangelogPages().catch((e) => {
      console.error("[changelog-webhook] Revalidation failed:", e instanceof Error ? e.message : e);
      return null;
    }),
  );

  // Wait for all notifications to complete (don't block response)
  Promise.allSettled(notifications).then((results) => {
    const _successful = results.filter((r) => r.status === "fulfilled").length;
  });

  return NextResponse.json({
    ok: true,
    version: payload.version,
    notificationChannels: [
      process.env.RESEND_API_KEY ? "email" : null,
      process.env.SVIX_API_KEY ? "webhooks" : null,
      process.env.SLACK_CHANGELOG_WEBHOOK_URL ? "slack" : null,
    ].filter(Boolean),
  });
}

/**
 * Send email notification via Resend to newsletter subscribers
 */
async function sendReleaseEmail({
  title,
  url,
  summary,
  tag,
  version,
}: {
  title: string;
  url: string;
  summary: string;
  tag: string;
  version: string;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!resendApiKey || !audienceId) {
    return;
  }

  const tagLabel: Record<string, string> = {
    feature: "✨ Feature",
    improvement: "🚀 Improvement",
    fix: "🐛 Fix",
    breaking: "⚠️ Breaking",
    security: "🔒 Security",
  };

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { margin-bottom: 20px; }
      .version { font-size: 24px; font-weight: 700; margin-bottom: 10px; color: #0033fe; }
      .tag { display: inline-block; background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
      .summary { font-size: 16px; color: #555; margin-bottom: 20px; }
      .cta { display: inline-block; background: linear-gradient(135deg, #0033fe, #0bf1c3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="version">${title}</div>
        <div class="tag">${tagLabel[tag] || tag.toUpperCase()}</div>
      </div>
      <p class="summary">${summary}</p>
      <a href="${url}" class="cta">View Release Notes</a>
      <div class="footer">
        <p>You're receiving this email because you're subscribed to Nebutra release notifications.</p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "changelog@nebutra.com",
      to: audienceId,
      subject: `${title} is now available`,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error (${response.status}): ${error}`);
  }
}

/**
 * Send outbound webhook event via Svix
 */
async function sendWebhookEvent({
  title,
  url,
  summary,
  version,
  type,
}: {
  title: string;
  url: string;
  summary: string;
  version: string;
  type: string;
}): Promise<void> {
  const svixApiKey = process.env.SVIX_API_KEY;

  if (!svixApiKey) {
    return;
  }

  const response = await fetch("https://api.svix.com/api/v1/message_endpoint/msg_", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${svixApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventType: "changelog.published",
      eventData: {
        version,
        title,
        summary,
        type,
        url,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Svix API error (${response.status}): ${error}`);
  }
}

/**
 * Send notification to Slack channel
 */
async function sendSlackNotification({
  title,
  url,
  summary,
  tag,
}: {
  title: string;
  url: string;
  summary: string;
  tag: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_CHANGELOG_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const tagEmoji: Record<string, string> = {
    feature: "✨",
    improvement: "🚀",
    fix: "🐛",
    breaking: "⚠️",
    security: "🔒",
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${tagEmoji[tag] || "📢"} New Release Published`,
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${title}*\n${summary}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "View Release Notes",
              },
              url,
              action_id: "changelog_view",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Slack API error (${response.status}): ${error}`);
  }
}

/**
 * Revalidate changelog pages in Next.js ISR cache
 */
async function revalidateChangelogPages(): Promise<void> {
  try {
    // Revalidate the main changelog page
    revalidatePath("/changelog");

    // Revalidate using tag-based revalidation for more granular control
    revalidateTag("changelog");
  } catch (_e) {
    // revalidatePath/revalidateTag throw if called outside of a route handler context
    // In production, they're safe; in test environments, they may error
    console.warn("[changelog-webhook] Cache revalidation skipped (not in production context)");
  }
}
