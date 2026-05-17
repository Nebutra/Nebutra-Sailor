import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const issueBatchMock = vi.fn(async () => [
  {
    plaintextCode: "neb_testcode",
    invite: {
      id: "aic_1",
      codePrefix: "neb_testcode",
      scope: "platform",
      tenantId: undefined,
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  },
]);
const auditLogMock = vi.fn(async () => undefined);
const sendInvitationEmailMock = vi.fn(async () => ({ id: "email_1", provider: "console" }));
const createLinkMock = vi.fn(async () => ({
  id: "dub_1",
  shortLink: "https://go.example/invite-neb_testcode",
}));
const createAnalyticsClientMock = vi.fn(() => ({
  links: { create: createLinkMock },
}));
const findManyMock = vi.fn(async () => [
  {
    id: "aic_1",
    codePrefix: "neb_test",
    scope: "PLATFORM",
    tenantId: null,
    issuedByUserId: "user_admin",
    issuedToEmail: "ada@example.com",
    status: "ACTIVE",
    maxRedemptions: 1,
    redemptionCount: 0,
    expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  },
]);
const updateManyMock = vi.fn(async () => ({ count: 1 }));

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    accessInviteCode: {
      findMany: findManyMock,
      updateMany: updateManyMock,
    },
  },
}));

vi.mock("@nebutra/access-gate", () => ({
  createAccessGate: vi.fn(() => ({ issueBatch: issueBatchMock })),
  createPrismaAccessInviteStore: vi.fn(() => ({ kind: "store" })),
}));

vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: auditLogMock })),
}));

vi.mock("@nebutra/email", () => ({
  sendInvitationEmail: sendInvitationEmailMock,
}));

vi.mock("@nebutra/analytics", () => ({
  createAnalyticsClient: createAnalyticsClientMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

function makeRequest(body: unknown): Request {
  return new Request("https://app.example/api/admin/access-invites", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/admin/access-invites/route");
}

describe("POST /api/admin/access-invites", () => {
  beforeEach(() => {
    delete process.env.DUB_API_KEY;
    delete process.env.DUB_DEFAULT_DOMAIN;
    delete process.env.DUB_WORKSPACE_ID;
    getAuthMock.mockReset();
    issueBatchMock.mockClear();
    auditLogMock.mockClear();
    sendInvitationEmailMock.mockClear();
    createLinkMock.mockClear();
    createAnalyticsClientMock.mockClear();
    findManyMock.mockClear();
    updateManyMock.mockClear();
  });

  it("requires admin manage-users permission", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "user_member",
      sessionClaims: { org_role: "org:member" },
    });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest({ count: 1, scope: "platform" }));

    expect(response.status).toBe(403);
    expect(issueBatchMock).not.toHaveBeenCalled();
  });

  it("issues plaintext invite codes once and audits the operation", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "user_admin",
      orgId: "org_1",
      sessionClaims: { org_role: "org:admin" },
    });
    const { POST } = await loadRoute();

    const response = await POST(
      makeRequest({
        count: 1,
        scope: "platform",
        issuedToEmail: "ada@example.com",
        expiresAt: "2026-06-01T00:00:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    expect(issueBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        issuedByUserId: "user_admin",
        scope: "platform",
        issuedToEmail: "ada@example.com",
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    );
    expect(await response.json()).toMatchObject({
      invites: [
        {
          attributionStatus: "canonical",
          code: "neb_testcode",
          emailStatus: "sent",
          id: "aic_1",
          inviteUrl: "https://app.example/sign-up?invite=neb_testcode",
          prefix: "neb_testcode",
        },
      ],
    });
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@example.com",
        acceptUrl: "https://app.example/sign-up?invite=neb_testcode",
        role: "Early access",
      }),
    );
    expect(createAnalyticsClientMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.access_invite.issued",
        outcome: "success",
        severity: "warning",
      }),
    );
  });

  it("creates a Dub attribution link when configured", async () => {
    process.env.DUB_API_KEY = "dub_token";
    process.env.DUB_DEFAULT_DOMAIN = "go.example";
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "user_admin",
      orgId: "org_1",
      sessionClaims: { org_role: "org:admin" },
    });
    const { POST } = await loadRoute();

    const response = await POST(
      makeRequest({
        count: 1,
        scope: "platform",
        issuedToEmail: "ada@example.com",
      }),
    );

    expect(response.status).toBe(200);
    expect(createAnalyticsClientMock).toHaveBeenCalledWith({
      apiKey: "dub_token",
      defaultDomain: "go.example",
    });
    expect(createLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://app.example/sign-up?invite=neb_testcode",
        key: "invite-neb_testcode",
        externalId: "aic_1",
        tags: ["access-gate", "invite"],
      }),
    );
    expect(await response.json()).toMatchObject({
      invites: [
        {
          attributionLinkId: "dub_1",
          attributionStatus: "dub",
          canonicalInviteUrl: "https://app.example/sign-up?invite=neb_testcode",
          inviteUrl: "https://go.example/invite-neb_testcode",
        },
      ],
    });
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptUrl: "https://go.example/invite-neb_testcode",
      }),
    );
  });

  it("lists recent access invites for admins", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "user_admin",
      orgId: "org_1",
      sessionClaims: { org_role: "org:admin" },
    });
    const { GET } = await loadRoute();

    const response = await GET(new Request("https://app.example/api/admin/access-invites"));

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    expect(await response.json()).toMatchObject({
      invites: [
        {
          id: "aic_1",
          prefix: "neb_test",
          scope: "platform",
          status: "active",
          issuedToEmail: "ada@example.com",
        },
      ],
    });
  });

  it("revokes active access invites and audits the operation", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "user_admin",
      orgId: "org_1",
      sessionClaims: { org_role: "org:admin" },
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("https://app.example/api/admin/access-invites", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "aic_1", action: "revoke" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "aic_1", status: "ACTIVE" },
      data: expect.objectContaining({ status: "REVOKED" }),
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.access_invite.revoked",
        outcome: "success",
        resource: { type: "access_invite", id: "aic_1" },
      }),
    );
    expect(await response.json()).toMatchObject({ id: "aic_1", status: "revoked" });
  });
});
