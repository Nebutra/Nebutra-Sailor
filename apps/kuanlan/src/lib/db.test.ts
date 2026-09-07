import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensurePersonalTenant, isDbConfigured } from "./db";

describe("personal tenant", () => {
  const previous = { ...process.env };

  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://app:secret@db.example:6432/nebutra";
  });

  afterEach(() => {
    process.env = { ...previous };
  });

  it("creates one INDIVIDUAL tenant keyed by the user, and nothing else", async () => {
    const calls: unknown[] = [];
    const tenant = await ensurePersonalTenant("user_1", {
      upsert: async (args) => {
        calls.push(args);
        return { id: "tenant_abc", userId: "user_1" };
      },
    });

    expect(tenant).toEqual({ tenantId: "tenant_abc", userId: "user_1" });
    expect(calls).toEqual([
      {
        where: { userId: "user_1" },
        create: { kind: "INDIVIDUAL", userId: "user_1" },
        // Idempotent by construction: a second call updates nothing.
        update: {},
        select: { id: true, userId: true },
      },
    ]);
  });

  it("is safe to call again — the database's unique index does the deduping", async () => {
    let hits = 0;
    const upsert = async () => {
      hits += 1;
      return { id: "tenant_abc", userId: "user_1" };
    };

    const first = await ensurePersonalTenant("user_1", { upsert });
    const second = await ensurePersonalTenant("user_1", { upsert });

    expect(first.tenantId).toBe(second.tenantId);
    expect(hits).toBe(2);
  });

  it("refuses a user id that is not a plain token", async () => {
    await expect(
      ensurePersonalTenant("../someone-else", { upsert: async () => ({ id: "x", userId: "x" }) }),
    ).rejects.toMatchObject({ name: "InvalidUserIdError" });
  });

  it("fails closed when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL;

    expect(isDbConfigured()).toBe(false);
    await expect(
      ensurePersonalTenant("user_1", { upsert: async () => ({ id: "x", userId: "x" }) }),
    ).rejects.toMatchObject({ name: "DbUnavailableError" });
  });

  it("treats a blank DATABASE_URL as absent, not as a connection string", async () => {
    process.env.DATABASE_URL = "   ";
    expect(isDbConfigured()).toBe(false);
  });
});
