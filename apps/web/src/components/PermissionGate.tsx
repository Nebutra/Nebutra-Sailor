"use client";

import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { Scope } from "@/lib/permissions";

interface PermissionGateProps {
  /** Scope(s) required to render children. All must match unless `any` is set. */
  require: Scope | Scope[];
  /**
   * When true, children render if the user has ANY of the required scopes.
   * Default: ALL scopes must be granted.
   */
  any?: boolean;
  /** Rendered when the permission check fails. Defaults to null (hidden). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's RBAC permissions.
 *
 * Usage:
 *   <PermissionGate require="project:delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate require={["billing:manage", "settings:update"]} any fallback={<Tooltip content="Upgrade plan" />}>
 *     <BillingSettings />
 *   </PermissionGate>
 */
export function PermissionGate({
  require,
  any = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { canAll, canAny, isLoading } = usePermission();

  // Don't render anything while Clerk is loading to avoid layout flicker
  if (isLoading) return null;

  const scopes: Scope[] = Array.isArray(require) ? require : [require];
  const granted = any ? canAny(scopes) : canAll(scopes);

  if (!granted) return <>{fallback}</>;

  return <>{children}</>;
}
