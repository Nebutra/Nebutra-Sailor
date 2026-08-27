import "server-only";

import { getSystemDb } from "@nebutra/db";
import {
  canPlatform,
  normalizePlatformStaffRole,
  type PlatformAction,
  type PlatformResource,
  type PlatformStaffRole,
} from "@nebutra/permissions";
import { headers } from "next/headers";
import { verifyAccessAssertion } from "./access-assertion";

/**
 * Authorisation for the control plane.
 *
 * Cloudflare Access answers "who is this". This answers "what may they do", and
 * the two are deliberately separate: passing the Access policy proves the person
 * was authenticated, not that they operate the platform. Widening that policy —
 * to a whole email domain, say — must not silently hand anyone the fleet.
 *
 * The grant lives in the PlatformStaff table, which is orthogonal to tenant
 * membership — a tenant `owner` has no standing here, and a platform operator
 * has none inside a tenant. See packages/iam/permissions/src/platform.ts.
 */

// AUDIT(no-tenant): staff grants are platform-scope by definition. The system
// client is correct here; getTenantDb() would scope the lookup to a tenant that
// does not exist for this row.
const db = getSystemDb();

export interface StaffContext {
  /** `users.id` — the id that appears in audit records. */
  userId: string;
  email: string;
  role: PlatformStaffRole;
}

/**
 * IDENTITY COMES FROM THE VERIFIED ACCESS ASSERTION, NOT FROM AN APP SESSION.
 *
 * The original design read a Better Auth session here and mapped it to a `users`
 * row through the SSO account link. That path cannot complete: sso.nebutra.com's
 * login interaction is unimplemented — /oauth/login is a placeholder and nothing
 * in the repo calls interactionFinished — so no session of that kind is ever
 * issued, and this returned null for everyone.
 *
 * Cloudflare Access already authenticates the visitor with Google before a
 * request reaches this process, and signs a JWT saying who they are. Consuming
 * that removes a whole layer whose only job was to re-establish a fact already
 * proven at the edge. The three-layer model is intact: Access is authentication,
 * PlatformStaff is authorisation, and they stay separate — a valid assertion
 * proves the person exists, never that they may operate the platform.
 *
 * Email is the join key because that is what Access asserts and what `users`
 * carries as a unique column. It is only trustworthy because the assertion is
 * signature-verified with a pinned audience; the plaintext
 * Cf-Access-Authenticated-User-Email header is deliberately ignored. See
 * ./access-assertion.
 */
async function resolvePlatformUser(email: string) {
  return db.user.findUnique({ where: { email }, select: { id: true, email: true } });
}

/**
 * Resolves the caller's staff standing, or null. Null means "not staff" for
 * every reason — no session, no grant, a revoked grant, or a role string the
 * permissions package does not recognise. Callers must not distinguish between
 * them: telling an anonymous visitor that an account exists but lacks a grant
 * is a disclosure with no operational benefit.
 */
export async function getStaffContext(): Promise<StaffContext | null> {
  const identity = await verifyAccessAssertion((await headers()).get("cf-access-jwt-assertion"));
  if (!identity) return null;

  // Authenticated at the edge but unknown to the platform. Not an error: the
  // Access policy may admit people who have never been provisioned here.
  const user = await resolvePlatformUser(identity.email);
  if (!user) return null;

  const grant = await db.platformStaff.findUnique({
    where: { userId: user.id },
    select: { role: true, revokedAt: true },
  });

  // Revocation is a tombstone rather than a delete, so the audit trail can still
  // explain an action taken while the grant was live. A tombstoned row must not
  // authorise anything.
  if (!grant || grant.revokedAt !== null) return null;

  const role = normalizePlatformStaffRole(grant.role);
  if (!role) return null;

  return { userId: user.id, email: user.email, role };
}

/**
 * Throws unless the caller holds staff standing. Use at the top of any server
 * component or route handler that reads across tenants.
 */
export async function requireStaff(): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) throw new StaffAccessError("Not a platform staff member.");
  return staff;
}

/**
 * Throws unless the caller may perform this action. Read paths take
 * ("read", resource); every write path must name its own action so the check
 * cannot drift from what the handler actually does.
 */
export async function requirePlatform(
  action: PlatformAction,
  resource: PlatformResource,
): Promise<StaffContext> {
  const staff = await requireStaff();
  if (!canPlatform(staff.role, action, resource)) {
    throw new StaffAccessError(`Role ${staff.role} may not ${action} ${resource}.`);
  }
  return staff;
}

export class StaffAccessError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "StaffAccessError";
  }
}
