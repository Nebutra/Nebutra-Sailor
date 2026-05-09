import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

/**
 * Admin impersonation endpoint.
 *
 * POST { userId } → sets a signed HTTP-only cookie `nebutra-impersonate=<userId>.<signature>`
 * DELETE         → clears the cookie
 *
 * TODO(auth-layer-integration): The cookie set here is NOT yet consumed by the
 * server-side auth layer. To complete the impersonation flow, `apps/web/src/lib/auth.ts`
 * (specifically the `getAuth()` resolver) must be wired to:
 *   1. Read `nebutra-impersonate` from the cookie store on each request.
 *   2. Verify its HMAC signature with `BETTER_AUTH_SECRET`.
 *   3. If valid AND the original session belongs to an admin, swap the resolved
 *      `userId` to the impersonated target while preserving an audit trail
 *      (e.g. `impersonatedBy` field).
 *   4. Refuse to elevate privilege — impersonation must drop admin scopes
 *      so the admin sees the target user's exact permission set.
 *
 * This separation keeps the surface area small and avoids merge conflicts with
 * concurrent auth-layer work in flight from parallel subagents. See:
 *   docs/plans/admin-impersonation-rollout.md
 */

const IMPERSONATE_COOKIE = "nebutra-impersonate";
const IMPERSONATE_MAX_AGE_SECONDS = 60 * 30; // 30 minutes

const PostBodySchema = z.object({
  userId: z.string().min(1).max(64),
});

function getSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("BETTER_AUTH_SECRET is not configured for impersonation cookies.");
  }
  return secret;
}

function signPayload(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

/**
 * Verify a signed cookie value of the form `<userId>.<signature>`.
 * Exported for the future auth-layer integration described above.
 */
export function verifyImpersonationCookie(
  raw: string | null | undefined,
  secret: string,
): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = signPayload(payload, secret);
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  return timingSafeEqual(sigBuf, expBuf) ? payload : null;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function buildSetCookie(value: string, maxAgeSeconds: number) {
  const attrs = [
    `${IMPERSONATE_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProduction()) {
    attrs.push("Secure");
  }
  return attrs.join("; ");
}

export async function POST(request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:impersonate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId } = parsed.data;

  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot impersonate yourself." }, { status: 400 });
  }

  let target: { id: string } | null = null;
  try {
    target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  } catch (error) {
    logger.error("[admin.impersonate] Failed to look up target user", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to look up user." }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  let secret: string;
  try {
    secret = getSecret();
  } catch (error) {
    logger.error("[admin.impersonate] Missing or invalid BETTER_AUTH_SECRET", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Impersonation is not configured on this server." },
      { status: 500 },
    );
  }

  const signature = signPayload(target.id, secret);
  const cookieValue = `${target.id}.${signature}`;

  logger.info("[admin.impersonate] Admin started impersonation", {
    actorId: auth.userId,
    targetId: target.id,
  });

  const response = NextResponse.json({ ok: true });
  response.headers.append("set-cookie", buildSetCookie(cookieValue, IMPERSONATE_MAX_AGE_SECONDS));
  return response;
}

export async function DELETE(_request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  logger.info("[admin.impersonate] Impersonation cleared", { actorId: auth.userId });

  const response = NextResponse.json({ ok: true });
  response.headers.append("set-cookie", buildSetCookie("", 0));
  return response;
}
