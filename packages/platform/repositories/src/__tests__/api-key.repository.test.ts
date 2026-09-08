import { describe, expect, it, vi } from "vitest";
import { ApiKeyRepository, hashApiKeyPlaintext } from "../api-key.repository";

function stub(
  overrides: Partial<
    Record<"findUnique" | "findMany" | "create" | "updateMany" | "update", unknown>
  > = {},
) {
  const aPIKey = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
  return { prisma: { aPIKey } as never, aPIKey };
}

const row = {
  id: "key_1",
  name: "default",
  keyPrefix: "sk-sailor-ab",
  scopes: ["models:*"],
  rateLimitRps: 10,
  lastUsedAt: null,
  expiresAt: null,
  createdAt: new Date("2026-09-08T00:00:00Z"),
  tenantId: "tenant_1",
  createdById: "user_1",
  revokedAt: null,
};

describe("ApiKeyRepository", () => {
  it("hashes plaintext with sha256 hex", () => {
    expect(hashApiKeyPlaintext("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("resolves an active key by hash and hides revokedAt", async () => {
    const { prisma, aPIKey } = stub({ findUnique: vi.fn().mockResolvedValue(row) });
    const found = await new ApiKeyRepository(prisma).findActiveByHash("h");
    expect(aPIKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: "h" } }),
    );
    expect(found?.tenantId).toBe("tenant_1");
    expect(found && "revokedAt" in found).toBe(false);
  });

  it("returns null for revoked and expired keys", async () => {
    const revoked = stub({
      findUnique: vi.fn().mockResolvedValue({ ...row, revokedAt: new Date() }),
    });
    expect(await new ApiKeyRepository(revoked.prisma).findActiveByHash("h")).toBeNull();

    const expired = stub({
      findUnique: vi.fn().mockResolvedValue({ ...row, expiresAt: new Date("2020-01-01") }),
    });
    expect(await new ApiKeyRepository(expired.prisma).findActiveByHash("h")).toBeNull();
  });

  it("revokes only inside the caller's tenant", async () => {
    const { prisma, aPIKey } = stub({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    const ok = await new ApiKeyRepository(prisma).revoke("tenant_2", "key_1");
    expect(ok).toBe(false);
    expect(aPIKey.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "key_1", tenantId: "tenant_2", revokedAt: null } }),
    );
  });

  it("touchLastUsed never throws", async () => {
    const { prisma } = stub({ update: vi.fn().mockRejectedValue(new Error("gone")) });
    await expect(new ApiKeyRepository(prisma).touchLastUsed("key_1")).resolves.toBeUndefined();
  });
});
