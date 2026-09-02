import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redis = {
  get: vi.fn(),
  set: vi.fn(),
  eval: vi.fn(),
};

vi.mock("@nebutra/cache", () => ({
  getRedis: async () => redis,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { rateLimitMiddleware } from "./rateLimit";

type Ctx = Parameters<typeof rateLimitMiddleware>[0];

function context(path = "/api/v1/things") {
  const headers = new Map<string, string>();
  let status: number | undefined;
  let body: unknown;
  const c = {
    req: { url: `https://api.nebutra.com${path}`, method: "GET" },
    get: (key: string) =>
      key === "tenant"
        ? { tenantId: "org_1", userId: "u_1", ip: "203.0.113.9", plan: "FREE" }
        : undefined,
    header: (name: string, value: string) => headers.set(name, value),
    json: (payload: unknown, code: number) => {
      status = code;
      body = payload;
      return new Response(JSON.stringify(payload), { status: code });
    },
  } as unknown as Ctx;
  return { c, headers, status: () => status, body: () => body };
}

describe("rateLimitMiddleware — a failing Redis store must not fail the request", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "t",
    };
    redis.get.mockReset();
    redis.set.mockReset();
    redis.eval.mockReset();
  });

  afterEach(() => {
    process.env = env;
    vi.clearAllMocks();
  });

  it("falls back to the in-memory bucket when every Redis call throws", async () => {
    // Malformed URL / bad token / outage: the client constructs, the calls die.
    redis.eval.mockRejectedValue(new TypeError("Invalid URL"));
    redis.get.mockRejectedValue(new TypeError("Invalid URL"));
    redis.set.mockRejectedValue(new TypeError("Invalid URL"));
    const next = vi.fn(async () => {});
    const { c, headers, status } = context();

    await rateLimitMiddleware(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect(status()).toBeUndefined();
    expect(headers.get("X-RateLimit-Limit")).toBe("100");
    expect(Number(headers.get("X-RateLimit-Remaining"))).toBeLessThan(100);
  });

  it("still uses Redis when it works — one EVAL, no GET/SET", async () => {
    redis.eval.mockResolvedValue([1, 42, Date.now()]);
    const next = vi.fn(async () => {});
    const { c, headers } = context();

    await rateLimitMiddleware(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect(redis.eval).toHaveBeenCalledOnce();
    expect(redis.get).not.toHaveBeenCalled();
    expect(headers.get("X-RateLimit-Remaining")).toBe("42");
  });

  it("returns 429 when Redis denies", async () => {
    redis.eval.mockResolvedValue([0, 0, Date.now()]);
    const next = vi.fn(async () => {});
    const { c, status, headers } = context();

    await rateLimitMiddleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(status()).toBe(429);
    expect(headers.get("Retry-After")).toBeDefined();
  });
});
