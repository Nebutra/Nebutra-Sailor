"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { Action, PermissionContext, PermissionProvider, Resource } from "./types.js";

interface PermissionContextValue {
  provider: PermissionProvider;
  context: PermissionContext;
}

const PermissionContextReact = createContext<PermissionContextValue | null>(null);

export interface PermissionProviderProps {
  children: ReactNode;
  provider: PermissionProvider;
  context: PermissionContext;
}

export function PermissionProvider({
  children,
  provider,
  context,
}: PermissionProviderProps): JSX.Element {
  const value: PermissionContextValue = useMemo(() => ({ provider, context }), [provider, context]);

  return (
    <PermissionContextReact.Provider value={value}>{children}</PermissionContextReact.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContextReact);
  if (!context) {
    throw new Error("usePermissionContext must be used within a PermissionProvider");
  }
  return context;
}

export interface UsePermissionOptions {
  fallback?: boolean;
}

export function usePermission(action: Action, resource: Resource, subject?: unknown): boolean {
  const { provider, context } = usePermissionContext();

  return useMemo(() => {
    return provider.can(context, action, resource, subject);
  }, [provider, context, action, resource, subject]);
}

export interface CanProps {
  action: Action;
  resource: Resource;
  subject?: unknown;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({
  action,
  resource,
  subject,
  children,
  fallback,
}: CanProps): JSX.Element | null {
  const allowed = usePermission(action, resource, subject);

  if (!allowed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export interface CannotProps {
  action: Action;
  resource: Resource;
  subject?: unknown;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Cannot({
  action,
  resource,
  subject,
  children,
  fallback,
}: CannotProps): JSX.Element | null {
  const allowed = usePermission(action, resource, subject);

  if (allowed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
