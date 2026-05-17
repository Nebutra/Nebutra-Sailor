import { _resetTenantLocks } from "@nebutra/tenant-store";
import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { CollabError, createCollab } from "../index";
import { InMemorySnapshotStore } from "../store/memory";
import { LoopbackTransport } from "../transport/loopback";

describe("CRDT convergence", () => {
  beforeEach(() => _resetTenantLocks());

  it("two clients editing the SAME room converge to identical state", async () => {
    const hub = createCollab();
    const a = hub.room("t1", "r1");

    // A separate client doc, simulating a remote peer on the same logical room.
    const peer = new Y.Doc();

    // Edit on hub side.
    a.doc.getMap("m").set("from", "a");
    // Ship A's update to the peer.
    peer.transact(() => Y.applyUpdate(peer, a.encodeState()));

    // Peer edits concurrently.
    peer.getMap("m").set("from", "b-peer");
    peer.getArray("list").push([1, 2, 3]);

    // Exchange peer -> A.
    a.applyUpdate(Y.encodeStateAsUpdate(peer));
    // Exchange A -> peer (A may have other state).
    Y.applyUpdate(peer, a.encodeState());

    // Both sides must converge to identical serialized state.
    const aState = JSON.stringify(a.doc.getMap("m").toJSON());
    const peerState = JSON.stringify(peer.getMap("m").toJSON());
    expect(aState).toBe(peerState);
    expect(a.doc.getArray("list").toJSON()).toEqual([1, 2, 3]);
  });
});

describe("tenant isolation (security-critical)", () => {
  beforeEach(() => _resetTenantLocks());

  it("room(tenantA) and room(tenantB) with same roomId are independent docs", () => {
    const hub = createCollab();
    const a = hub.room("tenantA", "r1");
    const b = hub.room("tenantB", "r1");

    expect(a.doc).not.toBe(b.doc);

    a.doc.getMap("m").set("secret", "A-only");
    // B's room must NEVER observe A's update.
    expect(b.doc.getMap("m").get("secret")).toBeUndefined();
  });

  it("an update applied to A's room never appears in B's room", () => {
    const hub = createCollab();
    const a = hub.room("tenantA", "r1");
    const b = hub.room("tenantB", "r1");

    const seenByB: Uint8Array[] = [];
    b.onUpdate((u) => seenByB.push(u));

    a.doc.getMap("m").set("x", 1);
    a.applyUpdate(Y.encodeStateAsUpdate(a.doc));

    expect(seenByB).toHaveLength(0);
    expect(b.doc.getMap("m").get("x")).toBeUndefined();
  });

  it("snapshot store for tenant A never returns tenant B state", async () => {
    const store = new InMemorySnapshotStore();
    const hub = createCollab({ store });

    const a = hub.room("tenantA", "shared-room-id");
    a.doc.getMap("m").set("owner", "A");
    await a.snapshot();

    // B asks for the SAME roomId — must get nothing from A.
    const bState = await store.load("tenantB", "shared-room-id");
    expect(bState).toBeNull();

    const aState = await store.load("tenantA", "shared-room-id");
    expect(aState).not.toBeNull();
  });

  it("returns the SAME room instance for repeated (tenant, room) calls", () => {
    const hub = createCollab();
    expect(hub.room("t1", "r1")).toBe(hub.room("t1", "r1"));
    expect(hub.room("t1", "r1")).not.toBe(hub.room("t2", "r1"));
  });
});

describe("transport-driven convergence", () => {
  beforeEach(() => _resetTenantLocks());

  it("separate hubs sharing a transport converge for the same tenant+room", () => {
    const transport = new LoopbackTransport();
    const hubA = createCollab({ transport });
    const hubB = createCollab({ transport });
    const ra = hubA.room("t1", "r1");
    const rb = hubB.room("t1", "r1");

    ra.doc.getMap("m").set("k", "v");
    expect(rb.doc.getMap("m").get("k")).toBe("v");

    // Reverse direction also converges (origin guard prevents a loop).
    rb.doc.getArray("l").push([42]);
    expect(ra.doc.getArray("l").toJSON()).toEqual([42]);

    hubA.destroy();
    hubB.destroy();
  });

  it("a destroyed room throws CollabError COLLAB_DESTROYED", () => {
    const hub = createCollab();
    const r = hub.room("t1", "r1");
    r.destroy();
    try {
      r.encodeState();
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CollabError);
      expect((e as CollabError).code).toBe("COLLAB_DESTROYED");
      expect((e as CollabError).suggestion.length).toBeGreaterThan(0);
    }
  });
});

describe("restore / snapshot failure surfaces CollabError", () => {
  beforeEach(() => _resetTenantLocks());

  it("roomRestored wraps a throwing store load", async () => {
    const store = {
      load: async () => {
        throw new Error("db down");
      },
      save: async () => {},
    };
    const hub = createCollab({ store });
    try {
      await hub.roomRestored("t1", "r1");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CollabError);
      expect((e as CollabError).code).toBe("COLLAB_RESTORE_FAILED");
      expect((e as CollabError).suggestion.length).toBeGreaterThan(0);
    }
  });

  it("snapshot wraps a throwing store save", async () => {
    const store = {
      load: async () => null,
      save: async () => {
        throw new Error("disk full");
      },
    };
    const hub = createCollab({ store });
    const r = hub.room("t1", "r1");
    r.doc.getMap("m").set("a", 1);
    try {
      await r.snapshot();
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CollabError);
      expect((e as CollabError).code).toBe("COLLAB_SNAPSHOT_FAILED");
      expect((e as CollabError).suggestion.length).toBeGreaterThan(0);
    }
  });
});

describe("snapshot + restore", () => {
  beforeEach(() => _resetTenantLocks());

  it("snapshot() then reload restores doc state", async () => {
    const store = new InMemorySnapshotStore();
    const hub1 = createCollab({ store });
    const r1 = hub1.room("t1", "doc1");
    r1.doc.getText("body").insert(0, "hello world");
    await r1.snapshot();

    // Fresh hub, same store — must hydrate from snapshot.
    const hub2 = createCollab({ store });
    const r2 = await hub2.roomRestored("t1", "doc1");
    expect(r2.doc.getText("body").toString()).toBe("hello world");
  });
});

describe("onUpdate subscription", () => {
  beforeEach(() => _resetTenantLocks());

  it("unsubscribe stops further callbacks", () => {
    const hub = createCollab();
    const r = hub.room("t1", "r1");
    const seen: number[] = [];
    const off = r.onUpdate(() => seen.push(1));

    r.doc.getMap("m").set("a", 1);
    expect(seen).toHaveLength(1);

    off();
    r.doc.getMap("m").set("b", 2);
    expect(seen).toHaveLength(1);
  });
});

describe("CollabError", () => {
  it("carries a non-empty suggestion and a code", () => {
    const err = new CollabError("something failed", {
      code: "COLLAB_TEST",
      suggestion: "do the thing differently",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("COLLAB_TEST");
    expect(err.suggestion.length).toBeGreaterThan(0);
  });

  it("throws CollabError with suggestion on empty tenantId", () => {
    const hub = createCollab();
    try {
      hub.room("", "r1");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CollabError);
      expect((e as CollabError).suggestion.length).toBeGreaterThan(0);
    }
  });
});

describe("doctor()", () => {
  it("returns a structured health report in <3s", async () => {
    const hub = createCollab();
    const start = Date.now();
    const report = await hub.doctor();
    expect(Date.now() - start).toBeLessThan(3000);
    expect(report.ok).toBe(true);
    expect(report.checks.yjs.ok).toBe(true);
    expect(report.checks.store.ok).toBe(true);
    expect(report.checks.transport.ok).toBe(true);
  });
});
