/**
 * Route-layer permission guard for the gateway.
 *
 * This is a thin re-export of `requirePermission` from `@nebutra/permissions`.
 * It is the PREFERRED guard for new routes that need fine-grained
 * (action, resource) authorization backed by the CASL/OpenFGA engine, as
 * opposed to the coarse-grained `requireRole` guard in `./tenantContext`.
 *
 * The PermissionContext consumed by `requirePermission` is populated on the
 * Hono context (`c.set("user", ...)`) by `tenantContextMiddleware`, which maps
 * the resolved tenant (Clerk `org:` role → prefix-less CASL role) into a
 * `PermissionContext`. As a result, mounting `tenantContextMiddleware` upstream
 * is all that is required for these guards to work.
 *
 * Behaviour (inherited from @nebutra/permissions):
 *   - no `user` context on the request  → 401 `{ error: "Unauthorized" }`
 *   - `PermissionsManager.can(...)` false → 403 `{ error, message }`
 *
 * Usage:
 *   import { requirePermission } from "../../middlewares/permissions.js";
 *   route.use("*", requirePermission("manage", "Integration"));
 */
export {
  attachPermissionContext,
  type RequirePermissionOptions,
  requirePermission,
} from "@nebutra/permissions";
