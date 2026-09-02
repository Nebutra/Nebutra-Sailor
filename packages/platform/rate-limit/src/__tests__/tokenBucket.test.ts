import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_WEIGHTS,
  buildKey,
  createRateLimiter,
  getApiWeight,
  getRateLimiter,
  PLAN_LIMITS,
  RedisTokenBucket,
  type RedisTokenBucketClient,
  TOKEN_BUCKET_SCRIPT,
  TokenBucket,
} from "../tokenBucket";

// ---------------------------------------------------------------------------
// TokenBucket.consume()
// ---------------------------------------------------------------------------

describe("TokenBucket.consume()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows a request when tokens are available", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(true);
  });

  it("deducts the correct token count from remaining", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    const result = await bucket.consume("user:a", 3);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
  });

  it("denies a request when tokens are exhausted", async () => {
    const bucket = new TokenBucket({
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
    });
    // Exhaust all 5 tokens
    await bucket.consume("user:a", 5);
    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(false);
  });

  it("returns remaining = 0 when all tokens consumed and denied", async () => {
    const bucket = new TokenBucket({
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
    });
    await bucket.consume("user:a", 5);
    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns retryAfter in seconds when denied", async () => {
    // maxTokens=10, refillRate=10 tokens per refillInterval=1000ms
    // After consuming all 10, need 1 more: waitTime = ceil((1/10)*1000) = 100ms => 1 second (ceil(100/1000)=1)
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 10,
      refillInterval: 1000,
    });
    await bucket.consume("user:a", 10);
    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(false);
    expect(typeof result.retryAfter).toBe("number");
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("does not set retryAfter when request is allowed", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("refills tokens after one refillInterval elapses", async () => {
    // maxTokens=10, refillRate=10, refillInterval=1000ms
    // After consuming 5, advance 1000ms → refill floor((1000/1000)*10)=10 tokens capped at maxTokens=10
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 10,
      refillInterval: 1000,
    });
    await bucket.consume("user:a", 5); // remaining=5

    vi.advanceTimersByTime(1000);

    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(true);
    // After refill to maxTokens (10) and consuming 1, remaining should be 9
    expect(result.remaining).toBe(9);
  });

  it("does not exceed maxTokens on refill even after a very long time", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 10,
      refillInterval: 1000,
    });
    await bucket.consume("user:a", 5); // remaining=5

    // Advance far into the future — 1 hour
    vi.advanceTimersByTime(3_600_000);

    const result = await bucket.consume("user:a", 1);
    expect(result.allowed).toBe(true);
    // Tokens capped at maxTokens (10), then 1 consumed → 9
    expect(result.remaining).toBe(9);
  });

  it("tracks separate keys independently", async () => {
    const bucket = new TokenBucket({
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
    });
    // Exhaust key "user:a"
    await bucket.consume("user:a", 5);
    const deniedA = await bucket.consume("user:a", 1);
    expect(deniedA.allowed).toBe(false);

    // "user:b" should still have a full bucket
    const allowedB = await bucket.consume("user:b", 1);
    expect(allowedB.allowed).toBe(true);
    expect(allowedB.remaining).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// TokenBucket.cleanup()
// ---------------------------------------------------------------------------

describe("TokenBucket.cleanup()", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes buckets older than maxAge so a fresh consume gives full tokens", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    // Consume some tokens to create the bucket entry
    await bucket.consume("user:stale", 5); // remaining=5

    // Advance time past the default maxAge (3,600,000ms = 1 hour)
    vi.advanceTimersByTime(3_600_001);

    bucket.cleanup(); // should delete "user:stale"

    // A fresh consume should start from maxTokens (10) and deduct 1 → 9
    const result = await bucket.consume("user:stale", 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("keeps buckets that were recently accessed", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    await bucket.consume("user:active", 5); // remaining=5

    // Advance only 30 minutes — well under the default 1-hour maxAge
    vi.advanceTimersByTime(1_800_000);

    bucket.cleanup();

    // The bucket still exists; the 30-minute refill adds floor((1800000/1000)*1)=1800 tokens
    // but capped at maxTokens=10, so remaining after consuming 1 = 9
    const result = await bucket.consume("user:active", 1);
    expect(result.allowed).toBe(true);
    // Tokens were refilled to maxTokens (10) because 1800 > 5; consuming 1 leaves 9
    expect(result.remaining).toBe(9);
  });

  it("respects a custom maxAge parameter", async () => {
    const customMaxAge = 5000; // 5 seconds
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    await bucket.consume("user:short", 5);

    vi.advanceTimersByTime(5001);

    bucket.cleanup(customMaxAge);

    // Bucket should have been evicted; fresh consume gives full tokens minus 1
    const result = await bucket.consume("user:short", 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// getApiWeight()
// ---------------------------------------------------------------------------

describe("getApiWeight()", () => {
  it("returns 20 for POST /api/ai/generate (heavy route)", () => {
    expect(getApiWeight("POST", "/api/ai/generate")).toBe(20);
  });

  it("returns 1 for GET /api/content/feed (light route)", () => {
    expect(getApiWeight("GET", "/api/content/feed")).toBe(1);
  });

  it("returns 1 for GET /api/content/post (light route)", () => {
    expect(getApiWeight("GET", "/api/content/post")).toBe(1);
  });

  it("returns 5 for POST /api/content/post (medium route)", () => {
    expect(getApiWeight("POST", "/api/content/post")).toBe(5);
  });

  it("returns 10 for POST /api/ai/embed", () => {
    expect(getApiWeight("POST", "/api/ai/embed")).toBe(10);
  });

  it("returns 15 for POST /api/ai/translate", () => {
    expect(getApiWeight("POST", "/api/ai/translate")).toBe(15);
  });

  it("returns the default weight (2) for an unknown route", () => {
    const defaultWeight = API_WEIGHTS.default;
    expect(getApiWeight("DELETE", "/api/unknown/route")).toBe(defaultWeight);
    expect(defaultWeight).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PLAN_LIMITS
// ---------------------------------------------------------------------------

describe("PLAN_LIMITS", () => {
  it("FREE.maxTokens is less than PRO.maxTokens", () => {
    expect(PLAN_LIMITS.FREE.maxTokens).toBeLessThan(PLAN_LIMITS.PRO.maxTokens);
  });

  it("PRO.maxTokens is less than ENTERPRISE.maxTokens", () => {
    expect(PLAN_LIMITS.PRO.maxTokens).toBeLessThan(PLAN_LIMITS.ENTERPRISE.maxTokens);
  });

  it("FREE.refillRate is less than PRO.refillRate", () => {
    expect(PLAN_LIMITS.FREE.refillRate).toBeLessThan(PLAN_LIMITS.PRO.refillRate);
  });

  it("all plans have the required TokenBucketConfig fields", () => {
    for (const plan of ["FREE", "PRO", "ENTERPRISE"] as const) {
      expect(PLAN_LIMITS[plan]).toHaveProperty("maxTokens");
      expect(PLAN_LIMITS[plan]).toHaveProperty("refillRate");
      expect(PLAN_LIMITS[plan]).toHaveProperty("refillInterval");
    }
  });

  it("FREE has 100 maxTokens, PRO has 1000, ENTERPRISE has 10000", () => {
    expect(PLAN_LIMITS.FREE.maxTokens).toBe(100);
    expect(PLAN_LIMITS.PRO.maxTokens).toBe(1000);
    expect(PLAN_LIMITS.ENTERPRISE.maxTokens).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// buildKey()
// ---------------------------------------------------------------------------

describe("buildKey()", () => {
  it("prefixes with sailor:rate-limit namespace", () => {
    expect(buildKey("org1")).toBe("sailor:rate-limit:org1");
  });

  it("joins multiple segments with colons", () => {
    expect(buildKey("org1", "user1", "192.168.1.1")).toBe(
      "sailor:rate-limit:org1:user1:192.168.1.1",
    );
  });
});

// ---------------------------------------------------------------------------
// createRateLimiter()
// ---------------------------------------------------------------------------

describe("createRateLimiter()", () => {
  it("creates a FREE limiter with correct maxTokens", () => {
    const limiter = createRateLimiter("FREE");
    expect(limiter.maxTokens).toBe(PLAN_LIMITS.FREE.maxTokens);
  });

  it("creates a PRO limiter with correct maxTokens", () => {
    const limiter = createRateLimiter("PRO");
    expect(limiter.maxTokens).toBe(PLAN_LIMITS.PRO.maxTokens);
  });

  it("creates an ENTERPRISE limiter with correct maxTokens", () => {
    const limiter = createRateLimiter("ENTERPRISE");
    expect(limiter.maxTokens).toBe(PLAN_LIMITS.ENTERPRISE.maxTokens);
  });

  it("falls back to FREE limits for unknown plans", () => {
    const limiter = createRateLimiter("UNKNOWN");
    expect(limiter.maxTokens).toBe(PLAN_LIMITS.FREE.maxTokens);
  });
});

// ---------------------------------------------------------------------------
// getRateLimiter()
// ---------------------------------------------------------------------------

describe("getRateLimiter()", () => {
  it("returns a TokenBucket instance", () => {
    const limiter = getRateLimiter("FREE");
    expect(limiter).toBeInstanceOf(TokenBucket);
  });

  it("returns the same instance on repeated calls for the same plan", () => {
    const a = getRateLimiter("PRO");
    const b = getRateLimiter("PRO");
    expect(a).toBe(b);
  });

  it("returns different instances for different plans", () => {
    const free = getRateLimiter("FREE");
    const enterprise = getRateLimiter("ENTERPRISE");
    expect(free).not.toBe(enterprise);
  });
});

// ---------------------------------------------------------------------------
// RedisTokenBucket — one EVAL per consume, GET+SET only as a fallback
// ---------------------------------------------------------------------------

describe("RedisTokenBucket.consume()", () => {
  const config = { maxTokens: 10, refillRate: 1, refillInterval: 1000 };

  function fakeRedis(overrides: Partial<RedisTokenBucketClient> = {}) {
    return {
      get: vi.fn(async () => null as unknown),
      set: vi.fn(async () => "OK" as unknown),
      ...overrides,
    };
  }

  it("issues a single EVAL and no GET/SET when the client can run scripts", async () => {
    const evalFn = vi.fn(async () => [1, 7, Date.now()] as unknown);
    const redis = fakeRedis({ eval: evalFn });

    const result = await new RedisTokenBucket(config, redis).consume("org:user:ip", 3);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
    expect(evalFn).toHaveBeenCalledOnce();
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();

    const [script, keys, args] = evalFn.mock.calls[0] as unknown as [
      string,
      string[],
      Array<string | number>,
    ];
    expect(script).toBe(TOKEN_BUCKET_SCRIPT);
    expect(keys).toEqual([buildKey("org:user:ip")]);
    // now, maxTokens, refillRate, refillInterval, cost, ttl
    expect(args.slice(1)).toEqual([10, 1, 1000, 3, 3600]);
  });

  it("turns a denied script reply into retryAfter from the script's remaining tokens", async () => {
    const redis = fakeRedis({ eval: vi.fn(async () => [0, 1, Date.now()] as unknown) });

    const result = await new RedisTokenBucket(config, redis).consume("k", 4);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(1);
    // 3 tokens short at 1 token/s → 3s
    expect(result.retryAfter).toBe(3);
  });

  it("falls back to GET+SET when the client has no eval", async () => {
    const redis = fakeRedis();

    const result = await new RedisTokenBucket(config, redis).consume("k", 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(redis.get).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith(buildKey("k"), expect.objectContaining({ tokens: 9 }), {
      ex: 3600,
    });
  });

  it("falls back to GET+SET when the script call fails or replies with garbage", async () => {
    const failing = fakeRedis({
      eval: vi.fn(async () => {
        throw new Error("NOSCRIPT");
      }),
    });
    await expect(new RedisTokenBucket(config, failing).consume("k")).resolves.toMatchObject({
      allowed: true,
      remaining: 9,
    });
    expect(failing.get).toHaveBeenCalledOnce();

    const garbage = fakeRedis({ eval: vi.fn(async () => "not-an-array" as unknown) });
    await expect(new RedisTokenBucket(config, garbage).consume("k")).resolves.toMatchObject({
      allowed: true,
      remaining: 9,
    });
    expect(garbage.get).toHaveBeenCalledOnce();
  });

  it("keeps the script's stored shape compatible with the JS fallback", () => {
    // Both paths read and write {tokens, lastRefill}; the script must write
    // exactly that JSON, with a TTL, in one SET.
    expect(TOKEN_BUCKET_SCRIPT).toContain("redis.call('GET', KEYS[1])");
    expect(TOKEN_BUCKET_SCRIPT.match(/redis\.call\('SET'/g)).toHaveLength(1);
    expect(TOKEN_BUCKET_SCRIPT).toContain("cjson.encode({ tokens = tokens, lastRefill = last })");
    expect(TOKEN_BUCKET_SCRIPT).toContain("'EX', ttl");
  });
});
