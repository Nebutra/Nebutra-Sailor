/**
 * Public subscriptions. GET lists the channels this instance can deliver to
 * (email only when SMTP is configured); POST subscribes.
 *
 *   { "channel": "email" | "webhook" | "feishu" | "dingtalk" | "wecom" | "slack",
 *     "target": "<address or bot webhook URL>", "secret": "<optional signing secret>",
 *     "components": ["api"], "locale": "zh-CN" }
 */
import { getDb } from "@/server/db";
import { findPage, json, problem, type RouteContext, readJson } from "@/server/http";
import { availableChannels, SubscribeError, subscribe } from "@/server/notify/outbox";
import { clientIp, LIMITS, limiter, tooManyRequests } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const page = await findPage(getDb(), slug);
  if (!page) return problem(404, "page_not_found");
  return json({ channels: availableChannels() });
}

export async function POST(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const wait = limiter.take(`subscribe:ip:${clientIp(request)}`, LIMITS.subscribePerIp);
  if (wait > 0) return tooManyRequests(wait);
  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");

  const body = parsed.body as { channel?: unknown; target?: unknown } | null;
  if (body?.channel === "email" && typeof body.target === "string") {
    // Bound how many confirmation emails one address can be sent.
    const key = `subscribe:target:${page.id}:${body.target.trim().toLowerCase()}`;
    const targetWait = limiter.take(key, LIMITS.subscribePerTarget);
    if (targetWait > 0) return tooManyRequests(targetWait);
  }

  try {
    const result = await subscribe(db, page, parsed.body as never);
    return json(result, { status: result.status === "active" ? 201 : 202 });
  } catch (error) {
    if (!(error instanceof SubscribeError)) throw error;
    const detail = error.message === error.code ? undefined : error.message;
    return problem(error.code === "email_disabled" ? 409 : 422, error.code, detail);
  }
}
