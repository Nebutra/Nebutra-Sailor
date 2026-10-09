import { createInMemoryPlatformStaffDb, PlatformStaffRepository } from "@nebutra/repositories";
import { describe, expect, it, vi } from "vitest";
import { createPlatformStaffRoutes, maskEmail, STAFF_AUDIT } from "./staff.js";

const users = [
  { id: "u_owner", email: "owner@example.com", name: "Owner" },
  { id: "u_ops", email: "ops@example.com", name: "Ops" },
  { id: "u_ro", email: "ro@example.com", name: "Readonly" },
  { id: "u_gone", email: "gone@example.com", name: "Revoked" },
  { id: "u_plain", email: "plain@example.com", name: "Not staff" },
];

function setup(caller: string | null, canonicalize?: (id: string) => Promise<string>) {
  const db = createInMemoryPlatformStaffDb({
    users,
    staff: [
      { userId: "u_owner", role: "PLATFORM_OWNER", note: "bootstrap" },
      { userId: "u_ops", role: "PLATFORM_OPERATOR", grantedById: "u_owner" },
      { userId: "u_ro", role: "PLATFORM_READONLY", grantedById: "u_owner" },
      {
        userId: "u_gone",
        role: "PLATFORM_OWNER",
        revokedAt: new Date("2026-02-01T00:00:00Z"),
      },
    ],
  });
  const logged: Array<Record<string, unknown>> = [];
  const audit = vi.fn(() => ({
    log: async (input: Record<string, unknown>) => {
      logged.push(input);
      return `audit-${logged.length}`;
    },
  }));
  const app = createPlatformStaffRoutes({
    repo: () => new PlatformStaffRepository(db.prisma),
    caller: async () => caller,
    audit: audit as never,
    ...(canonicalize ? { canonicalize } : {}),
  });
  const post = (path: string, body: unknown) =>
    app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { app, db, logged, post };
}

const grant = { email: "plain@example.com", role: "platform_support", note: "support rota" };

describe("platform staff: authorization matrix", () => {
  it("answers 401 to the unauthenticated", async () => {
    const { app, post } = setup(null);
    expect((await app.request("/")).status).toBe(401);
    expect((await app.request("/me")).status).toBe(401);
    expect((await post("/", grant)).status).toBe(401);
  });

  it.each([
    ["a signed-in user with no grant", "u_plain"],
    ["a user whose grant was revoked", "u_gone"],
    ["an unknown user id", "u_unknown"],
  ])("answers 403 to %s on every endpoint, alike", async (_label, caller) => {
    const { app, post, db } = setup(caller);
    const bodies = [
      await app.request("/"),
      await app.request("/me"),
      await post("/", grant),
      await post("/u_ops/revoke", { note: "nope nope" }),
    ];
    for (const res of bodies) {
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Not a platform staff member." });
    }
    expect(db.staff.get("u_plain")).toBeUndefined();
    expect(db.staff.get("u_ops")?.revokedAt).toBeNull();
  });

  it.each([
    "u_ops",
    "u_ro",
  ])("lets active staff (%s) list and read /me but not grant or revoke", async (caller) => {
    const { app, post, db, logged } = setup(caller);
    const list = await app.request("/");
    expect(list.status).toBe(200);
    const body = (await list.json()) as { staff: Array<{ userId: string; email: string }> };
    expect(body.staff.map((s) => s.userId)).toContain("u_owner");

    const me = await app.request("/me");
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ userId: caller, canGrant: false, canRevoke: false });

    expect((await post("/", grant)).status).toBe(403);
    expect((await post("/u_ro/revoke", { note: "no right" })).status).toBe(403);
    expect(db.staff.get("u_plain")).toBeUndefined();
    // Refusals are recorded too.
    expect(logged.map((l) => l.outcome)).toEqual(["denied", "denied"]);
  });

  it("masks emails in every response", async () => {
    const { app } = setup("u_owner");
    const text = await (await app.request("/")).text();
    expect(text).not.toContain("owner@example.com");
    expect(text).toContain("ow***@example.com");
    expect(maskEmail(null)).toBeNull();
  });

  it("lists tombstones with revokedAt, active first", async () => {
    const { app } = setup("u_owner");
    const { staff } = (await (await app.request("/")).json()) as {
      staff: Array<{ userId: string; active: boolean; revokedAt: string | null }>;
    };
    expect(staff.at(-1)).toMatchObject({ userId: "u_gone", active: false });
    expect(staff.at(-1)?.revokedAt).toBeTruthy();
  });
});

describe("platform staff: grant", () => {
  it("lets the owner grant by email, stores grantor and note, and returns the audit id", async () => {
    const { post, db, logged } = setup("u_owner");
    const res = await post("/", grant);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      userId: "u_plain",
      role: "platform_support",
      active: true,
      note: "support rota",
      auditId: "audit-1",
      grantedBy: { userId: "u_owner" },
    });
    expect(db.staff.get("u_plain")).toMatchObject({
      role: "PLATFORM_SUPPORT",
      grantedById: "u_owner",
    });
    expect(logged[0]).toMatchObject({
      action: STAFF_AUDIT.granted,
      outcome: "success",
      resource: { type: "platform_staff", id: "u_plain" },
    });
  });

  it("accepts the Prisma spelling of a role and grants by userId", async () => {
    const { post, db } = setup("u_owner");
    const res = await post("/", {
      userId: "u_plain",
      role: "PLATFORM_READONLY",
      note: "dashboards",
    });
    expect(res.status).toBe(201);
    expect(db.staff.get("u_plain")?.role).toBe("PLATFORM_READONLY");
  });

  it("requires a note and exactly one of email or userId", async () => {
    const { post } = setup("u_owner");
    expect((await post("/", { ...grant, note: "" })).status).toBe(400);
    expect((await post("/", { email: grant.email, role: grant.role })).status).toBe(400);
    expect((await post("/", { ...grant, userId: "u_plain" })).status).toBe(400);
    expect((await post("/", { role: grant.role, note: "just because" })).status).toBe(400);
  });

  it("rejects an unknown role instead of defaulting", async () => {
    const { post, db } = setup("u_owner");
    const res = await post("/", { ...grant, role: "superuser" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "invalid_role" });
    expect(db.staff.get("u_plain")).toBeUndefined();
  });

  it("answers 404 for an account that does not exist", async () => {
    const { post } = setup("u_owner");
    expect((await post("/", { ...grant, email: "ghost@example.com" })).status).toBe(404);
  });

  it("refuses self-grant, even by the owner, and records the attempt", async () => {
    const { post, db, logged } = setup("u_owner");
    const res = await post("/", {
      email: "owner@example.com",
      role: "platform_owner",
      note: "self",
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "self_grant" });
    expect(db.staff.get("u_owner")?.note).toBe("bootstrap");
    expect(logged[0]).toMatchObject({ outcome: "denied", metadata: { reason: "self_grant" } });
  });

  it("a co-owner may demote the first owner while two owners exist; the repository guards the last one", async () => {
    const first = setup("u_owner");
    await first.post("/", { userId: "u_ops", role: "platform_owner", note: "co-owner" });
    const asOps = createPlatformStaffRoutes({
      repo: () => new PlatformStaffRepository(first.db.prisma),
      caller: async () => "u_ops",
      audit: (() => ({ log: async () => "a" })) as never,
    });
    const demote = (userId: string, role: string) =>
      asOps.request("/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, role, note: "rotation" }),
      });
    expect((await demote("u_owner", "platform_operator")).status).toBe(201);
    // u_ops is now the only owner; another owner cannot exist to demote it.
    expect(first.db.staff.get("u_owner")?.role).toBe("PLATFORM_OPERATOR");
  });

  it("re-granting a revoked person clears the tombstone", async () => {
    const { post, db } = setup("u_owner");
    const res = await post("/", { userId: "u_gone", role: "platform_readonly", note: "returned" });
    expect(res.status).toBe(201);
    expect(db.staff.get("u_gone")).toMatchObject({ revokedAt: null, role: "PLATFORM_READONLY" });
  });
});

describe("platform staff: revoke", () => {
  it("tombstones the row, keeps it, stores the note and writes an audit entry", async () => {
    const { post, db, logged, app } = setup("u_owner");
    const res = await post("/u_ops/revoke", { note: "left the company" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: "u_ops", active: false, auditId: "audit-1" });
    expect(db.staff.get("u_ops")).toMatchObject({ note: "left the company" });
    expect(db.staff.get("u_ops")?.revokedAt).toBeInstanceOf(Date);
    expect(logged[0]).toMatchObject({ action: STAFF_AUDIT.revoked, outcome: "success" });
    // They are no longer staff.
    const asOps = createPlatformStaffRoutes({
      repo: () => new PlatformStaffRepository(db.prisma),
      caller: async () => "u_ops",
      audit: (() => ({ log: async () => null })) as never,
    });
    expect((await asOps.request("/")).status).toBe(403);
    expect((await app.request("/")).status).toBe(200);
  });

  it("accepts an email in place of the user id", async () => {
    const { post, db } = setup("u_owner");
    const res = await post(`/${encodeURIComponent("ops@example.com")}/revoke`, {
      note: "rotation",
    });
    expect(res.status).toBe(200);
    expect(db.staff.get("u_ops")?.revokedAt).toBeInstanceOf(Date);
  });

  it("requires a note", async () => {
    const { post, db } = setup("u_owner");
    expect((await post("/u_ops/revoke", {})).status).toBe(400);
    expect(db.staff.get("u_ops")?.revokedAt).toBeNull();
  });

  it("cannot revoke the last active owner, including oneself", async () => {
    const { post, db, logged } = setup("u_owner");
    const res = await post("/u_owner/revoke", { note: "step down" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "last_owner" });
    expect(db.staff.get("u_owner")?.revokedAt).toBeNull();
    expect(logged[0]).toMatchObject({ outcome: "denied", metadata: { reason: "last_owner" } });
  });

  it("answers 409 for a grant that is already revoked and 404 for someone never staff", async () => {
    const { post } = setup("u_owner");
    expect((await post("/u_gone/revoke", { note: "again" })).status).toBe(409);
    expect((await post("/u_plain/revoke", { note: "never" })).status).toBe(404);
  });
});

describe("platform staff: one canonical identity", () => {
  it("grants by the auth center's id (as `nebutra login` prints it) to the canonical users row", async () => {
    const { post, db } = setup("u_owner", async (id) => (id === "ba_plain" ? "u_plain" : id));
    const res = await post("/", {
      userId: "ba_plain",
      role: "platform_support",
      note: "support rota",
    });
    expect(res.status).toBe(201);
    expect(db.staff.get("u_plain")).toBeDefined();
    expect(db.staff.get("ba_plain")).toBeUndefined();
  });

  it("a canonical id passes through unchanged", async () => {
    const { post, db } = setup("u_owner", async (id) => id);
    const res = await post("/", {
      userId: "u_plain",
      role: "platform_support",
      note: "support rota",
    });
    expect(res.status).toBe(201);
    expect(db.staff.get("u_plain")).toBeDefined();
  });
});
