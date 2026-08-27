/**
 * @nebutra/collab — multi-tenant, transport-agnostic real-time collaborative
 * sync layer.
 *
 * Sailor already had Pusher pub/sub (fire-and-forget broadcast) but no
 * conflict-free concurrent editing. This package fills that gap with
 * tenant-partitioned CRDT rooms built on Yjs (MIT). It is generic: a
 * node-graph canvas, a rich-text document, or any shared structure binds to
 * a `CollabRoom` and gets convergence for free.
 *
 * Multi-tenancy is NON-NEGOTIABLE. Rooms are hard-partitioned by `tenantId`:
 * a room handle is only ever produced by passing an explicit tenant, the
 * snapshot store and transport are addressed by (tenantId, roomId), and the
 * composite key uses a NUL separator so partitions cannot collide. See
 * `hub.ts` for the structural argument and `__tests__` for the proof.
 *
 * Zero-config: `getCollab()` with no args yields REAL (non-mock) CRDT
 * behaviour via an in-memory snapshot store (composed from
 * `@nebutra/tenant-store`) and an in-process loopback transport. Production
 * swaps a Prisma/Redis `SnapshotStore` and a Pusher/WebSocket
 * `CollabTransport` through the same interfaces (see README).
 *
 * This package keeps itself in the `active` tier of the three-tier module
 * lifecycle by shipping a real in-package caller of the exported factory —
 * see `examples/zero-config-convergence.ts`.
 */

export type { CollabErrorCode, CollabErrorInit } from "./errors";
export { CollabError } from "./errors";
export { createCollab, getCollab } from "./hub";
export { InMemorySnapshotStore } from "./store/memory";
export { LoopbackTransport } from "./transport/loopback";
export type {
  CollabConfig,
  CollabHub,
  CollabRoom,
  CollabTransport,
  DoctorCheck,
  DoctorReport,
  SnapshotStore,
  UpdateListener,
} from "./types";
