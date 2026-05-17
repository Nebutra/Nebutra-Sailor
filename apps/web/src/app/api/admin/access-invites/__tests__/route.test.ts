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
    getAuthMock.mockReset();
    issueBatchMock.mockClear();
    auditLogMock.mockClear();
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
          code: "neb_testcode",
          id: "aic_1",
          inviteUrl: "https://app.example/sign-up?invite=neb_testcode",
          prefix: "neb_testcode",
        },
      ],
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.access_invite.issued",
        outcome: "success",
        severity: "warning",
      }),
    );
  });
});
