import { describe, expect, it } from "vitest";
import { type ApprovalGate, type ModelInvoker, runTurn } from "../loop";
import { type RolloutLine, replay } from "../rollout";
import { PersistentRolloutStore } from "../rollout-store-persistent";
import { ToolRegistry } from "../tools";
import { createPrismaRolloutPersistence, type PrismaRolloutDelegate } from "./prisma-rollout.js";

/** In-memory fake mirroring the agent_rollout_lines table semantics. */
function fakeDelegate() {
  const rows: { tenantId: string; threadId: string; seq: number; at: Date; payload: string }[] = [];
  const delegate: PrismaRolloutDelegate = {
    async create({ data }) {
      if (
        rows.some(
          (r) => r.tenantId === data.tenantId && r.threadId === data.threadId && r.seq === data.seq,
        )
      ) {
        // Mirrors the unique (tenant,thread,seq) constraint — fail loud.
        throw new Error("unique constraint violation");
      }
      rows.push({ ...data });
      return data;
    },
    async findMany({ where }) {
      return rows
        .filter((r) => r.tenantId === where.tenantId && r.threadId === where.threadId)
        .sort((a, b) => a.seq - b.seq)
        .map((r) => ({ seq: r.seq, payload: r.payload }));
    },
  };
  return { delegate, rows };
}

const line = (tenantId: string, threadId: string): RolloutLine => ({
  tenantId,
  threadId,
  type: "session_meta",
  config: {
    model: "m",
    provider: "p",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  },
  at: new Date().toISOString(),
});

describe("createPrismaRolloutPersistence", () => {
  it("round-trips through PersistentRolloutStore and replays faithfully", async () => {
    const { delegate } = fakeDelegate();
    const store = new PersistentRolloutStore(createPrismaRolloutPersistence(delegate));
    await store.append(line("org_a", "th_1"));
    await store.append({
      tenantId: "org_a",
      threadId: "th_1",
      type: "event",
      at: new Date().toISOString(),
      event: { type: "item.completed", item: { id: "i1", type: "agent_message", text: "hi" } },
    });
    const proj = replay(await store.read("org_a", "th_1"));
    expect(proj?.items.map((i) => i.id)).toEqual(["i1"]);
  });

  it("isolates tenants — B cannot read A's thread", async () => {
    const { delegate } = fakeDelegate();
    const store = new PersistentRolloutStore(createPrismaRolloutPersistence(delegate));
    await store.append(line("org_a", "th_1"));
    expect(await store.read("org_b", "th_1")).toHaveLength(0);
  });

  it("fails loud on a persistence rejection (never silently drops)", async () => {
    const failing: PrismaRolloutDelegate = {
      async create() {
        throw new Error("db down");
      },
      async findMany() {
        return [];
      },
    };
    const port = createPrismaRolloutPersistence(failing);
    await expect(
      port.put({
        tenantId: "t",
        threadId: "th",
        seq: 0,
        at: new Date().toISOString(),
        payload: "{}",
      }),
    ).rejects.toThrow("db down");
  });

  it("fails closed on empty tenant / bad timestamp", async () => {
    const { delegate } = fakeDelegate();
    const port = createPrismaRolloutPersistence(delegate);
    await expect(
      port.put({ tenantId: "", threadId: "th", seq: 0, at: "x", payload: "{}" }),
    ).rejects.toBeTruthy();
    await expect(
      port.put({ tenantId: "t", threadId: "th", seq: 0, at: "not-a-date", payload: "{}" }),
    ).rejects.toThrow(/invalid timestamp/);
  });

  it("resolves a per-tenant delegate (RLS client per call)", async () => {
    const a = fakeDelegate();
    const b = fakeDelegate();
    const port = createPrismaRolloutPersistence((tenantId) =>
      tenantId === "org_a" ? a.delegate : b.delegate,
    );
    await port.put({
      tenantId: "org_a",
      threadId: "th",
      seq: 0,
      at: new Date().toISOString(),
      payload: "{}",
    });
    expect(a.rows).toHaveLength(1);
    expect(b.rows).toHaveLength(0);
  });

  it("drives a full turn whose rollout survives in the durable backend", async () => {
    const { delegate, rows } = fakeDelegate();
    const store = new PersistentRolloutStore(createPrismaRolloutPersistence(delegate));
    const model: ModelInvoker = {
      async invoke() {
        return { emissions: [{ kind: "text", text: "done" }] };
      },
    };
    const gate: ApprovalGate = {
      async request() {
        return { kind: "denied" };
      },
    };
    const events = [];
    for await (const e of runTurn("hi", {
      tenantId: "org_a",
      threadId: "th_x",
      config: {
        model: "m",
        provider: "p",
        approvalPolicy: "on_request",
        capabilityPolicy: "external_sandbox",
      },
      approvalPolicy: { kind: "on_request" },
      model,
      tools: new ToolRegistry(),
      store,
      approvalGate: gate,
    })) {
      events.push(e);
    }
    expect(rows.length).toBe(events.length);
    expect(rows.every((r) => r.tenantId === "org_a")).toBe(true);
  });
});
