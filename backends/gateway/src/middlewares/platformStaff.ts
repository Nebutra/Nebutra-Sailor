import {
  canPlatform,
  normalizePlatformStaffRole,
  type PlatformAction,
  type PlatformResource,
  type PlatformStaffRole,
} from "@nebutra/permissions";
import type { PlatformStaffRepository } from "@nebutra/repositories";
import type { Context, MiddlewareHandler } from "hono";

/**
 * Authorisation for platform-level routes: "may THIS person do ACTION to
 * RESOURCE on the platform", decided from their PlatformStaff row on every
 * request. Tenant roles are not consulted (a tenant owner has no standing here)
 * and neither is any role claim the caller sent: the admin console signs a role
 * into its service token, and that claim is deliberately ignored.
 *
 *   401  nobody is signed in
 *   403  signed in but not allowed — no grant, a revoked grant, an unknown role
 *        string and a role too low for the action all read the same, so the
 *        answer never discloses who is staff.
 *
 * On success the route reads the caller from `c.get("platformStaff")`.
 */

export interface PlatformStaffCaller {
  userId: string;
  role: PlatformStaffRole;
}

export type PlatformStaffEnv = { Variables: { platformStaff: PlatformStaffCaller } };

export interface PlatformStaffGuardDeps {
  repo: () => Pick<PlatformStaffRepository, "findActive">;
  caller: (c: Context) => Promise<string | null>;
  /** Called on a refusal for a signed-in caller (never for 401), e.g. to audit the attempt. */
  onDenied?: (
    c: Context,
    caller: { userId: string; role: PlatformStaffRole | null },
  ) => Promise<void>;
}

export function requirePlatformRole(
  deps: PlatformStaffGuardDeps,
  action: PlatformAction,
  resource: PlatformResource,
): MiddlewareHandler<PlatformStaffEnv> {
  return async (c, next) => {
    const userId = await deps.caller(c);
    if (!userId) return c.json({ error: "Sign in first." }, 401);

    const grant = await deps.repo().findActive(userId);
    const role = normalizePlatformStaffRole(grant?.role);

    if (!role || !canPlatform(role, action, resource)) {
      // A caller with a live grant who asked for too much is worth recording;
      // someone with no standing at all is not a staff event.
      if (role) await deps.onDenied?.(c, { userId, role });
      return c.json(
        {
          error: role
            ? `Role ${role} may not ${action} platform staff.`
            : "Not a platform staff member.",
          ...(role ? { code: "forbidden" } : {}),
        },
        403,
      );
    }

    c.set("platformStaff", { userId, role });
    await next();
  };
}
