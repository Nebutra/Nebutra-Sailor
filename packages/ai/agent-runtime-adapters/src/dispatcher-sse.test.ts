/**
 * Web-standard transport binding tests — no server, no framework.
 *
 * Every test constructs a `new Request(...)` and inspects a `Response` via
 * Web-standard APIs only (`response.text()`, `response.body!.getReader()`).
 */

import { ProtocolDispatcher, type ThreadEvent } from "@nebutra/agent-runtime";
import { describe, expect, it } from "vitest";
import { createRpcHandler, sseResponse, subscribeNotifications } from "./dispatcher-sse.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A dispatcher with one echo handler bound to a real registered method. */
function freshDispatcher(): ProtocolDispatcher {
  const d = new ProtocolDispatcher();
  // `thread/start` is in the method registry; echo its params back.
  d.register("thread/start", async (params) => ({ echoed: params }));
  return d;
}

function jsonRequest(body: unknown): Request {
  return new Request("https://edge.test/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Drain an SSE Response body into its raw decoded text. */
async function drainSse(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

async function* eventsOf(...events: ThreadEvent[]): AsyncIterable<ThreadEvent> {
  for (const e of events) yield e;
}

// ── createRpcHandler ─────────────────────────────────────────────────────────

describe("createRpcHandler", () => {
  it("returns a JSON-RPC success envelope (200, application/json) on happy path", async () => {
    const handler = createRpcHandler(freshDispatcher());
    const res = await handler(
      jsonRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "thread/start",
        tenantId: "org_123",
        params: { hello: "world" },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: { echoed: { hello: "world" } },
    });
  });

  it("returns a well-formed JSON-RPC parse error (400) on malformed JSON — never throws", async () => {
    const handler = createRpcHandler(freshDispatcher());
    const res = await handler(jsonRequest("{ not valid json"));

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBeNull();
    expect(body.error.code).toBe(-32700);
    expect(typeof body.error.message).toBe("string");
  });

  it("fails closed on a missing-tenant envelope (200 JSON-RPC business error)", async () => {
    const handler = createRpcHandler(freshDispatcher());
    const res = await handler(
      jsonRequest({ jsonrpc: "2.0", id: 7, method: "thread/start", params: {} }),
    );

    // Envelope was parseable JSON → 200, but dispatch fails closed.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe(-32600);
  });

  it("returns method-not-found JSON-RPC error for an unknown method", async () => {
    const handler = createRpcHandler(freshDispatcher());
    const res = await handler(
      jsonRequest({ jsonrpc: "2.0", id: 9, method: "totally/unknown", tenantId: "org_1" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error.code).toBe(-32601);
  });
});

// ── sseResponse ──────────────────────────────────────────────────────────────

describe("sseResponse", () => {
  it("sets text/event-stream + no-cache headers", () => {
    const res = sseResponse(eventsOf({ type: "turn.started" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");
  });

  it("streams multiple events in order with correct SSE framing", async () => {
    const stream = eventsOf(
      { type: "thread.started", threadId: "t1" },
      { type: "turn.started" },
      {
        type: "turn.completed",
        usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 2, reasoningOutputTokens: 0 },
      },
    );
    const text = await drainSse(sseResponse(stream));

    const frames = text.split("\n\n").filter(Boolean);
    expect(frames).toHaveLength(3);
    expect(frames[0]).toBe(
      `event: thread.started\ndata: ${JSON.stringify({ type: "thread.started", threadId: "t1" })}`,
    );
    expect(frames[1]).toBe(
      `event: turn.started\ndata: ${JSON.stringify({ type: "turn.started" })}`,
    );
    expect((frames[2] ?? "").startsWith("event: turn.completed\n")).toBe(true);
  });

  it("surfaces a mid-stream iterable error as a final `event: error` frame then closes", async () => {
    async function* boom(): AsyncIterable<ThreadEvent> {
      yield { type: "turn.started" };
      throw new Error("upstream exploded");
    }
    const text = await drainSse(sseResponse(boom()));
    const frames = text.split("\n\n").filter(Boolean);

    expect(frames[0]).toBe(
      `event: turn.started\ndata: ${JSON.stringify({ type: "turn.started" })}`,
    );
    const last = frames.at(-1) ?? "";
    expect(last.startsWith("event: error\n")).toBe(true);
    expect(last).toContain("upstream exploded");
  });

  it("cancels promptly when the provided AbortSignal aborts", async () => {
    const ac = new AbortController();
    let produced = 0;
    async function* infinite(): AsyncIterable<ThreadEvent> {
      for (;;) {
        produced += 1;
        yield { type: "turn.started" };
        if (produced === 2) ac.abort();
        await new Promise((r) => setTimeout(r, 1));
      }
    }
    const res = sseResponse(infinite(), { signal: ac.signal });
    const text = await drainSse(res);
    // Stream terminated; did not run forever.
    expect(text.length).toBeGreaterThan(0);
    expect(produced).toBeLessThan(50);
  });

  it("does not throw when aborted before the first read", async () => {
    const ac = new AbortController();
    ac.abort();
    const res = sseResponse(eventsOf({ type: "turn.started" }), { signal: ac.signal });
    const text = await drainSse(res);
    expect(typeof text).toBe("string");
  });
});

// ── subscribeNotifications ───────────────────────────────────────────────────

describe("subscribeNotifications", () => {
  it("bridges dispatcher notifications into an async iterable", async () => {
    const d = new ProtocolDispatcher();
    const iter = subscribeNotifications(d, ["turn/started", "turn/completed"]);
    const reader = iter[Symbol.asyncIterator]();

    queueMicrotask(() => {
      d.emitNotification("turn/started", { a: 1 });
      d.emitNotification("turn/completed", { b: 2 });
    });

    const first = await reader.next();
    const second = await reader.next();
    expect(first.value).toEqual({ name: "turn/started", payload: { a: 1 } });
    expect(second.value).toEqual({ name: "turn/completed", payload: { b: 2 } });

    await reader.return?.();
  });

  it("stops yielding after return() unsubscribes", async () => {
    const d = new ProtocolDispatcher();
    const iter = subscribeNotifications(d, ["turn/started"]);
    const reader = iter[Symbol.asyncIterator]();
    const done = await reader.return?.();
    expect(done?.done).toBe(true);
    // Emitting after teardown must not throw or buffer indefinitely.
    expect(() => d.emitNotification("turn/started", {})).not.toThrow();
  });
});
