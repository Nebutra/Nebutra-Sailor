import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn<(key: string) => Promise<unknown>>();
const mockSet = vi.fn<(key: string, value: unknown, opts?: unknown) => Promise<unknown>>();
const mockWithLock =
  vi.fn<
    <T>(lockKey: string, options: { ttl: number }, fn: () => Promise<T>) => Promise<T | null>
  >();

vi.mock("../client.js", () => ({
  getCacheClient: vi.fn().mockResolvedValue({
    get: mockGet,
    set: mockSet,
  }),
}));

vi.mock("./lockCache.js", () => ({
  createLock: vi.fn(() => ({
    withLock: mockWithLock,
  })),
}));

const { StampedeCache } = await import("./stampede.js");

describe("StampedeCache", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockWithLock.mockReset();
  });

  it("waits for a contended lock holder to fill the cache before running the fallback fetcher", async () => {
    const cache = new StampedeCache({
      ttl: 60,
      lockTTL: 10,
      prefix: "test",
      waitRetries: 2,
      waitDelay: 1,
    });
    const fetcher = vi.fn().mockResolvedValue("fallback");

    mockGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("from-lock-holder");
    mockWithLock.mockResolvedValueOnce(null);

    await expect(cache.getOrSet("resource", fetcher)).resolves.toBe("from-lock-holder");

    expect(fetcher).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("falls back to fetching without caching when the contended cache never appears", async () => {
    const cache = new StampedeCache({
      ttl: 60,
      lockTTL: 10,
      prefix: "test",
      waitRetries: 1,
      waitDelay: 1,
    });
    const fetcher = vi.fn().mockResolvedValue("fallback");

    mockGet.mockResolvedValue(null);
    mockWithLock.mockResolvedValueOnce(null);

    await expect(cache.getOrSet("resource", fetcher)).resolves.toBe("fallback");

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockSet).not.toHaveBeenCalled();
  });
});
