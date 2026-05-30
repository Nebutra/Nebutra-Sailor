import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --------------------------------------------------------------------------
// Mock ../client.js so no real Redis connection is needed.
// The mock is installed before the module under test is imported.
// --------------------------------------------------------------------------

const mockSet = vi.fn<(key: string, value: unknown, opts?: unknown) => Promise<"OK" | null>>();
const mockGet = vi.fn<(key: string) => Promise<string | null>>();
const mockDel = vi.fn<(...keys: string[]) => Promise<number>>();

vi.mock("../client.js", () => ({
  getCacheClient: vi.fn().mockResolvedValue({
    set: mockSet,
    get: mockGet,
    del: mockDel,
  }),
}));

// Import AFTER mock registration so the module picks up the stub.
const { DistributedLock } = await import("./lockCache.js");

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function makeLock() {
  return new DistributedLock();
}

/** Minimal options — very short delays to keep the test suite fast. */
const FAST_OPTS = { ttl: 10, retries: 3, retryDelay: 1 } as const;

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("DistributedLock.acquire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("(a) returns a non-empty lockId string when the first SET NX succeeds", async () => {
    mockSet.mockResolvedValueOnce("OK");

    const lock = makeLock();
    const result = await lock.acquire("resource:a", FAST_OPTS);

    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();
    expect((result as string).length).toBeGreaterThan(0);

    // SET NX was called exactly once with the right key prefix and TTL.
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith("lock:resource:a", expect.any(String), {
      nx: true,
      ex: FAST_OPTS.ttl,
    });
  });

  it("(b) retries when the first attempts fail and returns lockId on eventual success", async () => {
    // Fail twice, succeed on the third attempt.
    mockSet
      .mockResolvedValueOnce(null) // attempt 1 — contended
      .mockResolvedValueOnce(null) // attempt 2 — still contended
      .mockResolvedValueOnce("OK"); // attempt 3 — acquired

    const lock = makeLock();
    const result = await lock.acquire("resource:b", FAST_OPTS);

    expect(result).toBeTypeOf("string");
    expect(result).not.toBeNull();

    // SET was called three times.
    expect(mockSet).toHaveBeenCalledTimes(3);
  });

  it("(c) returns null when all retry attempts are exhausted (lock always contended)", async () => {
    // Always return null — the lock is never available.
    // retries: 3 means p-retry makes 1 initial + 3 retry = 4 total attempts.
    mockSet.mockResolvedValue(null);

    const lock = makeLock();
    const result = await lock.acquire("resource:c", FAST_OPTS);

    // Contract: exhausted contention → null (not throw).
    expect(result).toBeNull();

    // p-retry: 1 initial attempt + 3 retries = 4 total SET calls.
    expect(mockSet).toHaveBeenCalledTimes(4);
  });

  it("propagates genuine Redis errors rather than swallowing them", async () => {
    const redisError = new Error("ECONNREFUSED");
    mockSet.mockRejectedValueOnce(redisError);

    const lock = makeLock();
    await expect(lock.acquire("resource:err", FAST_OPTS)).rejects.toThrow("ECONNREFUSED");
  });
});
