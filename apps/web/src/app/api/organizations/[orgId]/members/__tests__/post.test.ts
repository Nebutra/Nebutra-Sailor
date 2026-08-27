import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getUserMock = vi.fn();
const auditLogMock = vi.fn();
const auditLoggerMock = vi.fn(() => ({ log: auditLogMock }));
const sendInvitationEmailMock = vi.fn();
const loggerErrorMock = vi.fn();

const dbMock = {
  organizationMember: {
    findUnique: vi.fn(),
  },
  organizationInvitation: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
  getUser: getUserMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: auditLoggerMock,
}));

vi.mock("@nebutra/email", () => ({
  sendInvitationEmail: sendInvitationEmailMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/organizations/[orgId]/members/route");
}

function makeContext(orgId: string) {
  return { params: Promise.resolve({ orgId }) };
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/organizations/org_alpha/members", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/organizations/[orgId]/members", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    getUserMock.mockReset();
    auditLogMock.mockReset().mockResolvedValue(undefined);
    auditLoggerMock.mockClear();
    sendInvitationEmailMock.mockReset().mockResolvedValue({ ok: true });
    loggerErrorMock.mockReset();

    dbMock.organizationMember.findUnique.mockReset();
    dbMock.organizationInvitation.findFirst.mockReset().mockResolvedValue(null);
    dbMock.organizationInvitation.create.mockReset().mockResolvedValue({
      id: "inv_new",
      email: "ada@example.com",
      role: "member",
      status: "pending",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    dbMock.user.findUnique.mockReset().mockResolvedValue(null);
    dbMock.organization.findUnique.mockReset().mockResolvedValue({ name: "Alpha" });
  });

  it("returns 401 when unauthenticated and emits no audit", async () => {
    getAuthMock.mockResolvedValue({ userId: null, orgId: null });
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "ada@example.com", role: "member" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(401);
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(dbMock.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body and emits no audit", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_admin", orgId: "org_alpha" });
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "not-an-email", role: "bogus" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(400);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not an admin and emits no audit", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_member", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "mem_self",
      role: "MEMBER",
    });
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "ada@example.com", role: "member" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(403);
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(dbMock.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the invitee is already a member", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_admin", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique
      .mockResolvedValueOnce({ id: "mem_self", role: "ADMIN" }) // caller
      .mockResolvedValueOnce({ id: "mem_target" }); // target lookup
    dbMock.user.findUnique.mockResolvedValue({ id: "user_existing" });
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "ada@example.com", role: "member" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: "already_member" });
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(dbMock.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it("creates a pending invitation, sends email, emits org.member.added, and returns 201", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_admin", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValueOnce({
      id: "mem_self",
      role: "ADMIN",
    });
    getUserMock.mockResolvedValue({ id: "user_admin", name: "Ada Lovelace", email: "ada@x.com" });
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "Newby@example.com", role: "admin" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(201);
    expect(dbMock.organizationInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "newby@example.com",
        organizationId: "org_alpha",
        role: "admin",
        inviterId: "user_admin",
      }),
      select: expect.any(Object),
    });
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "newby@example.com",
        role: "admin",
        organizationName: "Alpha",
      }),
    );
    expect(auditLoggerMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        actor: { id: "user_admin", type: "user" },
        tenantId: "org_alpha",
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "org.member.added",
        outcome: "success",
        resource: { type: "user", id: "newby@example.com" },
        severity: "warning",
        metadata: expect.objectContaining({
          invitationId: "inv_new",
          role: "admin",
          invitedBy: "user_admin",
        }),
      }),
    );
  });

  it("still returns 201 (and audits) when the invitation email fails to send", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_admin", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValueOnce({
      id: "mem_self",
      role: "OWNER",
    });
    sendInvitationEmailMock.mockRejectedValue(new Error("smtp down"));
    const { POST } = await loadRoute();

    const res = await POST(
      makeRequest({ email: "newby@example.com", role: "viewer" }),
      makeContext("org_alpha"),
    );

    expect(res.status).toBe(201);
    expect(auditLogMock).toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "[organizations] Failed to send invitation email",
      expect.any(Object),
    );
  });
});
