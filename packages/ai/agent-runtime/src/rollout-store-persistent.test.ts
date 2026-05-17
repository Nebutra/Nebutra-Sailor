import { describe, expect, it } from "vitest";
import type { ThreadItem } from "./model.js";
import { InMemoryRolloutStore, type RolloutLine, replay } from "./rollout.js";
import {
  PersistentRolloutStore,
  type RolloutPersistencePort,
  RoundTripError,
} from "./rollout-store-persistent.js";

/** In-memory fake satisfying the injectable persistence port. */
class FakePort implements RolloutPersistencePort {
  readonly records = new Map<string, { seq: number; payload: string }[]>();

  #key(tenantId: string, threadId: string): string {
    return `${tenantId}::${threadId}`;
  }

  async put(record: {
    tenantId: string;
    threadId: string;
    seq: number;
    at: string;
    payload: string;
  }): Promise<void> {
    const key = this.#key(record.tenantId, record.threadId);
    const list = this.records.get(key) ?? [];
    list.push({ seq: record.seq, payload: record.payload });
    this.records.set(key, list);
  }

  async list(tenantId: string, threadId: string): Promise<{ seq: number; payload: string }[]> {
    const list = this.records.get(this.#key(tenantId, threadId)) ?? [];
    // Return deliberately shuffled to prove the store re-sorts by seq.
    return [...list].sort(() => Math.random() - 0.5);
  }
}

const T = "org_A";
const TH = "thread_1";

function metaLine(tenantId = T, threadId = TH): RolloutLine {
  return {
    tenantId,
    threadId,
    type: "session_meta",
    config: {
      model: "m",
      provider: "p",
      approvalPolicy: "on_request",
      capabilityPolicy: "external_sandbox",
    },
    at: "2026-05-17T00:00:00.000Z",
  };
}

function eventLine(item: ThreadItem, tenantId = T, threadId = TH): RolloutLine {
  return {
    tenantId,
    threadId,
    type: "event",
    event: { type: "item.completed", item },
    at: "2026-05-17T00:00:01.000Z",
  };
}

function compactedLine(tenantId = T, threadId = TH): RolloutLine {
  return {
    tenantId,
    threadId,
    type: "compacted",
    summary: "earlier history summarized",
    droppedThrough: "item_9",
    at: "2026-05-17T00:00:02.000Z",
  };
}

const msgItem: ThreadItem = {
  id: "item_1",
  type: "agent_message",
  text: "hello world",
};

describe("PersistentRolloutStore round-trip", () => {
  it("round-trips every RolloutLine variant faithfully", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    const lines: RolloutLine[] = [
      metaLine(),
      eventLine(msgItem),
      {
        tenantId: T,
        threadId: TH,
        type: "turn_context",
        config: {
          model: "m2",
          provider: "p2",
          approvalPolicy: "never",
          capabilityPolicy: "read_only",
          reasoningEffort: "high",
        },
        at: "2026-05-17T00:00:03.000Z",
      },
      compactedLine(),
    ];
    for (const l of lines) await store.append(l);
    const read = await store.read(T, TH);
    expect(read).toEqual(lines);
  });

  it("preserves append ordering", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    for (let i = 0; i < 25; i++) {
      await store.append(eventLine({ id: `item_${i}`, type: "agent_message", text: `m${i}` }));
    }
    const read = await store.read(T, TH);
    expect(read.map((l) => (l.type === "event" ? l.event : null))).toEqual(
      Array.from({ length: 25 }, (_, i) => ({
        type: "item.completed",
        item: { id: `item_${i}`, type: "agent_message", text: `m${i}` },
      })),
    );
  });

  it("replay over persistent output equals replay over in-memory", async () => {
    const persistent = new PersistentRolloutStore(new FakePort());
    const memory = new InMemoryRolloutStore();
    const lines: RolloutLine[] = [
      metaLine(),
      eventLine({ id: "i1", type: "agent_message", text: "a" }),
      eventLine({ id: "i2", type: "reasoning", text: "thinking" }),
      compactedLine(),
      eventLine({ id: "i3", type: "agent_message", text: "post" }),
    ];
    for (const l of lines) {
      await persistent.append(l);
      await memory.append(l);
    }
    const pj = replay(await persistent.read(T, TH));
    const mj = replay(await memory.read(T, TH));
    expect(pj).toEqual(mj);
  });
});

describe("PersistentRolloutStore tenant isolation", () => {
  it("tenant B cannot read tenant A's thread", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    await store.append(metaLine("org_A", "shared_thread"));
    await store.append(eventLine(msgItem, "org_A", "shared_thread"));
    const aRead = await store.read("org_A", "shared_thread");
    const bRead = await store.read("org_B", "shared_thread");
    expect(aRead).toHaveLength(2);
    expect(bRead).toEqual([]);
  });

  it("seq is independent per (tenant, thread)", async () => {
    const port = new FakePort();
    const store = new PersistentRolloutStore(port);
    await store.append(metaLine("org_A", "th"));
    await store.append(metaLine("org_B", "th"));
    await store.append(metaLine("org_A", "th"));
    expect(port.records.get("org_A::th")?.map((r) => r.seq)).toEqual([0, 1]);
    expect(port.records.get("org_B::th")?.map((r) => r.seq)).toEqual([0]);
  });
});

describe("PersistentRolloutStore fail-closed", () => {
  it("throws on empty tenantId in append", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    await expect(store.append(metaLine("", TH))).rejects.toThrow();
  });

  it("throws on empty threadId in append", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    await expect(store.append(metaLine(T, ""))).rejects.toThrow();
  });

  it("throws on empty tenantId in read", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    await expect(store.read("", TH)).rejects.toThrow();
  });

  it("throws on empty threadId in read", async () => {
    const store = new PersistentRolloutStore(new FakePort());
    await expect(store.read(T, "")).rejects.toThrow();
  });

  it("throws RoundTripError on malformed stored payload (never silently drops)", async () => {
    const port = new FakePort();
    const store = new PersistentRolloutStore(port);
    await store.append(metaLine());
    port.records.get(`${T}::${TH}`)?.push({ seq: 1, payload: "{not json" });
    await expect(store.read(T, TH)).rejects.toBeInstanceOf(RoundTripError);
  });

  it("throws RoundTripError on structurally-invalid stored payload", async () => {
    const port = new FakePort();
    const store = new PersistentRolloutStore(port);
    await store.append(metaLine());
    port.records.get(`${T}::${TH}`)?.push({ seq: 1, payload: JSON.stringify({ type: "bogus" }) });
    await expect(store.read(T, TH)).rejects.toBeInstanceOf(RoundTripError);
  });
});

describe("PersistentRolloutStore concurrency", () => {
  it("concurrent appends to the same thread do not collide on seq", async () => {
    const port = new FakePort();
    const store = new PersistentRolloutStore(port);
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        store.append(eventLine({ id: `c_${i}`, type: "agent_message", text: `${i}` })),
      ),
    );
    const seqs = (port.records.get(`${T}::${TH}`) ?? []).map((r) => r.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, i) => i));
    const read = await store.read(T, TH);
    expect(read).toHaveLength(50);
  });
});
