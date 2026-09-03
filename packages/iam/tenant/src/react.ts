"use client";

import React, { createContext, useContext } from "react";
import type { TenantContext } from "./types.js";
import { TenantRequiredError } from "./types.js";

// =============================================================================
// React Context for Tenant — Client-side multi-tenancy
// =============================================================================

/**
 * React context that provides tenant information to client-side components.
 *
 * Usually populated by middleware that reads the tenant from request headers
 * or URL and passes it as a prop to the Next.js layout or page component.
 */
const TenantContextValue = createContext<TenantContext | null>(null);

/**
 * Provider component that wraps your app with tenant context.
 *
 * @param children Child components to wrap
 * @param value The tenant context value (usually from server)
 *
 * @example
 * ```tsx
 * // layout.tsx
 * import { TenantProvider } from "@nebutra/tenant/react";
 * import { getTenantContext } from "@/lib/tenant-server";
 *
 * export default async function RootLayout() {
 *   const tenant = await getTenantContext();
 *
 *   return (
 *     <TenantProvider value={tenant}>
 *       <MainApp />
 *     </TenantProvider>
 *   );
 * }
 * ```
 */
export function TenantProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TenantContext;
}) {
  if (!value || !value.id) {
    console.warn("TenantProvider: No tenant value provided");
  }

  return React.createElement(TenantContextValue.Provider, { value: value ?? null }, children);
}

/**
 * Hook to access the current tenant context from client-side components.
 *
 * Throws an error if no tenant context is available.
 * Use `useTenantOrNull()` for optional tenant contexts.
 *
 * @returns The current tenant context
 * @throws TenantRequiredError if tenant context is not available
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tenant = useTenant();
 *
 *   return <div>Current tenant: {tenant.id}</div>;
 * }
 * ```
 */
export function useTenant(): TenantContext {
  const context = useContext(TenantContextValue);

  if (!context) {
    throw new TenantRequiredError(
      "useTenant must be used within a TenantProvider that has a tenant value",
    );
  }

  return context;
}

/**
 * Hook to access the current tenant context or null if not available.
 *
 * Useful for components that work in both tenant and non-tenant contexts
 * (e.g., public pages, webhooks, etc).
 *
 * @returns The current tenant context, or null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tenant = useTenantOrNull();
 *
 *   if (!tenant) {
 *     return <div>Public content</div>;
 *   }
 *
 *   return <div>Tenant-specific content for {tenant.id}</div>;
 * }
 * ```
 */
export function useTenantOrNull(): TenantContext | null {
  return useContext(TenantContextValue);
}

/**
 * Hook to get just the tenant ID from context.
 *
 * Shorthand for `useTenant().id`.
 *
 * @returns The current tenant's ID
 * @throws TenantRequiredError if tenant context is not available
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tenantId = useTenantId();
 *
 *   return <div>Tenant: {tenantId}</div>;
 * }
 * ```
 */
export function useTenantId(): string {
  const tenant = useTenant();
  return tenant.id;
}

/**
 * Hook to get just the tenant ID, or null if not available.
 *
 * @returns The current tenant's ID, or null
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tenantId = useTenantIdOrNull();
 *   return <div>{tenantId ? `Tenant: ${tenantId}` : "Public"}</div>;
 * }
 * ```
 */
export function useTenantIdOrNull(): string | null {
  return useTenantOrNull()?.id ?? null;
}

/**
 * Hook to get the tenant's plan tier.
 *
 * @returns The current tenant's plan ("free", "pro", "enterprise"), or undefined
 *
 * @example
 * ```tsx
 * function PremiumFeature() {
 *   const plan = useTenantPlan();
 *
 *   if (plan === "free") {
 *     return <UpgradePrompt />;
 *   }
 *
 *   return <Feature />;
 * }
 * ```
 */
export function useTenantPlan() {
  const tenant = useTenant();
  return tenant.plan;
}

/**
 * Hook to check if a specific feature is enabled for the tenant.
 *
 * @param feature The feature flag name
 * @returns Whether the feature is enabled
 *
 * @example
 * ```tsx
 * function DashboardPage() {
 *   const hasAdvancedAnalytics = useTenantFeature("advanced_analytics");
 *
 *   return (
 *     <>
 *       {hasAdvancedAnalytics && <AdvancedAnalytics />}
 *     </>
 *   );
 * }
 * ```
 */
export function useTenantFeature(feature: string): boolean {
  const tenant = useTenant();
  return tenant.features?.includes(feature) ?? false;
}

/**
 * Hook to get a rate limit or quota for the tenant.
 *
 * @param limitName The limit name (e.g., "requests_per_minute", "storage_gb")
 * @param defaultValue Default value if limit is not set
 * @returns The limit value, or default if not set
 *
 * @example
 * ```tsx
 * function ApiDashboard() {
 *   const rateLimit = useTenantLimit("requests_per_minute", 100);
 *
 *   return <div>Rate limit: {rateLimit} req/min</div>;
 * }
 * ```
 */
export function useTenantLimit(limitName: string, defaultValue?: number): number | undefined {
  const tenant = useTenant();
  return tenant.limits?.[limitName] ?? defaultValue;
}

/**
 * Higher-order component that requires tenant context.
 *
 * Wraps a component and throws an error if no tenant context is available.
 * Useful as a safety check for tenant-specific features.
 *
 * @param Component The component to wrap
 * @param errorFallback Optional fallback component if tenant is missing
 * @returns A wrapped component
 *
 * @example
 * ```tsx
 * function DashboardContent() {
 *   const tenantId = useTenantId();
 *   return <div>Dashboard for {tenantId}</div>;
 * }
 *
 * export default withTenantGuard(DashboardContent);
 * ```
 */
export function withTenantGuard<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: React.ComponentType<{ error: Error }>,
) {
  const WrappedComponent = (props: P) => {
    try {
      // Verify tenant context is available by calling hook
      useTenant();
      return React.createElement(Component, props);
    } catch (err) {
      if (errorFallback) {
        const ErrorComponent = errorFallback;
        return React.createElement(ErrorComponent, { error: err as Error });
      }

      // Re-throw if no fallback provided
      throw err;
    }
  };

  WrappedComponent.displayName = `withTenantGuard(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Component that renders children only if tenant context is available.
 *
 * @param children Children to render if tenant is available
 * @param fallback Optional fallback if tenant is missing
 *
 * @example
 * ```tsx
 * <TenantBoundary fallback={<PublicPage />}>
 *   <DashboardPage />
 * </TenantBoundary>
 * ```
 */
export function TenantBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const tenant = useTenantOrNull();

  if (!tenant) {
    return React.createElement(
      React.Fragment,
      null,
      fallback ?? React.createElement("div", null, "No tenant context available"),
    );
  }

  return React.createElement(React.Fragment, null, children);
}
