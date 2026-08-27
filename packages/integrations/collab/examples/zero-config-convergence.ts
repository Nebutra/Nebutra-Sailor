/**
 * Example 1 — zero-config CRDT convergence.
 *
 * No env, no config, real (non-mock) Yjs behaviour. This file is also the
 * in-package REAL CALLER of the exported `getCollab` factory that keeps
 * `@nebutra/collab` in the `active` tier of the three-tier module lifecycle.
 *
 * Run: pnpm --filter @nebutra/collab exec tsx examples/zero-config-convergence.ts
 */

import * as Y from "yjs";
import { getCollab } from "../src/index";

export async function main(): Promise<void> {
  const hub = await getCollab();

  // Two clients on the SAME tenant + room.
  const a = hub.room("t1", "doc-1");
  const b = hub.room("t1", "doc-1");
  if (a !== b) throw new Error("same (tenant,room) must yield same instance");

  // A standalone peer doc simulating a second device.
  const peer = new Y.Doc();
  a.doc.getText("body").insert(0, "Hello ");
  Y.applyUpdate(peer, a.encodeState());

  peer.getText("body").insert(6, "collab");
  a.applyUpdate(Y.encodeStateAsUpdate(peer));
  Y.applyUpdate(peer, a.encodeState());

  const converged = a.doc.getText("body").toString();
  if (converged !== peer.getText("body").toString()) {
    throw new Error("clients did not converge");
  }

  // eslint-disable-next-line no-console
  console.warn(`[collab] converged text: "${converged}"`);
  hub.destroy();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
