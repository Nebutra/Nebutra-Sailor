import { createHmac } from "node:crypto";
import { logger } from "@nebutra/logger";
import type { StatusIncident } from "./incidents";

/**
 * Chat channels are outputs of the incident core, not part of it: every write
 * fans out to whichever webhooks are configured, and a failed post never fails
 * the write. Feishu first (custom bot, optional signing secret), Slack second
 * (incoming webhook) — the same card in each tool's own format.
 *
 *   STATUS_FEISHU_WEBHOOK_URL  / STATUS_FEISHU_WEBHOOK_SECRET
 *   STATUS_SLACK_WEBHOOK_URL
 *   STATUS_PUBLIC_ORIGIN       where card buttons and feed entries link to
 */

export type IncidentEvent = "created" | "updated";

const STATUS_WORD: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const FEISHU_TEMPLATE: Record<StatusIncident["impact"], string> = {
  none: "grey",
  minor: "yellow",
  major: "orange",
  critical: "red",
};

export function incidentUrl(
  incident: StatusIncident,
  origin = process.env.STATUS_PUBLIC_ORIGIN ?? "",
): string {
  return `${origin.replace(/\/+$/, "")}/incidents/${incident.id}`;
}

function headline(incident: StatusIncident, event: IncidentEvent): string {
  const label =
    incident.kind === "maintenance"
      ? "Maintenance"
      : incident.status === "resolved"
        ? "Resolved"
        : event === "created"
          ? "New incident"
          : "Update";
  return `[${label}] ${incident.title}`;
}

function latestMessage(incident: StatusIncident): string {
  return incident.updates.at(-1)?.message ?? incident.message;
}

export function feishuPayload(incident: StatusIncident, event: IncidentEvent, origin?: string) {
  const status = STATUS_WORD[incident.status] ?? incident.status;
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: incident.status === "resolved" ? "green" : FEISHU_TEMPLATE[incident.impact],
        title: { tag: "plain_text", content: headline(incident, event) },
      },
      elements: [
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**Status**\n${status}` } },
            { is_short: true, text: { tag: "lark_md", content: `**Impact**\n${incident.impact}` } },
          ],
        },
        { tag: "div", text: { tag: "lark_md", content: latestMessage(incident) } },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { tag: "plain_text", content: "View on status page" },
              type: "default",
              url: incidentUrl(incident, origin),
            },
          ],
        },
      ],
    },
  };
}

export function slackPayload(incident: StatusIncident, event: IncidentEvent, origin?: string) {
  const title = headline(incident, event);
  const status = STATUS_WORD[incident.status] ?? incident.status;
  return {
    text: title,
    blocks: [
      { type: "header", text: { type: "plain_text", text: title } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Status*\n${status}` },
          { type: "mrkdwn", text: `*Impact*\n${incident.impact}` },
        ],
      },
      { type: "section", text: { type: "mrkdwn", text: latestMessage(incident) } },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View on status page" },
            url: incidentUrl(incident, origin),
          },
        ],
      },
    ],
  };
}

/** Feishu custom-bot signature: HMAC-SHA256 keyed by `${timestamp}\n${secret}` over "". */
export function feishuSign(timestamp: number, secret: string): string {
  return createHmac("sha256", `${timestamp}\n${secret}`).update("").digest("base64");
}

async function post(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function notifyIncident(
  incident: StatusIncident,
  event: IncidentEvent,
  options: { origin?: string } = {},
) {
  const jobs: Array<Promise<void>> = [];

  const feishu = process.env.STATUS_FEISHU_WEBHOOK_URL;
  if (feishu) {
    const body: Record<string, unknown> = feishuPayload(incident, event, options.origin);
    const secret = process.env.STATUS_FEISHU_WEBHOOK_SECRET;
    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000);
      body.timestamp = String(timestamp);
      body.sign = feishuSign(timestamp, secret);
    }
    jobs.push(post(feishu, body));
  }

  const slack = process.env.STATUS_SLACK_WEBHOOK_URL;
  if (slack) jobs.push(post(slack, slackPayload(incident, event, options.origin)));

  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn("status incident notification failed", { error: String(result.reason) });
    }
  }
}
