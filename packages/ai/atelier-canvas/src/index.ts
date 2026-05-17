/**
 * @nebutra/atelier-canvas — server-authoritative creative-canvas engine.
 *
 * The browser owns the rich editing surface; this package owns the two
 * properties that make an agent-driven canvas correct under concurrency and
 * multi-tenancy: deterministic server-side placement, and persist-then-
 * broadcast consistency. Tenant isolation is structural — every store method
 * is scoped by `tenantId`.
 */

export { _resetCanvasLocks, withCanvasLock } from "./lock";
export { findNextPosition } from "./placement";
export {
  type GeneratedAsset,
  placeGeneratedAsset,
} from "./service";
export { InMemoryCanvasStore } from "./store/memory";
export {
  type AtelierCanvasDelegate,
  PrismaCanvasStore,
  type TenantDbLike,
} from "./store/prisma";
export type {
  AtelierCanvas,
  CanvasElement,
  CanvasElementType,
  CanvasFile,
  CanvasScene,
  CanvasStore,
  ElementSize,
  Placement,
  ScenePatch,
} from "./types";
