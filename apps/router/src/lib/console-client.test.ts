import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConsoleError,
  consoleFetch,
  createRequestLane,
  isAbortError,
  parseErrorEnvelope,
  readSseData,
} from "@/lib/console-client";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseErrorEnvelope", () => {
  it("reads the console's flat envelope", () => {
    expect(parseErrorEnvelope(400, { error: "金额需为大于 0 的数字。" })).toEqual({
      message: "金额需为大于 0 的数字。",
      code: null,
    });
  });

  it("reads the edge's OpenAI envelope, including the code a caller branches on", () => {
    expect(
      parseErrorEnvelope(402, {
        error: { message: "Balance is exhausted.", code: "insufficient_balance" },
      }),
    ).toEqual({ message: "Balance is exhausted.", code: "insufficient_balance" });
  });

  it("never returns a blank message — a blank one renders as success", () => {
    for (const payload of [null, {}, { error: "" }, { error: {} }, "nonsense", []]) {
      const parsed = parseErrorEnvelope(500, payload);
      expect(parsed.message.length).toBeGreaterThan(0);
    }
  });

  it("translates the statuses the console can actually hit", () => {
    expect(parseErrorEnvelope(401, {}).message).toContain("登录");
    expect(parseErrorEnvelope(403, {}).message).toContain("权限");
    expect(parseErrorEnvelope(429, {}).message).toContain("频繁");
  });
});

describe("consoleFetch", () => {
  it("decodes a 2xx body", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ balance: 12.5 }));
    const balance = await consoleFetch({
      path: "/api/console/v1/wallet",
      decode: (value) => (value as { balance: number }).balance,
    });
    expect(balance).toBe(12.5);
  });

  it("throws rather than handing a refusal back as data", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "Authentication required." }, 401));
    const call = consoleFetch({ path: "/api/console/v1/keys", decode: () => "unreachable" });
    await expect(call).rejects.toBeInstanceOf(ConsoleError);
    await expect(call).rejects.toMatchObject({ status: 401 });
  });

  it("treats a 204 as an empty body, not as a parse failure", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(consoleFetch({ path: "/x", method: "DELETE", decode: () => "ok" })).resolves.toBe(
      "ok",
    );
  });

  it("reports a transport failure as a ConsoleError, and lets an abort through", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("network down");
    });
    await expect(consoleFetch({ path: "/x", decode: () => null })).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });

    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    globalThis.fetch = vi.fn(async () => {
      throw aborted;
    });
    await expect(consoleFetch({ path: "/x", decode: () => null })).rejects.toBe(aborted);
  });

  it("sends no body on a GET", async () => {
    let seen: RequestInit | undefined;
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen = init;
      return jsonResponse({});
    };
    await consoleFetch({ path: "/x", decode: () => null });
    expect(seen?.body).toBeUndefined();
    expect(seen?.method).toBe("GET");
  });
});

describe("isAbortError", () => {
  it("recognises the name, whichever runtime raised it", () => {
    const error = new Error("stop");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
    expect(isAbortError(new Error("boom"))).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});

describe("createRequestLane", () => {
  it("aborts the previous signal when a new call supersedes it", () => {
    const lane = createRequestLane();
    const first = lane.next();
    expect(first.aborted).toBe(false);
    const second = lane.next();
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    lane.cancel();
    expect(second.aborted).toBe(true);
  });
});

describe("readSseData", () => {
  function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
  }

  async function collect(chunks: readonly string[]): Promise<string[]> {
    const out: string[] = [];
    for await (const payload of readSseData(streamOf(chunks))) out.push(payload);
    return out;
  }

  it("yields one payload per event and drops [DONE]", async () => {
    expect(await collect(['data: {"a":1}\n\n', 'data: {"b":2}\n\n', "data: [DONE]\n\n"])).toEqual([
      '{"a":1}',
      '{"b":2}',
    ]);
  });

  it("carries a payload split across two reads", async () => {
    expect(await collect(['data: {"a"', ':1}\n\ndata: {"b":2}\n\n'])).toEqual([
      '{"a":1}',
      '{"b":2}',
    ]);
  });

  it("flushes a final event that arrives without a trailing blank line", async () => {
    expect(await collect(['data: {"a":1}'])).toEqual(['{"a":1}']);
  });
});
