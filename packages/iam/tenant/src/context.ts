import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "@nebutra/logger";
import type { TenantContext } from "./types.js";
import { TenantRequiredError } from "./types.js";

/**
 * AsyncLocalStorage-based tenant context — request-scoped, zero-copy across async boundaries.
 *
 * Each incoming request gets its own isolated context, even across await boundaries.
 * No risk of tenant data leaking between requests or threads.
 */
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Execute a function with a tenant context set.
 *
 * All async operations within `fn` will have access to the same tenant context
 * via `getCurrentTenant()` without passing it as a parameter.
 *
 * @param context The tenant context to set
 * @param fn The function to execute
 * @returns The return value of `fn`
 *
 * @example
 * ```ts
 * const result = await runWithTenant({ id: "org_123" }, async () => {
 *   const tenant = getCurrentTenant();
 *   await doSomething(tenant.id);
 * });
 * ```
 */
export function runWithTenant<T>(context: TenantContext, fn: () => Promise<T> | T): Promise<T> {
  return tenantStorage.run(context, () => {
    // Support both sync and async functions
    const result = fn();
    if (result instanceof Promise) {
      return result;
    }
    return Promise.resolve(result);
  });
}

/**
 * Get the current tenant context from AsyncLocalStorage.
 *
 * Throws `TenantRequiredError` if no tenant context is set.
 *
 * @throws TenantRequiredError if tenant context is not available
 * @returns The current tenant context
 *
 * @example
 * ```ts
 * const tenant = getCurrentTenant();
 * console.log(tenant.id); // "org_123"
 * ```
 */
export function getCurrentTenant(): TenantContext {
  const context = tenantStorage.getStore();

  if (!context) {
    logger.warn("getCurrentTenant() called without active tenant context");
    throw new TenantRequiredError(
      "No tenant context found. Ensure middleware called runWithTenant().",
    );
  }

  return context;
}

/**
 * Get the current tenant context, or null if not set.
 *
 * Useful for optional tenant contexts (public routes, webhooks, etc).
 *
 * @returns The current tenant context, or null if not set
 *
 * @example
 * ```ts
 * const tenant = getTenantOrNull();
 * if (tenant) {
 *   console.log(`Processing for tenant: ${tenant.id}`);
 * } else {
 *   console.log("Public route, no tenant");
 * }
 * ```
 */
export function getTenantOrNull(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Assertion helper that ensures a tenant context is present.
 *
 * Throws a structured error if tenant is missing. Useful as a safety
 * check at the start of tenant-specific handlers.
 *
 * @param tenant The tenant context (or null)
 * @param context Optional context message for the error
 * @throws TenantRequiredError if tenant is null or undefined
 *
 * @example
 * ```ts
 * const tenant = getTenantOrNull();
 * requireTenant(tenant, "DELETE /api/documents/:id");
 * // Safe to use tenant.id from here on
 * ```
 */
export function requireTenant(
  tenant: TenantContext | null | undefined,
  context?: string,
): asserts tenant is TenantContext {
  if (!tenant) {
    const message = context
      ? `Tenant context required for: ${context}`
      : "Tenant context is required";

    logger.warn(message);
    throw new TenantRequiredError(message);
  }
}

/**
 * Get the current tenant ID as a shorthand.
 *
 * Throws if tenant context is not set.
 *
 * @returns The current tenant's ID
 * @throws TenantRequiredError if tenant context is not available
 */
export function getCurrentTenantId(): string {
  return getCurrentTenant().id;
}

/**
 * Get the current tenant ID, or null if not set.
 *
 * @returns The current tenant's ID, or null
 */
export function getTenantIdOrNull(): string | null {
  return getTenantOrNull()?.id ?? null;
}
