/**
 * First-run setup: create the owner while the instance has no members. Needs
 * STATUS_SETUP_TOKEN; without it setup is closed.
 */
import { AuthError, sessionCookie, setupAvailable, setupOwner } from "@/server/auth";
import { getDb } from "@/server/db";
import { json, problem, readJson } from "@/server/http";
import { clientIp, LIMITS, limiter, tooManyRequests } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  return json({ available: await setupAvailable(getDb()) });
}

export async function POST(request: Request) {
  const wait = limiter.take(`setup:ip:${clientIp(request)}`, LIMITS.setupPerIp);
  if (wait > 0) return tooManyRequests(wait);
  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  try {
    const session = await setupOwner(getDb(), parsed.body as never);
    return json(
      { member: session.member },
      { status: 201, headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
    );
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    const status =
      error.code === "invalid_input"
        ? 422
        : error.code === "already_set_up" || error.code === "setup_disabled"
          ? 409
          : 403;
    return problem(status, error.code, error.message === error.code ? undefined : error.message);
  }
}
