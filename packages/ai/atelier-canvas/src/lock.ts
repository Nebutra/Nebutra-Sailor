/**
 * Per-canvas serialization.
 *
 * The generic per-(tenant, resource) serializer now lives in the neutral
 * lower layer `@nebutra/tenant-store` (so `@nebutra/reel` and future
 * tenant-scoped features share it without depending on this package). This
 * module keeps the original `withCanvasLock` / `_resetCanvasLocks` names as
 * thin, back-compatible aliases so existing callers (e.g. apps/web) keep
 * working unchanged.
 *
 * @deprecated Import `withTenantLock` / `_resetTenantLocks` from
 * `@nebutra/tenant-store` directly in new code. These aliases are retained
 * only for the existing public surface.
 */

import { _resetTenantLocks, withTenantLock } from "@nebutra/tenant-store";

/**
 * Run `fn` with exclusive access to a single (tenant, canvas). Calls for the
 * same canvas run strictly in submission order; different canvases run freely.
 *
 * @deprecated Use `withTenantLock` from `@nebutra/tenant-store`.
 */
export function withCanvasLock<T>(
  tenantId: string,
  canvasId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withTenantLock(tenantId, canvasId, fn);
}

/**
 * Test helper — clears all lock chains.
 *
 * @deprecated Use `_resetTenantLocks` from `@nebutra/tenant-store`.
 */
export function _resetCanvasLocks(): void {
  _resetTenantLocks();
}
