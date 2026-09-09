import type { PrismaClient } from "@nebutra/db";
import { describe, expect, it, vi } from "vitest";
import { UserRepository } from "./user.repository";

/** `prisma.user.upsert` and nothing else — the repository is the unit here. */
function fakePrisma() {
  const upsert = vi.fn(
    async (args: { where: { id: string }; create: Record<string, unknown> }) => ({
      id: args.where.id,
      clerkId: null,
      email: null,
      name: null,
      avatarUrl: null,
      ...args.create,
    }),
  );
  return { prisma: { user: { upsert } } as unknown as PrismaClient, upsert };
}

describe("UserRepository.ensureFromIdentity", () => {
  it("creates the row under the identity's own id, with no Clerk id", async () => {
    const { prisma, upsert } = fakePrisma();
    const user = await new UserRepository(prisma).ensureFromIdentity({
      id: "auth_1",
      email: "a@example.com",
      name: "A",
    });

    expect(user.id).toBe("auth_1");
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "auth_1" },
      create: { id: "auth_1", email: "a@example.com", name: "A" },
      update: { email: "a@example.com" },
    });
    expect(upsert.mock.calls[0]?.[0].create).not.toHaveProperty("clerkId");
  });

  it("accepts an identity with no email — a phone-only account has none", async () => {
    const { prisma, upsert } = fakePrisma();
    await new UserRepository(prisma).ensureFromIdentity({ id: "auth_2" });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "auth_2" },
      create: { id: "auth_2" },
      update: {},
    });
  });

  it("never overwrites a name or avatar the person set here", async () => {
    const { prisma, upsert } = fakePrisma();
    await new UserRepository(prisma).ensureFromIdentity({
      id: "auth_3",
      email: "c@example.com",
      name: "from-provider",
      avatarUrl: "https://img/avatar.png",
    });
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ update: { email: "c@example.com" } });
    expect(upsert.mock.calls[0]?.[0].update).not.toHaveProperty("name");
    expect(upsert.mock.calls[0]?.[0].update).not.toHaveProperty("avatarUrl");
  });
});
