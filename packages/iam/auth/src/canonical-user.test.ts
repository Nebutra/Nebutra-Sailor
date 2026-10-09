import { describe, expect, it, vi } from "vitest";
import { createCanonicalUserResolver } from "./canonical-user";

function resolverWith(links: Record<string, string>, now = () => 0) {
  const canonicalUserId = vi.fn(async (s: string) => links[s] ?? s);
  const authSubject = vi.fn(async (u: string) => {
    const hit = Object.entries(links).find(([, v]) => v === u);
    return hit ? hit[0] : u;
  });
  return {
    canonicalUserId,
    authSubject,
    resolver: createCanonicalUserResolver({
      lookup: async () => ({ canonicalUserId, authSubject }),
      now,
    }),
  };
}

describe("canonical user resolver", () => {
  it("maps a linked subject to the canonical users id", async () => {
    const { resolver } = resolverWith({ ba_owner: "cms_owner" });
    expect(await resolver.canonical("ba_owner")).toBe("cms_owner");
  });

  it("passes an unlinked subject through unchanged", async () => {
    const { resolver } = resolverWith({});
    expect(await resolver.canonical("ba_new")).toBe("ba_new");
  });

  it("maps a canonical id back to the auth subject", async () => {
    const { resolver } = resolverWith({ ba_owner: "cms_owner" });
    expect(await resolver.subject("cms_owner")).toBe("ba_owner");
    expect(await resolver.subject("plain")).toBe("plain");
  });

  it("caches within the TTL and refreshes after it", async () => {
    let t = 0;
    const { resolver, canonicalUserId } = resolverWith({ a: "b" }, () => t);
    await resolver.canonical("a");
    await resolver.canonical("a");
    expect(canonicalUserId).toHaveBeenCalledTimes(1);
    t = 31_000;
    await resolver.canonical("a");
    expect(canonicalUserId).toHaveBeenCalledTimes(2);
  });

  it("rejects when the link store fails — it never falls back to the raw id", async () => {
    const resolver = createCanonicalUserResolver({
      lookup: async () => ({
        canonicalUserId: async () => {
          throw new Error("db down");
        },
        authSubject: async (u) => u,
      }),
    });
    await expect(resolver.canonical("ba_owner")).rejects.toThrow("db down");
  });

  it("is a passthrough in a deployment with no database", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(await createCanonicalUserResolver().canonical("ba_x")).toBe("ba_x");
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});
