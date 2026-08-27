/**
 * Demo persistence for the flag-gated Atelier route.
 *
 * A process-singleton InMemoryCanvasStore — sufficient to demonstrate the
 * server-authoritative placement + persist-then-return loop without a DB
 * migration. PRODUCTION swaps this for the Prisma adapter:
 *
 *   import { PrismaCanvasStore } from "@nebutra/atelier-canvas/store/prisma";
 *   import { getTenantDb } from "@nebutra/db";
 *   export const atelierStore = new PrismaCanvasStore(
 *     (t) => getTenantDb(t) as unknown as TenantDbLike,
 *   );
 *
 * See docs/capabilities/atelier/REPLICATION_GUIDE.md.
 */

import { InMemoryCanvasStore } from "@nebutra/atelier-canvas";

declare global {
  // eslint-disable-next-line no-var
  var __atelierStore: InMemoryCanvasStore | undefined;
}

// Survive Next.js dev hot-reload (module re-eval) so the demo scene persists.
export const atelierStore: InMemoryCanvasStore =
  globalThis.__atelierStore ?? new InMemoryCanvasStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.__atelierStore = atelierStore;
}
