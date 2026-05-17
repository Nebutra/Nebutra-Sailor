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

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {},
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
});
