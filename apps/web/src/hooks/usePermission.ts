"use client";

import { useOrganization } from "@nebutra/auth/client";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type Role,
  resolveRole,
  type Scope,
} from "@/lib/permissions";

interface UsePermissionReturn {
  /** The resolved role for the current org member. */
  role: Role;
  /** True while auth provider is still loading membership data. */
  isLoading: boolean;
  /** Check a single scope. */
  can: (scope: Scope) => boolean;
  /** Check that ALL listed scopes are granted. */
  canAll: (scopes: Scope[]) => boolean;
  /** Check that ANY of the listed scopes is granted. */
  canAny: (scopes: Scope[]) => boolean;
}

/**
 * Client-side hook for permission checks based on the current org role.
 * Uses provider-agnostic auth from @nebutra/auth.
 *
 * Usage:
 *   const { can, role } = usePermission();
 *   if (can("project:delete")) { ... }
 */
export function usePermission(): UsePermissionReturn {
  const { membership, isLoaded } = useOrganization();

  const role = resolveRole(membership?.role);

  return {
    role,
    isLoading: !isLoaded,
    can: (scope) => hasPermission(role, scope),
    canAll: (scopes) => hasAllPermissions(role, scopes),
    canAny: (scopes) => hasAnyPermission(role, scopes),
  };
}
