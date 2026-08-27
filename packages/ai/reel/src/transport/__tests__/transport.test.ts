/**
 * Transport layer: capability normalization, contract validation (the
 * mismatch rules), and the three executors driven by injected stubs (no
 * real network).
 */

import { describe, expect, it } from "vitest";
import {
  buildDefaultCapabilitySchema,
  executeTransport,
  isContractValid,
  normalizeCapabilitySchema,
  validateTransportContract,
  type WsLike,
} from "../index";

describe("capability schema", () => {
  it("derives defaults from model type", () => {
    expect(buildDefaultCapabilitySchema("Image").supportsMultipart).toBe(true);
    expect(buildDefaultCapabilitySchema("Chat").supportsTools).toBe(true);
    expect(buildDefaultCapabilitySchema("Chat").supportsSSE).toBe(false);
  });
  it("normalizes loose input with strict === true", () => {
    const c = normalizeCapabilitySchema(
      { supportsSSE: 1 as unknown as boolean, supportsWS: true },
      "Chat",
    );
    expect(c.supportsSSE).toBe(false);
    expect(c.supportsWS).toBe(true);
  });
});

describe("contract validator", () => {
  it("flags transport/capability mismatches as errors", () => {
    const issues = validateTransportContract({
      type: "Chat",
      transport: "http-sse",
      capabilities: { supportsSSE: false },
      requestTemplate: { bodyType: "json" },
    });
    expect(issues.some((i) => i.code === "cap_sse" && i.level === "error")).toBe(true);
    expect(
      isContractValid({
        type: "Chat",
        transport: "http-sse",
        capabilities: { supportsSSE: false },
      }),
    ).toBe(false);
  });
  it("passes a coherent entry, warns on soft issues", () => {
    const issues = validateTransportContract({
      type: "Chat",
      transport: "http-sse",
      capabilities: { supportsSSE: true },
      requestTemplate: { bodyType: "json", body: {} },
    });
    expect(issues.every((i) => i.level === "warning")).toBe(true);
    expect(issues.some((i) => i.code === "sse_stream_flag")).toBe(true);
  });
});

describe("executeTransport — http-json", () => {
  it("parses a JSON response via injected fetch", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ ok: 1 }), { status: 200 })) as unknown as typeof fetch;
    const r = await executeTransport(
      { url: "https://x.test/gen", body: { a: 1 } },
      "http-json",
      undefined,
      { fetchImpl },
    );
    expect(r.ok).toBe(true);
    expect((r.data as { ok: number }).ok).toBe(1);
  });

  it("never throws on network failure — returns ok:false", async () => {
    const fetchImpl = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const r = await executeTransport({ url: "https://x.test" }, "http-json", undefined, {
      fetchImpl,
    });
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("ECONNREFUSED");
  });
});

describe("executeTransport — http-sse", () => {
  it("accumulates data: deltas until [DONE]", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode('data: {"d":"He"}\n\n'));
        controller.enqueue(enc.encode('data: {"d":"llo"}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchImpl = (async () =>
      new Response(stream, { status: 200 })) as unknown as typeof fetch;
    const r = await executeTransport(
      { url: "https://x.test/sse" },
      "http-sse",
      { sseDeltaPath: "d" },
      { fetchImpl },
    );
    expect(r.aggregateText).toBe("Hello");
    expect(r.events).toHaveLength(2);
  });
});

describe("executeTransport — ws-stream", () => {
  it("requires a wsFactory", async () => {
    const r = await executeTransport({ url: "wss://x.test" }, "ws-stream");
    expect(r.ok).toBe(false);
    expect(r.errorMessage).toContain("wsFactory");
  });

  it("streams messages via injected socket until done token", async () => {
    const ws: WsLike = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send() {
        queueMicrotask(() => {
          this.onmessage?.({ data: JSON.stringify({ t: "A" }) });
          this.onmessage?.({ data: JSON.stringify({ t: "B" }) });
          this.onmessage?.({ data: "[DONE]" });
        });
      },
      close() {},
    };
    const r = await executeTransport(
      { url: "wss://x.test/stream", body: { go: true } },
      "ws-stream",
      { wsMessagePath: "t" },
      {
        wsFactory: () => {
          queueMicrotask(() => ws.onopen?.());
          return ws;
        },
      },
    );
    expect(r.ok).toBe(true);
    expect(r.aggregateText).toBe("AB");
  });
});
