import { logger } from "@nebutra/logger";
import { tokenColor } from "@nebutra/tokens/values";
import type { StatusIncident } from "./incidents";
import type { ServiceState } from "./math";
import { trimTrailingSlashes } from "./notify";
import { listConfirmedSubscribers, type Subscriber } from "./subscribers";

/**
 * Email is an output like chat: the host app injects the sender (so this
 * package stays free of any provider), and a failed send never fails the
 * write that triggered it.
 *
 *   STATUS_ALERT_EMAILS  comma-separated operators who get probe alerts
 */

export interface StatusMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export type StatusMailer = (mail: StatusMail) => Promise<void>;

export interface StatusMailContext {
  mailer: StatusMailer;
  /** Public origin of the status page, e.g. https://status.example.com */
  origin: string;
  /** Shown in subjects and headers, e.g. "Acme" */
  pageName: string;
}

const trimOrigin = trimTrailingSlashes;

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Email clients read no stylesheet, so the house tokens are resolved to values here. */
const C = {
  canvas: tokenColor("--background"),
  card: "#ffffff",
  border: tokenColor("--border"),
  ink: tokenColor("--foreground"),
  body: tokenColor("--neutral-11"),
  muted: tokenColor("--muted-foreground"),
  action: tokenColor("--primary"),
  actionInk: tokenColor("--primary-foreground"),
};

/** One quiet layout for every status email: title, body, one action, footer. */
function layout(opts: {
  title: string;
  body: string;
  action?: { label: string; href: string };
  footer: string;
}): string {
  const action = opts.action
    ? `<p style="margin:24px 0 0"><a href="${escape(opts.action.href)}" style="display:inline-block;background:${C.action};color:${C.actionInk};text-decoration:none;font-weight:500;font-size:14px;padding:10px 16px;border-radius:8px">${escape(opts.action.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:${C.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${C.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.border};border-radius:12px">
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:18px;font-weight:600;line-height:1.4">${escape(opts.title)}</h1>
<div style="font-size:15px;line-height:1.6;color:${C.body}">${opts.body}</div>
${action}
</td></tr></table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:${C.muted}">${opts.footer}</p>
</td></tr></table></body></html>`;
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${escape(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

async function deliver(ctx: StatusMailContext, mails: StatusMail[]): Promise<void> {
  const results = await Promise.allSettled(mails.map((m) => ctx.mailer(m)));
  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn("status email failed", { error: String(result.reason) });
    }
  }
}

// ── Subscription ────────────────────────────────────────────────────────────

export function confirmationMail(ctx: StatusMailContext, subscriber: Subscriber): StatusMail {
  const origin = trimOrigin(ctx.origin);
  const confirm = `${origin}/subscription?action=confirm&token=${subscriber.token}`;
  return {
    to: subscriber.email,
    subject: `Confirm your subscription to ${ctx.pageName} Status`,
    text: `Confirm to get an email when ${ctx.pageName} has an incident or scheduled maintenance:\n${confirm}\n\nIf you did not ask for this, ignore this email.`,
    html: layout({
      title: `Confirm your subscription`,
      body: paragraphs(
        `You asked to get an email when ${ctx.pageName} has an incident or scheduled maintenance.`,
      ),
      action: { label: "Confirm subscription", href: confirm },
      footer: "If you did not ask for this, ignore this email and nothing will be sent.",
    }),
  };
}

export async function sendConfirmation(
  ctx: StatusMailContext,
  subscriber: Subscriber,
): Promise<void> {
  await deliver(ctx, [confirmationMail(ctx, subscriber)]);
}

// ── Incident updates ────────────────────────────────────────────────────────

const STATUS_WORD: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export function incidentMail(
  ctx: StatusMailContext,
  incident: StatusIncident,
  subscriber: Subscriber,
): StatusMail {
  const origin = trimOrigin(ctx.origin);
  const url = `${origin}/incidents/${incident.id}`;
  const unsubscribe = `${origin}/subscription?action=unsubscribe&token=${subscriber.token}`;
  const latest = incident.updates.at(-1);
  const state =
    incident.kind === "maintenance"
      ? "Maintenance"
      : (STATUS_WORD[latest?.status ?? incident.status] ?? incident.status);
  const message = latest?.message ?? incident.message;
  return {
    to: subscriber.email,
    subject: `[${ctx.pageName} Status] ${state}: ${incident.title}`,
    text: `${state}: ${incident.title}\n\n${message}\n\n${url}\n\nUnsubscribe: ${unsubscribe}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: layout({
      title: `${state}: ${incident.title}`,
      body: paragraphs(message),
      action: { label: "View on status page", href: url },
      footer: `You get this because you subscribed to ${escape(ctx.pageName)} Status. <a href="${escape(unsubscribe)}" style="color:${C.muted}">Unsubscribe</a>`,
    }),
  };
}

export async function emailSubscribers(
  ctx: StatusMailContext,
  incident: StatusIncident,
): Promise<void> {
  const subscribers = await listConfirmedSubscribers();
  await deliver(
    ctx,
    subscribers.map((s) => incidentMail(ctx, incident, s)),
  );
}

// ── Operator alerts ─────────────────────────────────────────────────────────

export interface StateChange {
  id: string;
  name: string;
  from: ServiceState;
  to: ServiceState;
  note: string;
}

export function alertRecipients(): string[] {
  return (process.env.STATUS_ALERT_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function alertMail(ctx: StatusMailContext, to: string, changes: StateChange[]): StatusMail {
  const down = changes.filter((c) => c.to !== "operational");
  const subject =
    down.length > 0
      ? `[${ctx.pageName} alert] ${down.map((c) => `${c.name} ${c.to}`).join(", ")}`
      : `[${ctx.pageName} alert] Recovered: ${changes.map((c) => c.name).join(", ")}`;
  const lines = changes.map((c) => `${c.name}: ${c.from} → ${c.to} (${c.note})`);
  return {
    to,
    subject,
    text: `${lines.join("\n")}\n\n${trimOrigin(ctx.origin)}`,
    html: layout({
      title: subject.replace(/^\[[^\]]+\] /, ""),
      body: `<ul style="margin:0;padding-left:18px">${lines.map((l) => `<li>${escape(l)}</li>`).join("")}</ul>`,
      action: { label: "Open status page", href: trimOrigin(ctx.origin) },
      footer:
        "Sent by the status probes to STATUS_ALERT_EMAILS. Publish an incident if customers are affected.",
    }),
  };
}

export async function sendAlerts(ctx: StatusMailContext, changes: StateChange[]): Promise<void> {
  if (changes.length === 0) return;
  await deliver(
    ctx,
    alertRecipients().map((to) => alertMail(ctx, to, changes)),
  );
}
