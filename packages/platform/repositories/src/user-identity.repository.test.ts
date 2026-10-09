import type { PrismaClient } from "@nebutra/db";
import { describe, expect, it, vi } from "vitest";
import { UserIdentityRepository } from "./user-identity.repository";

type Link = { provider: string; subject: string; userId: string; createdAt?: Date };
type Row = { id: string; email: string | null; clerkId: string | null };

/** An in-memory stand-in for the three Prisma delegates the repository touches. */
function fake(seed: { links?: Link[]; users?: Row[] } = {}) {
  const links: Link[] = [...(seed.links ?? [])];
  const users: Row[] = [...(seed.users ?? [])];
  const prisma = {
    userIdentityLink: {
      findUnique: vi.fn(async ({ where }: { where: { provider_subject: Link } }) => {
        const k = where.provider_subject;
        return links.find((l) => l.provider === k.provider && l.subject === k.subject) ?? null;
      }),
      findFirst: vi.fn(
        async ({ where }: { where: { provider: string; userId: string } }) =>
          links.find((l) => l.provider === where.provider && l.userId === where.userId) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: Link }) => {
        if (links.some((l) => l.provider === data.provider && l.subject === data.subject)) {
          throw Object.assign(new Error("unique"), { code: "P2002" });
        }
        links.push(data);
        return data;
      }),
    },
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          users.find((u) => u.id === where.id) ?? null,
      ),
      findMany: vi.fn(
        async ({ where }: { where: { email: { equals: string }; clerkId: { not: null } } }) =>
          users
            .filter(
              (u) =>
                u.clerkId !== null && u.email?.toLowerCase() === where.email.equals.toLowerCase(),
            )
            .map((u) => ({
              id: u.id,
              identityLinks: links
                .filter((l) => l.userId === u.id)
                .map((l) => ({ subject: l.subject })),
            })),
      ),
    },
  };
  return { repo: new UserIdentityRepository(prisma as unknown as PrismaClient), links, prisma };
}

const legacy: Row = { id: "cms_legacy", email: "Owner@Example.com", clerkId: "user_clerk" };

describe("UserIdentityRepository.canonicalUserId", () => {
  it("returns the linked users row when a link exists", async () => {
    const { repo } = fake({
      links: [{ provider: "better-auth", subject: "ba_1", userId: "cms_legacy" }],
    });
    expect(await repo.canonicalUserId("ba_1")).toBe("cms_legacy");
  });

  it("is the identity function when no link exists (subject IS users.id)", async () => {
    const { repo } = fake();
    expect(await repo.canonicalUserId("ba_new")).toBe("ba_new");
  });

  it("does not cross providers", async () => {
    const { repo } = fake({
      links: [{ provider: "other", subject: "ba_1", userId: "cms_legacy" }],
    });
    expect(await repo.canonicalUserId("ba_1")).toBe("ba_1");
  });
});

describe("UserIdentityRepository.authSubject", () => {
  it("inverts a link, and falls back to the id itself", async () => {
    const { repo } = fake({
      links: [{ provider: "better-auth", subject: "ba_1", userId: "cms_legacy" }],
    });
    expect(await repo.authSubject("cms_legacy")).toBe("ba_1");
    expect(await repo.authSubject("plain")).toBe("plain");
  });
});

describe("UserIdentityRepository.linkLegacyByVerifiedEmail", () => {
  it("links a verified email to the one legacy row, case-insensitively", async () => {
    const { repo, links } = fake({ users: [legacy] });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(out).toEqual({ userId: "cms_legacy", result: "linked" });
    expect(links).toMatchObject([{ subject: "ba_1", userId: "cms_legacy", source: "sign-in" }]);
  });

  it("never links an UNVERIFIED email", async () => {
    const { repo, links } = fake({ users: [legacy] });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "owner@example.com",
      emailVerified: false,
    });
    expect(out).toEqual({ userId: "ba_1", result: "none" });
    expect(links).toHaveLength(0);
  });

  it("does not link when the subject already has its own users row (that is a merge)", async () => {
    const { repo, links } = fake({
      users: [legacy, { id: "ba_1", email: null, clerkId: null }],
    });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(out.result).toBe("none");
    expect(links).toHaveLength(0);
  });

  it("does not link to a row that is not Clerk-era (a Better Auth row is canonical for itself)", async () => {
    const { repo } = fake({ users: [{ id: "ba_other", email: "x@example.com", clerkId: null }] });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "x@example.com",
      emailVerified: true,
    });
    expect(out.result).toBe("none");
  });

  it("does not take over a legacy row already linked to a different subject", async () => {
    const { repo, links } = fake({
      users: [legacy],
      links: [{ provider: "better-auth", subject: "ba_first", userId: "cms_legacy" }],
    });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_2",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(out).toEqual({ userId: "ba_2", result: "none" });
    expect(links).toHaveLength(1);
  });

  it("is idempotent: a second call reads the link back", async () => {
    const { repo, links } = fake({ users: [legacy] });
    const input = { subject: "ba_1", email: "owner@example.com", emailVerified: true };
    await repo.linkLegacyByVerifiedEmail(input);
    expect(await repo.linkLegacyByVerifiedEmail(input)).toEqual({
      userId: "cms_legacy",
      result: "existing",
    });
    expect(links).toHaveLength(1);
  });

  it("refuses when two legacy rows claim the email", async () => {
    const { repo } = fake({
      users: [legacy, { id: "cms_2", email: "owner@example.com", clerkId: "user_2" }],
    });
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(out.result).toBe("none");
  });

  it("a lost race resolves to the winner's link", async () => {
    const { repo, prisma } = fake({ users: [legacy] });
    prisma.userIdentityLink.findUnique
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ userId: "cms_legacy" } as never);
    prisma.userIdentityLink.create.mockRejectedValueOnce(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );
    const out = await repo.linkLegacyByVerifiedEmail({
      subject: "ba_1",
      email: "owner@example.com",
      emailVerified: true,
    });
    expect(out).toEqual({ userId: "cms_legacy", result: "existing" });
  });
});
