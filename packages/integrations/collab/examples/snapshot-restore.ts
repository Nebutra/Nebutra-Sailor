/**
 * Example 3 — snapshot + restore across hub lifetimes.
 *
 * Persist a room via the injected SnapshotStore, then hydrate a brand-new
 * hub from the same store. Demonstrates the persist-then-reload contract
 * used by long-lived documents/canvases.
 *
 * Run: pnpm --filter @nebutra/collab exec tsx examples/snapshot-restore.ts
 */

import { createCollab } from "../src/index";
import { InMemorySnapshotStore } from "../src/store/memory";

export async function main(): Promise<void> {
  // A shared store stands in for Prisma/Redis in production.
  const store = new InMemorySnapshotStore();

  const hub1 = createCollab({ store });
  const r1 = hub1.room("t1", "doc-1");
  r1.doc.getText("body").insert(0, "persisted across restarts");
  await r1.snapshot();
  hub1.destroy();

  // New process / new hub, same store.
  const hub2 = createCollab({ store });
  const r2 = await hub2.roomRestored("t1", "doc-1");
  const restored = r2.doc.getText("body").toString();
  if (restored !== "persisted across restarts") {
    throw new Error(`restore failed, got: "${restored}"`);
  }

  // eslint-disable-next-line no-console
  console.warn(`[collab] restored after reload: "${restored}"`);
  hub2.destroy();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
