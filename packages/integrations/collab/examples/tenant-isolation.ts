/**
 * Example 2 — tenant isolation (security-critical).
 *
 * Two tenants use the SAME roomId. Their docs, snapshot state and transport
 * channels are hard-partitioned: tenant A's edits are unreachable from
 * tenant B even though the room id string is identical.
 *
 * Run: pnpm --filter @nebutra/collab exec tsx examples/tenant-isolation.ts
 */

import { getCollab } from "../src/index";

export async function main(): Promise<void> {
  const hub = await getCollab();

  const roomId = "shared-room-id";
  const a = hub.room("tenantA", roomId);
  const b = hub.room("tenantB", roomId);

  if (a.doc === b.doc) throw new Error("tenant partition breached: shared doc");

  const leaked: unknown[] = [];
  b.onUpdate((u) => leaked.push(u));

  a.doc.getMap("m").set("secret", "A-only");
  await a.snapshot();

  if (b.doc.getMap("m").get("secret") !== undefined) {
    throw new Error("tenant partition breached: B saw A's value");
  }
  if (leaked.length !== 0) {
    throw new Error("tenant partition breached: B received A's update");
  }

  // eslint-disable-next-line no-console
  console.warn("[collab] tenant isolation holds: B never observed A");
  hub.destroy();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
