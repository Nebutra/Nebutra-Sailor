/**
 * PlatformStaff guard for the platform control-plane routes the gateway
 * serves directly to the browser (as opposed to `./index.ts`'s `/admin/*`,
 * which is internal-tooling-only behind `X-Admin-Key`).
 *
 * Ported from apps/admin/src/lib/{access-assertion,staff}.ts — same
 * three-layer model (Cloudflare Access authenticates, PlatformStaff
 * authorises, and the two stay separate), reimplemented against a Hono
 * `Context` instead of `next/headers` since this runs in the gateway, not a
 * Next.js request. The logic is unchanged; only the header/DB access shims
 * differ. See docs/architecture/2026-09-29-admin-into-web.md for why this
 * exists as a second copy rather than a shared import: apps/web and the
 * gateway are different runtimes (Next server components vs. Hono), and
 * neither pulls in the other's framework.
 */

import { getSystemDb } from "@nebutra/db";
import {
  canPlatform,
  normalizePlatformStaffRole,
  type PlatformAction,
  type PlatformResource,
  type PlatformStaffRole,
} from "@nebutra/permissions";
import type { Context } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

function envOrNull(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  return raw;
}

const TEAM_DOMAIN = envOrNull("ACCESS_TEAM_DOMAIN") ?? "nebutra.cloudflareaccess.com";
const AUD = envOrNull("ACCESS_AUD");

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function keys() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`));
  }
  return jwks;
}

export interface AccessIdentity {
  email: string;
  sub: string | undefined;
}

/** Verifies the `Cf-Access-Jwt-Assertion` header value. Null covers every
 * failure — no assertion, bad signature, wrong issuer/audience, expired. */
export async function verifyAccessAssertion(
  assertion: string | null | undefined,
): Promise<AccessIdentity | null> {
  if (!assertion) return null;
  if (!AUD) {
    // eslint-disable-next-line no-console
    console.error(
      "[gateway] ACCESS_AUD is not set; refusing to accept any Access assertion for /admin/platform.",
    );
    return null;
  }
  try {
    const { payload } = await jwtVerify(assertion, keys(), {
      issuer: `https://${TEAM_DOMAIN}`,
      audience: AUD,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (!email) return null;
    return { email, sub: typeof payload.sub === "string" ? payload.sub : undefined };
  } catch (error) {
    console.warn(
      `[gateway] Access assertion rejected: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export interface StaffContext {
  userId: string;
  email: string;
  role: PlatformStaffRole;
}

// AUDIT(no-tenant): staff grants are platform-scope by definition, same as
// apps/admin's staff.ts — see that file's note.
const db = getSystemDb();

async function resolvePlatformUser(email: string) {
  return db.user.findUnique({ where: { email }, select: { id: true, email: true } });
}

export async function getStaffContextFromRequest(c: Context): Promise<StaffContext | null> {
  const identity = await verifyAccessAssertion(c.req.header("cf-access-jwt-assertion"));
  if (!identity) return null;
  const user = await resolvePlatformUser(identity.email);
  if (!user) return null;
  const grant = await db.platformStaff.findUnique({
    where: { userId: user.id },
    select: { role: true, revokedAt: true },
  });
  if (!grant || grant.revokedAt !== null) return null;
  const role = normalizePlatformStaffRole(grant.role);
  if (!role) return null;
  return { userId: user.id, email: user.email ?? identity.email, role };
}

export class StaffAccessError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "StaffAccessError";
  }
}

export async function requireStaffFromRequest(c: Context): Promise<StaffContext> {
  const staff = await getStaffContextFromRequest(c);
  if (!staff) throw new StaffAccessError("Not a platform staff member.");
  return staff;
}

export async function requirePlatformFromRequest(
  c: Context,
  action: PlatformAction,
  resource: PlatformResource,
): Promise<StaffContext> {
  const staff = await requireStaffFromRequest(c);
  if (!canPlatform(staff.role, action, resource)) {
    throw new StaffAccessError(`Role ${staff.role} may not ${action} ${resource}.`);
  }
  return staff;
}
