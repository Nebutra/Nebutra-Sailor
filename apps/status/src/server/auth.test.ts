import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AuthError,
  authenticateApiKey,
  canManageKeys,
  canWriteIncidents,
  createApiKey,
  getSessionMember,
  hashPassword,
  listApiKeys,
  revokeApiKey,
  SESSION_COOKIE,
  sessionCookie,
  setupAvailable,
  setupOwner,
  signIn,
  signOut,
  verifyPassword,
} from "./auth";
import { createTestDb, type TestDb } from "./testing";

let t: TestDb;
const env = { STATUS_SETUP_TOKEN: "setup-secret" } as NodeJS.ProcessEnv;
const owner = {
  setupToken: "setup-secret",
  email: "Owner@Example.com",
  password: "correct horse battery",
  name: "Owner",
  workspaceSlug: "acme",
};

beforeAll(async () => {
  t = await createTestDb();
}, 60_000);
afterAll(async () => {
  await t.close();
});
beforeEach(async () => {
  await t.db.workspace.deleteMany();
});

describe("passwords", () => {
  it("hashes as salt:hash hex and verifies", async () => {
    const stored = await hashPassword("hunter2hunter2");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(await verifyPassword("hunter2hunter2", stored)).toBe(true);
    expect(await verifyPassword("hunter3hunter3", stored)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("setupOwner", () => {
  it("is disabled without STATUS_SETUP_TOKEN", async () => {
    expect(await setupAvailable(t.db, {} as NodeJS.ProcessEnv)).toBe(false);
    await expect(setupOwner(t.db, owner, { env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({
      code: "setup_disabled",
    });
  });

  it("rejects a wrong token", async () => {
    await expect(
      setupOwner(t.db, { ...owner, setupToken: "nope" }, { env }),
    ).rejects.toBeInstanceOf(AuthError);
    expect(await t.db.member.count()).toBe(0);
  });

  it("creates the owner once, then refuses", async () => {
    expect(await setupAvailable(t.db, env)).toBe(true);
    const session = await setupOwner(t.db, owner, { env });
    expect(session.member).toMatchObject({ email: "owner@example.com", role: "owner" });
    expect(await setupAvailable(t.db, env)).toBe(false);
    await expect(
      setupOwner(t.db, { ...owner, email: "second@example.com" }, { env }),
    ).rejects.toMatchObject({ code: "already_set_up" });
  });
});

describe("sessions", () => {
  it("signs in, stores only the hash, reads from a cookie header, signs out", async () => {
    await setupOwner(t.db, owner, { env });
    expect(await signIn(t.db, "owner@example.com", "wrong password!!")).toBeNull();
    expect(await signIn(t.db, "nobody@example.com", "whatever")).toBeNull();

    const session = await signIn(t.db, " OWNER@example.com ", owner.password);
    expect(session?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const token = session?.token ?? "";
    const stored = await t.db.session.findMany();
    expect(stored.some((s) => s.id === token)).toBe(false);

    const cookie = `theme=dark; ${SESSION_COOKIE}=${token}; other=1`;
    expect((await getSessionMember(t.db, cookie))?.email).toBe("owner@example.com");
    expect((await getSessionMember(t.db, token))?.role).toBe("owner");

    const header = sessionCookie(token, session?.expiresAt ?? new Date());
    expect(header).toMatch(/HttpOnly; Secure; SameSite=Lax; Max-Age=259\d{4}/);

    await signOut(t.db, token);
    expect(await getSessionMember(t.db, token)).toBeNull();
  });

  it("expires after 30 days", async () => {
    const issued = await setupOwner(t.db, owner, { env });
    const later = new Date(issued.expiresAt.getTime() + 1);
    expect(await getSessionMember(t.db, issued.token, later)).toBeNull();
    expect(await t.db.session.count()).toBe(0);
  });
});

describe("api keys", () => {
  it("creates, authenticates by scope, tracks use, and revokes", async () => {
    const { member } = await setupOwner(t.db, owner, { env });
    const { key, apiKey } = await createApiKey(t.db, member.workspaceId, "CI", [
      "evidence:write",
      "status:read",
    ]);
    expect(key).toMatch(/^ns_[A-Za-z0-9_-]{43}$/);
    expect(apiKey.prefix).toBe(key.slice(0, 10));
    expect(await t.db.apiKey.count({ where: { hash: key } })).toBe(0);

    const now = new Date("2026-10-16T12:00:00Z");
    const auth = await authenticateApiKey(t.db, `Bearer ${key}`, "evidence:write", now);
    expect(auth).toMatchObject({ workspaceId: member.workspaceId });
    expect(await authenticateApiKey(t.db, `Bearer ${key}`, "incidents:write")).toBeNull();
    expect(await authenticateApiKey(t.db, "Bearer ns_unknown", "status:read")).toBeNull();
    expect(await authenticateApiKey(t.db, key, "status:read")).toBeNull();

    const [listed] = await listApiKeys(t.db, member.workspaceId);
    expect(listed?.lastUsedAt?.toISOString()).toBe(now.toISOString());
    expect(listed).not.toHaveProperty("hash");

    expect(await revokeApiKey(t.db, "other-workspace", apiKey.id)).toBe(false);
    expect(await revokeApiKey(t.db, member.workspaceId, apiKey.id)).toBe(true);
    expect(await authenticateApiKey(t.db, `Bearer ${key}`, "evidence:write")).toBeNull();
  });

  it("rejects unknown scopes", async () => {
    const { member } = await setupOwner(t.db, owner, { env });
    await expect(
      createApiKey(t.db, member.workspaceId, "x", ["admin:all" as "status:read"]),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("roles: owner/admin manage keys, editor writes incidents", () => {
    expect(canManageKeys({ role: "admin" })).toBe(true);
    expect(canManageKeys({ role: "editor" })).toBe(false);
    expect(canWriteIncidents({ role: "editor" })).toBe(true);
  });
});
