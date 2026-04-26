import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;

describe("members data fallback", () => {
  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    vi.resetModules();
    vi.doUnmock("@nebutra/db");
  });

  it("renders an empty public member list when local dev has no database URL", async () => {
    delete process.env.DATABASE_URL;
    vi.doMock("@nebutra/db", () => ({
      getSystemDb: () => {
        throw new Error("DATABASE_URL should not be required for local public browsing");
      },
    }));

    const { getMemberBySlug, getPublicMembers } = await import("../../lib/members");

    await expect(getPublicMembers({ page: 2 })).resolves.toEqual({
      members: [],
      total: 0,
      page: 2,
      pageSize: 24,
    });
    await expect(getMemberBySlug("alice")).resolves.toBeNull();
  });

  it("falls back when the lazy database proxy fails during the member query", async () => {
    delete process.env.DATABASE_URL;
    vi.doMock("@nebutra/db", () => ({
      getSystemDb: () => ({
        sleptonsaMemberProfile: {
          count: vi.fn().mockRejectedValue(new Error("missing database")),
          findFirst: vi.fn().mockRejectedValue(new Error("missing database")),
          findMany: vi.fn().mockRejectedValue(new Error("missing database")),
        },
      }),
    }));

    const { getMemberBySlug, getPublicMembers } = await import("../../lib/members");

    await expect(getPublicMembers({})).resolves.toMatchObject({
      members: [],
      total: 0,
    });
    await expect(getMemberBySlug("alice")).resolves.toBeNull();
  });
});
