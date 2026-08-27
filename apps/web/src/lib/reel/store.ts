/**
 * Demo persistence for the flag-gated Reel route.
 *
 * Process-singleton InMemoryReelGraphStore — enough to demonstrate the typed
 * node-graph + NODE_IO_ENVELOPE + persist-then-return loop without a DB
 * migration. PRODUCTION swaps this for a Prisma-backed ReelGraphStore (one
 * JSON blob per graph + organization_id, same shape the atelier-canvas Prisma
 * adapter uses). See docs/capabilities/reel/REPLICATION_GUIDE.md.
 */

import { InMemoryReelGraphStore } from "@nebutra/reel";

declare global {
  // eslint-disable-next-line no-var
  var __reelStore: InMemoryReelGraphStore | undefined;
}

export const reelStore: InMemoryReelGraphStore =
  globalThis.__reelStore ?? new InMemoryReelGraphStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.__reelStore = reelStore;
}
