import { describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ ensureFromIdentity: vi.fn() }));
vi.mock("@nebutra/repositories", () => ({
  UserRepository: class {
    ensureFromIdentity = repo.ensureFromIdentity;
  },
}));

import { buildIdentityMirrorDatabaseHooks, ensureUserRecordForSession } from "./identity-mirror";

type Hooks = { user: { create: { after: (user: Record<string, unknown>) => Promise<void> } } };
const prisma = {} as never;

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
});
