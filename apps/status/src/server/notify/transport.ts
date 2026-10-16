/**
 * Sending one rendered notice. Bots and webhooks are HTTP POSTs (signed where
 * the platform supports it); email goes over SMTP when STATUS_SMTP_URL is set.
 *
 * Subscriber URLs come from the public, so every outbound request is checked
 * against server-side request forgery: bot channels only reach their vendor's
 * hosts, and generic webhooks must be https to a public address unless the
 * operator opts in with STATUS_WEBHOOK_ALLOW_PRIVATE=on.
 */
import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Channel, EmailMessage, RenderedPayload } from "./messages";

export class DeliveryError extends Error {
  constructor(
    message: string,
    /** False when retrying cannot help (a refused target, a malformed URL). */
    readonly retryable = true,
  ) {
    super(message);
  }
}

/** Each bot channel's vendor hosts; a subscriber cannot point a bot channel anywhere else. */
export const BOT_HOSTS: Record<Exclude<Channel, "email" | "webhook">, string[]> = {
  feishu: ["open.feishu.cn", "open.larksuite.com"],
  dingtalk: ["oapi.dingtalk.com"],
  wecom: ["qyapi.weixin.qq.com"],
  slack: ["hooks.slack.com"],
};

function allowPrivate(): boolean {
  return process.env.STATUS_WEBHOOK_ALLOW_PRIVATE?.trim().toLowerCase() === "on";
}

/** Loopback, private, link-local, CGNAT, multicast, unspecified — v4 and v6. */
export function isPrivateAddress(address: string): boolean {
  const v4 = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(v4) === 4) {
    const [a = 0, b = 0] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff")
  );
}

/**
 * Check a subscriber target without network access. Returns an error code, or
 * null when the URL is acceptable for the channel.
 */
export function checkTarget(channel: Channel, target: string): string | null {
  if (channel === "email") return null;
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return "invalid_url";
  }
  if (url.username || url.password) return "invalid_url";
  if (channel === "webhook") {
    if (allowPrivate())
      return url.protocol === "https:" || url.protocol === "http:" ? null : "invalid_url";
    if (url.protocol !== "https:") return "https_required";
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
      return "private_address";
    }
    if (isIP(host) && isPrivateAddress(host)) return "private_address";
    return null;
  }
  if (url.protocol !== "https:") return "https_required";
  return BOT_HOSTS[channel].includes(url.hostname) ? null : "host_not_allowed";
}

/** Resolve at send time too: a public name can point at a private address. */
async function assertPublicHost(url: URL, resolve: Transport["resolve"]): Promise<void> {
  if (allowPrivate()) return;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  if (isIP(host)) addresses = [host];
  else {
    try {
      addresses = await resolve(host);
    } catch {
      throw new DeliveryError(`Cannot resolve ${host}`);
    }
  }
  if (addresses.some((a) => isPrivateAddress(a))) {
    throw new DeliveryError("Target resolves to a private address", false);
  }
}

async function dnsResolve(host: string): Promise<string[]> {
  return (await lookup(host, { all: true })).map((a) => a.address);
}

/** Feishu custom bot: HMAC-SHA256 keyed by `${timestamp}\n${secret}` over "", base64 (from notify.ts). */
export function feishuSign(timestampSeconds: number, secret: string): string {
  return createHmac("sha256", `${timestampSeconds}\n${secret}`).update("").digest("base64");
}

/** DingTalk custom robot: HMAC-SHA256 keyed by the secret over `${timestampMs}\n${secret}`, base64. */
export function dingtalkSign(timestampMs: number, secret: string): string {
  return createHmac("sha256", secret).update(`${timestampMs}\n${secret}`).digest("base64");
}

/** Generic webhooks: `t=<seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. */
export function webhookSignature(timestampSeconds: number, body: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
  return `t=${timestampSeconds},v1=${mac}`;
}

export interface SendTarget {
  channel: Channel;
  target: string;
  secret: string | null;
}

export interface Transport {
  fetch: typeof fetch;
  sendMail: (to: string, message: EmailMessage, unsubscribeUrl: string) => Promise<void>;
  /** Host → addresses, for the private-address check. */
  resolve: (host: string) => Promise<string[]>;
  now: () => Date;
}

/** Bot platforms answer 200 with an error code in the body; read it. */
function platformError(channel: Channel, text: string): string | null {
  if (channel === "slack") return text.trim() === "ok" ? null : text.slice(0, 200);
  if (channel === "webhook") return null;
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const code = body.code ?? body.StatusCode ?? body.errcode;
    if (code === undefined || code === 0) return null;
    return `code ${String(code)}: ${String(body.msg ?? body.StatusMessage ?? body.errmsg ?? "")}`.slice(
      0,
      200,
    );
  } catch {
    return null;
  }
}

export async function send(
  to: SendTarget,
  payload: RenderedPayload,
  transport: Transport,
  event: string,
): Promise<void> {
  if (payload.channel === "email") {
    await transport.sendMail(to.target, payload.email, payload.unsubscribeUrl);
    return;
  }
  const problem = checkTarget(to.channel, to.target);
  if (problem) throw new DeliveryError(`Target refused: ${problem}`, false);
  const url = new URL(to.target);
  await assertPublicHost(url, transport.resolve);

  const body: Record<string, unknown> = { ...payload.body };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "NebutraStatus/1.0",
  };
  const now = transport.now().getTime();
  if (to.secret && to.channel === "feishu") {
    const ts = Math.floor(now / 1000);
    body.timestamp = String(ts);
    body.sign = feishuSign(ts, to.secret);
  }
  if (to.secret && to.channel === "dingtalk") {
    url.searchParams.set("timestamp", String(now));
    url.searchParams.set("sign", dingtalkSign(now, to.secret));
  }
  const text = JSON.stringify(body);
  if (to.channel === "webhook") {
    headers["x-nebutra-event"] = event;
    if (to.secret) {
      headers["x-nebutra-signature"] = webhookSignature(Math.floor(now / 1000), text, to.secret);
    }
  }

  let response: Response;
  try {
    response = await transport.fetch(url, {
      method: "POST",
      headers,
      body: text,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new DeliveryError(error instanceof Error ? error.message : "Request failed");
  }
  const responseText = await response.text().catch(() => "");
  if (response.status >= 300) {
    // 4xx other than 408/429 will not get better by retrying.
    const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
    throw new DeliveryError(`HTTP ${response.status}`, retryable);
  }
  const platform = platformError(to.channel, responseText);
  if (platform) throw new DeliveryError(platform);
}

// ── SMTP ────────────────────────────────────────────────────────────────────

export function emailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.STATUS_SMTP_URL?.trim() && env.STATUS_MAIL_FROM?.trim());
}

type Mailer = { sendMail(options: Record<string, unknown>): Promise<unknown> };
let mailer: Mailer | null = null;

async function getMailer(): Promise<Mailer> {
  if (mailer) return mailer;
  const url = process.env.STATUS_SMTP_URL?.trim();
  if (!url) throw new DeliveryError("STATUS_SMTP_URL is not set", false);
  const nodemailer = await import("nodemailer");
  mailer = nodemailer.createTransport(url) as unknown as Mailer;
  return mailer;
}

export async function smtpSendMail(
  to: string,
  message: EmailMessage,
  unsubscribeUrl: string,
): Promise<void> {
  const from = process.env.STATUS_MAIL_FROM?.trim();
  if (!from) throw new DeliveryError("STATUS_MAIL_FROM is not set", false);
  const transport = await getMailer();
  await transport.sendMail({
    from,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

export const defaultTransport: Transport = {
  fetch: (input, init) => fetch(input, init),
  sendMail: smtpSendMail,
  resolve: dnsResolve,
  now: () => new Date(),
};
