import { auditLogger } from "@nebutra/audit";
import {
  getConfiguredAuthProvider,
  isCapabilityDeclared,
  isCapabilityEffective,
} from "@nebutra/auth";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

/**
 * Admin impersonation endpoint.
 *
 * Multi-provider contract (option A):
 *   - Declared matrix + runtime probe both must support `impersonation`.
 *   - Today every provider has declared `impersonation: false` → **501**.
 *   - No half-wired cookie path until an adapter implements end-to-end support.
 *
 * DELETE clears any leftover cookie from earlier experiments (safe no-op).
 */

const IMPERSONATE_COOKIE = "nebutra-impersonate";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function buildClearCookie() {
  const attrs = [`${IMPERSONATE_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (isProduction()) {
    attrs.push("Secure");
  }
  return attrs.join("; ");
}

function impersonationUnsupportedResponse() {
  const provider = getConfiguredAuthProvider();
  return NextResponse.json(
    {
      error: "Impersonation is not available for this auth provider.",
      code: "AUTH_CAPABILITY_UNSUPPORTED",
      capability: "impersonation",
      provider,
      declared: isCapabilityDeclared(provider, "impersonation"),
    },
    { status: 501 },
  );
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

  const provider = getConfiguredAuthProvider();
  // Prefer live provider capabilities when present on the auth bag.
  const runtimeCaps =
    auth && typeof auth === "object" && "capabilities" in auth
      ? (auth as { capabilities?: Parameters<typeof isCapabilityEffective>[2] }).capabilities
      : undefined;

  if (!isCapabilityEffective(provider, "impersonation", runtimeCaps ?? null)) {
    // Even when declared true in the future, refuse until effective is true.
    if (!isCapabilityDeclared(provider, "impersonation")) {
      return impersonationUnsupportedResponse();
    }
    return NextResponse.json(
      {
        error: "Impersonation is declared but not mounted on the live auth adapter.",
        code: "AUTH_CAPABILITY_UNAVAILABLE",
        capability: "impersonation",
        provider,
      },
      { status: 501 },
    );
  }

  // Future: adapter-backed impersonation start goes here.
  return impersonationUnsupportedResponse();
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
    resource: { type: "session", id: auth.userId },
  });

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildClearCookie());
  return response;
}
