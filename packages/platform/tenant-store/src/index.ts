/**
 * @nebutra/tenant-store — neutral lowest-layer multi-tenant primitives.
 *
 * Depended on by `@nebutra/atelier-canvas` and `@nebutra/reel` (and new
 * tenant-scoped features); depends on neither. This is the explicit lower
 * contract those siblings share instead of one importing the other.
 */

export { _resetTenantLocks, withTenantLock } from "./lock";
export {
  InMemoryTenantStore,
  type TenantOwned,
  type TenantScopedStore,
} from "./store";
