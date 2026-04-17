import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockPrismaFindUnique = vi.fn();
const mockPrismaUpdate = vi.fn();

const mockDeps = {
  redis: { get: mockRedisGet, set: mockRedisSet, del: vi.fn() },
  prisma: {
    aPIKey: {
      findUnique: mockPrismaFindUnique,
      update: mockPrismaUpdate,
    },
  },
};

describe("resolveApiKey", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("rejects tokens without sk-sailor- prefix", async () => {
    const { resolveApiKey } = await import("../api-key-resolver.js");
    await expect(resolveApiKey("sk-openai-xxx", mockDeps as any)).rejects.toThrow(
      "Invalid API key format",
    );
  });

  it("returns cached key from Redis on hit", async () => {
    const cached = JSON.stringify({
      id: "key_1",
      organizationId: "org_1",
      userId: null,
      scopes: [],
      rateLimitRps: 10,
      plan: "PRO",
    });
    mockRedisGet.mockResolvedValue(cached);

    const { resolveApiKey } = await import("../api-key-resolver.js");
    const result = await resolveApiKey("sk-sailor-abc123def456", mockDeps as any);

    expect(result.id).toBe("key_1");
    expect(result.plan).toBe("PRO");
    expect(mockPrismaFindUnique).not.toHaveBeenCalled();
  });

  it("falls back to DB on Redis miss and caches result", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockPrismaFindUnique.mockResolvedValue({
      id: "key_2",
      organizationId: "org_2",
      createdById: "user_2",
      scopes: ["chat"],
      rateLimitRps: 20,
      revokedAt: null,
      expiresAt: null,
      organization: { plan: "ENTERPRISE" },
    });

    const { resolveApiKey } = await import("../api-key-resolver.js");
    const result = await resolveApiKey("sk-sailor-xyz789", mockDeps as any);

    expect(result.id).toBe("key_2");
    expect(result.plan).toBe("ENTERPRISE");
    expect(mockRedisSet).toHaveBeenCalledOnce();
    expect(mockRedisSet.mock.calls[0]?.[2]).toEqual({ ex: 300 }); // 5 min TTL
  });

  it("rejects revoked keys", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockPrismaFindUnique.mockResolvedValue({
      id: "key_3",
      revokedAt: new Date("2025-01-01"),
      expiresAt: null,
      organization: { plan: "FREE" },
    });

    const { resolveApiKey } = await import("../api-key-resolver.js");
    await expect(resolveApiKey("sk-sailor-revoked", mockDeps as any)).rejects.toThrow(
      "API key has been revoked",
    );
  });

  it("rejects expired keys", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockPrismaFindUnique.mockResolvedValue({
      id: "key_4",
      revokedAt: null,
      expiresAt: new Date("2020-01-01"),
      organization: { plan: "FREE" },
    });

    const { resolveApiKey } = await import("../api-key-resolver.js");
    await expect(resolveApiKey("sk-sailor-expired", mockDeps as any)).rejects.toThrow(
      "API key has expired",
    );
  });

  it("rejects when key not found in DB", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockPrismaFindUnique.mockResolvedValue(null);

    const { resolveApiKey } = await import("../api-key-resolver.js");
    await expect(resolveApiKey("sk-sailor-unknown", mockDeps as any)).rejects.toThrow(
      "Invalid API key",
    );
  });

  it("fire-and-forget updates lastUsedAt", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockPrismaFindUnique.mockResolvedValue({
      id: "key_5",
      organizationId: "org_5",
      createdById: null,
      scopes: [],
      rateLimitRps: 10,
      revokedAt: null,
      expiresAt: null,
      organization: { plan: "PRO" },
    });

    const { resolveApiKey } = await import("../api-key-resolver.js");
    await resolveApiKey("sk-sailor-fresh", mockDeps as any);

    // lastUsedAt update is fire-and-forget, give it a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(mockPrismaUpdate).toHaveBeenCalledOnce();
  });
});
