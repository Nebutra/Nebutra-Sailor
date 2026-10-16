/** Email + password sign-in; sets the `ns_session` cookie. */
import { z } from "zod";
import { sessionCookie, signIn } from "@/server/auth";
import { getDb } from "@/server/db";
import { json, problem, readJson } from "@/server/http";
import { clientIp, LIMITS, limiter, tooManyRequests } from "@/server/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  const body = bodySchema.safeParse(parsed.body);
  if (!body.success) return problem(422, "invalid_input");
  // Every attempt counts against the address; failures count against the
  // email whether or not it belongs to a member, so a 429 reveals nothing.
  const ipKey = `sign-in:ip:${clientIp(request)}`;
  const emailKey = `sign-in:email:${body.data.email.trim().toLowerCase()}`;
  const wait = Math.max(
    limiter.retryAfter(emailKey, LIMITS.signInFailuresPerEmail),
    limiter.take(ipKey, LIMITS.signInPerIp),
  );
  if (wait > 0) return tooManyRequests(wait);
  const session = await signIn(getDb(), body.data.email, body.data.password);
  if (!session) {
    limiter.hit(emailKey);
    return problem(401, "invalid_credentials");
  }
  limiter.reset(emailKey);
  return json(
    { member: session.member },
    { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
  );
}
