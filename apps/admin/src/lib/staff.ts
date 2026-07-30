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
import { auth, SSO_PROVIDER_ID } from "./auth";

/**
 * Authorisation for the control plane.
 *
 * OIDC answers "who is this". This answers "what may they do", and the two are
 * deliberately separate: a valid session from sso.nebutra.com proves the person
 * exists, not that they operate the platform. Every employee, contractor and
 * test account can obtain one.
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
  /**
   * The platform user id — `users.id`, which is also the OIDC `sub` issued by
   * sso.nebutra.com. This is the id that appears in audit records, NOT the
   * Better Auth id below.
   */
  userId: string;
  /** Better Auth's own row id, for session bookkeeping only. Never an actor id. */
  authUserId: string;
  email: string | null;
  role: PlatformStaffRole;
}

/**
 * TWO ID SPACES, AND THE GRANT LIVES IN ONLY ONE OF THEM.
 *
 * `session.user.id` is an `auth_users.id` — Better Auth's own row, created the
 * first time someone completes the SSO round-trip. `PlatformStaff.userId` is a
 * `users.id`, foreign-keyed to the platform user table. The Prisma schema
 * declares NO relation between auth_users and users, so those ids never
 * coincide, and looking a grant up by the session id would deny everyone
 * forever while looking entirely correct.
 *
 * The bridge is the account link. `AuthAccount.accountId` holds the subject the
 * issuer sent, and packages/iam/oauth-server/src/provider.ts resolves accounts
 * out of `prisma.user` and claims `sub: user.id` — so that subject *is* the
 * platform user id. Unique on (providerId, accountId), so one row, no ordering
 * dependence.
 */
async function resolvePlatformUserId(authUserId: string): Promise<string | null> {
  const account = await db.authAccount.findFirst({
    where: { userId: authUserId, providerId: SSO_PROVIDER_ID },
    select: { accountId: true },
  });
  return account?.accountId ?? null;
}

/**
 * Resolves the caller's staff standing, or null. Null means "not staff" for
 * every reason — no session, no grant, a revoked grant, or a role string the
 * permissions package does not recognise. Callers must not distinguish between
 * them: telling an anonymous visitor that an account exists but lacks a grant
 * is a disclosure with no operational benefit.
 */
export async function getStaffContext(): Promise<StaffContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const authUserId = session?.user?.id;
  if (!authUserId) return null;

  // A session with no SSO account link is not a staff member — it is either a
  // stale row or an account created by some path other than the SSO flow.
  const userId = await resolvePlatformUserId(authUserId);
  if (!userId) return null;

  const grant = await db.platformStaff.findUnique({
    where: { userId },
    select: { role: true, revokedAt: true },
  });

  // Revocation is a tombstone rather than a delete, so the audit trail can still
  // explain an action taken while the grant was live. A tombstoned row must not
  // authorise anything.
  if (!grant || grant.revokedAt !== null) return null;

  const role = normalizePlatformStaffRole(grant.role);
  if (!role) return null;

  return { userId, authUserId, email: session.user.email ?? null, role };
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
