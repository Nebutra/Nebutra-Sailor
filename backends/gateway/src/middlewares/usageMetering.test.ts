import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redis = {
  incr: vi.fn<(key: string) => Promise<number>>(),
  incrby: vi.fn<(key: string, n: number) => Promise<number>>(),
  expire: vi.fn<(key: string, seconds: number) => Promise<number>>(async () => 1),
};

vi.mock("@nebutra/cache", () => ({
  getRedis: async () => redis,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { usageMeteringMiddleware } from "./usageMetering";

type Ctx = Parameters<typeof usageMeteringMiddleware>[0];

function context(path: string, tokensUsed?: string): Ctx {
  const resHeaders = new Headers();
  if (tokensUsed) resHeaders.set("X-Tokens-Used", tokensUsed);
  return {
    req: { url: `https://api.nebutra.com${path}` },
    get: (key: string) => (key === "tenant" ? { tenantId: "org_1" } : undefined),
    res: { headers: resHeaders },
  } as unknown as Ctx;
}

// The write is fire-and-forget behind `void (async () => …)()`; let it settle.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("usageMeteringMiddleware — one INCR per request, EXPIRE only on key creation", () => {
  beforeEach(() => {
    redis.incr.mockReset();
    redis.incrby.mockReset();
    redis.expire.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets the TTL on the increment that creates the month key", async () => {
    redis.incr.mockResolvedValueOnce(1);

    await usageMeteringMiddleware(context("/api/v1/things"), async () => {});
    await flush();

    expect(redis.incr).toHaveBeenCalledOnce();
    expect(redis.expire).toHaveBeenCalledOnce();
    expect(redis.expire.mock.calls[0]?.[0]).toMatch(/^usage:org_1:\d{4}-\d{2}:api_calls$/);
  });

  it("does not touch the TTL again once the key exists", async () => {
    redis.incr.mockResolvedValueOnce(42);

    await usageMeteringMiddleware(context("/api/v1/things"), async () => {});
    await flush();

    expect(redis.incr).toHaveBeenCalledOnce();
    // Before 2026-09-02 this was a second billed command on every request.
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("applies the same rule to the AI token counter", async () => {
    redis.incr.mockResolvedValueOnce(5);
    // First write: INCRBY returns exactly the amount added.
    redis.incrby.mockResolvedValueOnce(120);

    await usageMeteringMiddleware(context("/api/v1/ai/gateway", "120"), async () => {});
    await flush();

    expect(redis.incrby).toHaveBeenCalledWith(expect.stringMatching(/:ai_tokens$/), 120);
    expect(redis.expire).toHaveBeenCalledOnce();
    expect(redis.expire.mock.calls[0]?.[0]).toMatch(/:ai_tokens$/);

    redis.incr.mockResolvedValueOnce(6);
    redis.incrby.mockResolvedValueOnce(360); // key already existed
    await usageMeteringMiddleware(context("/api/v1/ai/gateway", "240"), async () => {});
    await flush();

    expect(redis.expire).toHaveBeenCalledOnce(); // still only the first one
  });

  it("skips exempt paths entirely", async () => {
    await usageMeteringMiddleware(context("/api/misc/health"), async () => {});
    await flush();

    expect(redis.incr).not.toHaveBeenCalled();
  });
});
