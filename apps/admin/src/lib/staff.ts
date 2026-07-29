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
import { auth } from "./auth";

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
  userId: string;
  email: string | null;
  role: PlatformStaffRole;
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
  const userId = session?.user?.id;
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

  return { userId, email: session.user.email ?? null, role };
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
