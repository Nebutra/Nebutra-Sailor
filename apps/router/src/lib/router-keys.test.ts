import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));

const { createProductKeyResolver } = await import("./router-keys");
const { hashApiKeyPlaintext } = await import("@nebutra/repositories");

describe("createProductKeyResolver", () => {
  const active = {
    id: "key_1",
    tenantId: "tenant_1",
    createdById: "user_1",
    name: "default",
    keyPrefix: "sk-sailor-ab",
    scopes: [],
    rateLimitRps: 10,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date(),
  };

  it("resolves by hash, caches, and invalidates on revoke", async () => {
    let clock = 0;
    const repo = {
      findActiveByHash: vi.fn().mockResolvedValue(active),
      touchLastUsed: vi.fn().mockResolvedValue(undefined),
    };
    const resolve = createProductKeyResolver(repo, () => clock);

    expect(await resolve("sk-sailor-plain")).toEqual({
      keyId: "key_1",
      tenantId: "tenant_1",
      userId: "user_1",
    });
    expect(repo.findActiveByHash).toHaveBeenCalledWith(hashApiKeyPlaintext("sk-sailor-plain"));

    await resolve("sk-sailor-plain");
    expect(repo.findActiveByHash).toHaveBeenCalledTimes(1);

    repo.findActiveByHash.mockResolvedValue(null);
    resolve.invalidate(hashApiKeyPlaintext("sk-sailor-plain"));
    expect(await resolve("sk-sailor-plain")).toBeNull();

    clock += 6_000;
    await resolve("sk-sailor-plain");
    expect(repo.findActiveByHash).toHaveBeenCalledTimes(3);
  });
});
