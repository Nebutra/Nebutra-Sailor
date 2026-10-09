import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  ensureFromIdentity: vi.fn(),
  linkLegacyByVerifiedEmail: vi.fn(),
}));
vi.mock("@nebutra/repositories", () => ({
  UserRepository: class {
    ensureFromIdentity = repo.ensureFromIdentity;
  },
  UserIdentityRepository: class {
    linkLegacyByVerifiedEmail = repo.linkLegacyByVerifiedEmail;
  },
}));

import { buildIdentityMirrorDatabaseHooks, ensureUserRecordForSession } from "./identity-mirror";

type Hooks = {
  user: { create: { after: (user: Record<string, unknown>) => Promise<void> } };
  session: { create: { after: (session: Record<string, unknown>) => Promise<void> } };
};
const findAuthUser = vi.fn();
const prisma = { authUser: { findUnique: findAuthUser } } as never;

beforeEach(() => {
  repo.ensureFromIdentity.mockReset();
  repo.linkLegacyByVerifiedEmail.mockReset();
  repo.linkLegacyByVerifiedEmail.mockResolvedValue({ userId: "x", result: "none" });
  findAuthUser.mockReset();
});

describe("identity mirror", () => {
  it("mirrors a new Better Auth user into users under the same id", async () => {
    repo.ensureFromIdentity.mockClear();
    const hooks = buildIdentityMirrorDatabaseHooks(prisma) as Hooks;
    await hooks.user.create.after({
      id: "auth_1",
      email: "a@example.com",
      name: "A",
      image: "https://img/a.png",
    });
    expect(repo.ensureFromIdentity).toHaveBeenCalledWith({
      id: "auth_1",
      email: "a@example.com",
      name: "A",
      avatarUrl: "https://img/a.png",
    });
  });

  it("lets a sign-up through when the mirror fails, and reports it", async () => {
    repo.ensureFromIdentity.mockRejectedValueOnce(new Error("db down"));
    const onError = vi.fn();
    const hooks = buildIdentityMirrorDatabaseHooks(prisma, { onError }) as Hooks;
    await expect(hooks.user.create.after({ id: "auth_2" })).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "auth_2");
  });

  it("does nothing for a hook payload without an id", async () => {
    repo.ensureFromIdentity.mockClear();
    const hooks = buildIdentityMirrorDatabaseHooks(prisma) as Hooks;
    await hooks.user.create.after({ email: "x@example.com" });
    expect(repo.ensureFromIdentity).not.toHaveBeenCalled();
  });

  it("ensures the row for a session lazily, tolerating a missing email", async () => {
    repo.ensureFromIdentity.mockClear();
    await ensureUserRecordForSession(prisma, { userId: "auth_3" });
    expect(repo.ensureFromIdentity).toHaveBeenCalledWith({ id: "auth_3", email: null });
  });

  it("links instead of minting a second row when a verified email matches a legacy row", async () => {
    repo.linkLegacyByVerifiedEmail.mockResolvedValue({ userId: "cms_legacy", result: "linked" });
    const hooks = buildIdentityMirrorDatabaseHooks(prisma) as Hooks;
    await hooks.user.create.after({ id: "auth_9", email: "o@example.com", emailVerified: true });
    expect(repo.linkLegacyByVerifiedEmail).toHaveBeenCalledWith({
      subject: "auth_9",
      email: "o@example.com",
      emailVerified: true,
    });
    expect(repo.ensureFromIdentity).not.toHaveBeenCalled();
  });

  it("treats a missing emailVerified flag as unverified", async () => {
    const hooks = buildIdentityMirrorDatabaseHooks(prisma) as Hooks;
    await hooks.user.create.after({ id: "auth_9", email: "o@example.com" });
    expect(repo.linkLegacyByVerifiedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: false }),
    );
  });

  it("attempts the link at sign-in from the auth user's stored verification", async () => {
    findAuthUser.mockResolvedValue({ email: "o@example.com", emailVerified: true });
    const hooks = buildIdentityMirrorDatabaseHooks(prisma) as Hooks;
    await hooks.session.create.after({ userId: "auth_9" });
    expect(repo.linkLegacyByVerifiedEmail).toHaveBeenCalledWith({
      subject: "auth_9",
      email: "o@example.com",
      emailVerified: true,
    });
  });

  it("never fails a sign-in when the link attempt errors", async () => {
    findAuthUser.mockRejectedValue(new Error("db down"));
    const onError = vi.fn();
    const hooks = buildIdentityMirrorDatabaseHooks(prisma, { onError }) as Hooks;
    await expect(hooks.session.create.after({ userId: "auth_9" })).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "auth_9");
  });
});
