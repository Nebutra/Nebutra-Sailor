import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

/**
 * Admin impersonation endpoint.
 *
 * POST { userId } → returns 501 until the auth layer consumes impersonation state
 * DELETE         → clears the cookie
 *
 * TODO(#126 auth-layer-integration): The cookie set here is NOT yet consumed by the
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
const IMPERSONATION_DISABLED_ERROR =
  "Admin impersonation is disabled until auth-layer integration is complete.";

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

export async function POST(_request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:impersonate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ error: IMPERSONATION_DISABLED_ERROR }, { status: 501 });
}

export async function DELETE(request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  logger.info("[admin.impersonate] Impersonation cleared", { actorId: auth.userId });

  await auditLogger(request, {
    actor: { id: auth.userId, type: "user" },
    tenantId: auth.orgId ?? auth.userId,
  }).log({
    action: "admin.impersonate.ended",
    outcome: "success",
    resource: { type: "user", id: auth.userId },
    severity: "warning",
    metadata: { adminUserId: auth.userId },
  });

  const response = NextResponse.json({ ok: true });
  response.headers.append("set-cookie", buildSetCookie("", 0));
  return response;
}
