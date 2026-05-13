/**
 * @nebutra/admin-tooling
 *
 * Thin contract layer that lets external admin tools (Retool, Forest Admin,
 * Appsmith, in-house dashboards) safely connect to a Nebutra-Sailor app's
 * internal data without exposing the primary database or bypassing audit.
 *
 * See ./README.md for the engineering pattern this enables.
 */

export {
  type AdminActor,
  type WithAuditHookOptions,
  withAuditHook,
} from "./audit-hook";
export * from "./contract";
export {
  getReadonlyDbUrl,
  type ReadonlyDbProbe,
  type ValidateReadonlyAccessResult,
  validateReadonlyAccess,
} from "./readonly-db";
