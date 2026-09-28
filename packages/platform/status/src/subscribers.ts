import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getStatusKv } from "./store";

/**
 * Email subscribers, double opt-in. A request stores a pending entry and a
 * token; only the link in the confirmation email turns it on. Every email
 * carries the subscriber's own unsubscribe link, so the token doubles as the
 * unsubscribe credential and no account is ever needed.
 */

const SUBS_KEY = "status:subs:v1";
const TOKENS_KEY = "status:subs-token:v1";
/** One confirmation email per address per window, whoever asks. */
const RESEND_WINDOW_SECONDS = 600;

export const subscriberEmailSchema = z.string().trim().toLowerCase().email().max(254);

const subscriberSchema = z.object({
  email: z.string(),
  token: z.string(),
  confirmed: z.boolean(),
  createdAt: z.string(),
  confirmedAt: z.string().optional(),
});

export type Subscriber = z.infer<typeof subscriberSchema>;

function parse(raw: string | undefined): Subscriber | null {
  if (!raw) return null;
  try {
    const result = subscriberSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export type SubscribeRequest =
  | { kind: "pending"; subscriber: Subscriber }
  | { kind: "already-confirmed" }
  | { kind: "throttled" };

/**
 * Record a pending subscription and return it for the confirmation email.
 * `throttled` means a confirmation went out recently — say nothing different
 * to the visitor, so the form cannot be used to probe who is subscribed.
 */
export async function requestSubscription(
  rawEmail: string,
  now: Date = new Date(),
): Promise<SubscribeRequest> {
  const email = subscriberEmailSchema.parse(rawEmail);
  const kv = getStatusKv();
  const existing = parse((await kv.hgetall(SUBS_KEY))[email]);
  if (existing?.confirmed) return { kind: "already-confirmed" };
  if (!(await kv.setIfAbsent(`status:subs-rl:v1:${email}`, "1", RESEND_WINDOW_SECONDS))) {
    return { kind: "throttled" };
  }
  const subscriber: Subscriber = existing ?? {
    email,
    token: randomBytes(24).toString("base64url"),
    confirmed: false,
    createdAt: now.toISOString(),
  };
  await kv.hset(SUBS_KEY, email, JSON.stringify(subscriber));
  await kv.hset(TOKENS_KEY, subscriber.token, email);
  return { kind: "pending", subscriber };
}

async function byToken(token: string): Promise<Subscriber | null> {
  const kv = getStatusKv();
  const email = (await kv.hgetall(TOKENS_KEY))[token];
  if (!email) return null;
  return parse((await kv.hgetall(SUBS_KEY))[email]);
}

export async function confirmSubscription(
  token: string,
  now: Date = new Date(),
): Promise<Subscriber | null> {
  const subscriber = await byToken(token);
  if (!subscriber) return null;
  if (subscriber.confirmed) return subscriber;
  const confirmed = { ...subscriber, confirmed: true, confirmedAt: now.toISOString() };
  await getStatusKv().hset(SUBS_KEY, subscriber.email, JSON.stringify(confirmed));
  return confirmed;
}

export async function unsubscribe(token: string): Promise<boolean> {
  const subscriber = await byToken(token);
  if (!subscriber) return false;
  const kv = getStatusKv();
  await kv.hdel(SUBS_KEY, subscriber.email);
  await kv.hdel(TOKENS_KEY, token);
  return true;
}

export async function listConfirmedSubscribers(): Promise<Subscriber[]> {
  const all = await getStatusKv().hgetall(SUBS_KEY);
  return Object.values(all)
    .map(parse)
    .filter((s): s is Subscriber => s?.confirmed === true);
}
