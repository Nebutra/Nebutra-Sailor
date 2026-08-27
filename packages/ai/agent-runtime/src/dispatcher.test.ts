import { describe, expect, it, vi } from "vitest";
import { ProtocolDispatcher } from "./dispatcher";

function envelope(over: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "model/list",
    tenantId: "org_123",
    ...over,
  };
}

describe("ProtocolDispatcher — envelope validation (fail-closed)", () => {
  it("rejects an envelope missing tenantId with a JSON-RPC error (never throws)", async () => {
    const d = new ProtocolDispatcher();
    const res = await d.dispatch({ jsonrpc: "2.0", id: 7, method: "model/list" });
    expect(res).toMatchObject({ jsonrpc: "2.0", id: 7 });
    expect("error" in res && res.error.code).toBe(-32600);
    expect("result" in res).toBe(false);
  });

  it("rejects an empty tenantId fail-closed", async () => {
    const d = new ProtocolDispatcher();
    const res = await d.dispatch(envelope({ tenantId: "" }));
    expect("error" in res && res.error.code).toBe(-32600);
  });

  it("rejects a completely malformed envelope without throwing", async () => {
    const d = new ProtocolDispatcher();
    const res = await d.dispatch("not-an-object");
    expect("error" in res && res.error.code).toBe(-32600);
    // id falls back to null when unparseable
    expect((res as { id: unknown }).id).toBeNull();
  });
});

describe("ProtocolDispatcher — method lookup", () => {
  it("returns -32601 for an unknown method", async () => {
    const d = new ProtocolDispatcher();
    const res = await d.dispatch(envelope({ method: "does/not-exist" }));
    expect("error" in res && res.error.code).toBe(-32601);
  });

  it("returns -32601 when no handler is registered for a known method", async () => {
    const d = new ProtocolDispatcher();
    const res = await d.dispatch(envelope({ method: "model/list" }));
    expect("error" in res && res.error.code).toBe(-32601);
  });

  it("invokes a registered handler and returns its result", async () => {
    const d = new ProtocolDispatcher();
    d.register("model/list", async () => ({ models: ["a"] }));
    const res = await d.dispatch(envelope());
    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { models: ["a"] },
    });
  });
});

describe("ProtocolDispatcher — scope resolution (fail-closed)", () => {
  it("returns a JSON-RPC error when a thread-scoped method is missing threadId", async () => {
    const d = new ProtocolDispatcher();
    d.register("turn/start", async () => "ok");
    const res = await d.dispatch(envelope({ method: "turn/start", params: {} }));
    expect("error" in res && res.error.code).toBe(-32602);
    expect("result" in res).toBe(false);
  });

  it("passes the resolved thread scope to the handler", async () => {
    const d = new ProtocolDispatcher();
    let seenScope: unknown;
    d.register("turn/start", async (_p, scope) => {
      seenScope = scope;
      return "ok";
    });
    await d.dispatch(envelope({ method: "turn/start", params: { threadId: "th_1" } }));
    expect(seenScope).toEqual({
      tenantId: "org_123",
      kind: "thread",
      threadId: "th_1",
    });
  });
});

describe("ProtocolDispatcher — serialization semantics", () => {
  it("serializes same-scope requests in FIFO order", async () => {
    const d = new ProtocolDispatcher();
    const order: string[] = [];
    d.register("turn/start", async (params) => {
      const p = params as { tag: string; delay: number };
      await new Promise((r) => setTimeout(r, p.delay));
      order.push(p.tag);
      return p.tag;
    });

    const a = d.dispatch(
      envelope({
        method: "turn/start",
        id: "a",
        params: { threadId: "th_same", tag: "A", delay: 40 },
      }),
    );
    const b = d.dispatch(
      envelope({
        method: "turn/start",
        id: "b",
        params: { threadId: "th_same", tag: "B", delay: 1 },
      }),
    );

    await Promise.all([a, b]);
    // B is fast but must wait for A because they share tenant+thread scope.
    expect(order).toEqual(["A", "B"]);
  });

  it("runs distinct-scope requests concurrently", async () => {
    const d = new ProtocolDispatcher();
    const order: string[] = [];
    d.register("turn/start", async (params) => {
      const p = params as { tag: string; delay: number };
      await new Promise((r) => setTimeout(r, p.delay));
      order.push(p.tag);
      return p.tag;
    });

    const slow = d.dispatch(
      envelope({
        method: "turn/start",
        id: "slow",
        params: { threadId: "th_slow", tag: "SLOW", delay: 40 },
      }),
    );
    const fast = d.dispatch(
      envelope({
        method: "turn/start",
        id: "fast",
        params: { threadId: "th_fast", tag: "FAST", delay: 1 },
      }),
    );

    await Promise.all([slow, fast]);
    // Different threads → different scope keys → concurrent; FAST finishes first.
    expect(order).toEqual(["FAST", "SLOW"]);
  });

  it("isolates same-thread ids across different tenants (cross-tenant concurrency)", async () => {
    const d = new ProtocolDispatcher();
    const order: string[] = [];
    d.register("turn/start", async (params) => {
      const p = params as { tag: string; delay: number };
      await new Promise((r) => setTimeout(r, p.delay));
      order.push(p.tag);
      return p.tag;
    });

    const t1 = d.dispatch(
      envelope({
        tenantId: "org_A",
        method: "turn/start",
        id: "t1",
        params: { threadId: "th_shared", tag: "A", delay: 40 },
      }),
    );
    const t2 = d.dispatch(
      envelope({
        tenantId: "org_B",
        method: "turn/start",
        id: "t2",
        params: { threadId: "th_shared", tag: "B", delay: 1 },
      }),
    );

    await Promise.all([t1, t2]);
    expect(order).toEqual(["B", "A"]);
  });
});

describe("ProtocolDispatcher — handler errors", () => {
  it("maps a thrown handler error to JSON-RPC -32603 without leaking a stack", async () => {
    const d = new ProtocolDispatcher();
    d.register("model/list", async () => {
      throw new Error("boom internal");
    });
    const res = await d.dispatch(envelope());
    expect("error" in res && res.error.code).toBe(-32603);
    const msg = ("error" in res && res.error.message) || "";
    expect(msg).toBe("boom internal");
    expect(msg).not.toContain("at ");
  });

  it("recovers the serial lane after a handler throws", async () => {
    const d = new ProtocolDispatcher();
    let calls = 0;
    d.register("turn/start", async () => {
      calls += 1;
      if (calls === 1) throw new Error("first fails");
      return "second ok";
    });
    const first = await d.dispatch(
      envelope({ method: "turn/start", id: "f1", params: { threadId: "th_x" } }),
    );
    const second = await d.dispatch(
      envelope({ method: "turn/start", id: "f2", params: { threadId: "th_x" } }),
    );
    expect("error" in first && first.error.code).toBe(-32603);
    expect("result" in second && second.result).toBe("second ok");
  });
});

describe("ProtocolDispatcher — notifications", () => {
  it("emits to registered listeners for a valid notification name", () => {
    const d = new ProtocolDispatcher();
    const spy = vi.fn();
    d.onNotification("turn/completed", spy);
    d.emitNotification("turn/completed", { turnId: "t1" });
    expect(spy).toHaveBeenCalledWith({ turnId: "t1" });
  });

  it("throws for an unknown notification name (validate name ∈ NOTIFICATIONS)", () => {
    const d = new ProtocolDispatcher();
    expect(() => d.emitNotification("not/a/real/notification" as never, {})).toThrow();
  });

  it("does not invoke listeners bound to a different notification", () => {
    const d = new ProtocolDispatcher();
    const spy = vi.fn();
    d.onNotification("turn/started", spy);
    d.emitNotification("turn/completed", {});
    expect(spy).not.toHaveBeenCalled();
  });
});
