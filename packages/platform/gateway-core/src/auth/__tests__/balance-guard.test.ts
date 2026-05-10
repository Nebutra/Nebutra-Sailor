import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockGetCreditBalance = vi.fn();

const mockRedis = { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel };

describe("checkBalance", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns void when cached balance > 0", async () => {
    mockRedisGet.mockResolvedValue("150.50");

    const { checkBalance } = await import("../balance-guard.js");
    await expect(
      checkBalance("org_1", mockRedis as any, mockGetCreditBalance),
    ).resolves.toBeUndefined();

    expect(mockGetCreditBalance).not.toHaveBeenCalled();
  });

  it("falls back to getCreditBalance on cache miss and caches result", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetCreditBalance.mockResolvedValue(42.0);

    const { checkBalance } = await import("../balance-guard.js");
    await expect(
      checkBalance("org_2", mockRedis as any, mockGetCreditBalance),
    ).resolves.toBeUndefined();

    expect(mockGetCreditBalance).toHaveBeenCalledWith("org_2");
    expect(mockRedisSet).toHaveBeenCalledOnce();
    expect(mockRedisSet.mock.calls[0]?.[1]).toBe("42");
    expect(mockRedisSet.mock.calls[0]?.[2]).toEqual({ ex: 30 }); // 30s TTL
  });

  it("throws when cached balance <= 0", async () => {
    mockRedisGet.mockResolvedValue("0");

    const { checkBalance } = await import("../balance-guard.js");
    await expect(checkBalance("org_3", mockRedis as any, mockGetCreditBalance)).rejects.toThrow(
      "Insufficient credit balance",
    );
  });

  it("throws when fetched balance <= 0", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetCreditBalance.mockResolvedValue(-5);

    const { checkBalance } = await import("../balance-guard.js");
    await expect(checkBalance("org_4", mockRedis as any, mockGetCreditBalance)).rejects.toThrow(
      "Insufficient credit balance",
    );
  });

  it("throws when fetched balance is exactly 0", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockGetCreditBalance.mockResolvedValue(0);

    const { checkBalance } = await import("../balance-guard.js");
    await expect(checkBalance("org_5", mockRedis as any, mockGetCreditBalance)).rejects.toThrow(
      "Insufficient credit balance",
    );
  });
});

describe("invalidateBalanceCache", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("deletes the Redis key for the given orgId", async () => {
    const { invalidateBalanceCache } = await import("../balance-guard.js");
    await invalidateBalanceCache("org_99", mockRedis as any);

    expect(mockRedisDel).toHaveBeenCalledOnce();
    expect(mockRedisDel.mock.calls[0]?.[0]).toBe("credit:balance:org_99");
  });
});
