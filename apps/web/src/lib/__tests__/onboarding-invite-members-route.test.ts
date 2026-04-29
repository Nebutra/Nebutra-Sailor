import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getSystemDbMock = vi.fn();
const getTenantDbMock = vi.fn();
const clerkAuthMock = vi.fn();
const createInvitationBulkMock = vi.fn();
const loggerErrorMock = vi.fn();

const systemDbMock = {
  user: {
    findUnique: vi.fn(),
  },
};

const tenantDbMock = {
  organizationMember: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: getSystemDbMock,
  getTenantDb: getTenantDbMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkAuthMock,
  clerkClient: vi.fn(async () => ({
    organizations: {
      createOrganizationInvitationBulk: createInvitationBulkMock,
    },
  })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

async function loadRoute() {
  return import("@/app/api/onboarding/invite-members/route");
}

describe("POST /api/onboarding/invite-members", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    getSystemDbMock.mockReset().mockReturnValue(systemDbMock);
    getTenantDbMock.mockReset().mockReturnValue(tenantDbMock);
    clerkAuthMock.mockReset().mockResolvedValue({ userId: "user_admin" });
    createInvitationBulkMock
      .mockReset()
      .mockResolvedValue([{ id: "inv_1", emailAddress: "ada@example.com" }]);
    loggerErrorMock.mockReset();
    systemDbMock.user.findUnique.mockReset();
    tenantDbMock.organizationMember.create.mockReset();
    tenantDbMock.organizationMember.findUnique.mockReset();
    delete process.env.AUTH_PROVIDER;
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  });

  it("rejects invalid invitation payloads before touching providers", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/onboarding/invite-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: ["not-email"] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(getAuthMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Invalid invitation details." });
  });

  it("creates Clerk organization invitations for the active organization", async () => {
    process.env.AUTH_PROVIDER = "clerk";
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_alpha",
      sessionClaims: { org_role: "org:admin" },
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/onboarding/invite-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: ["ada@example.com"], role: "org:member" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createInvitationBulkMock).toHaveBeenCalledWith("org_alpha", [
      {
        emailAddress: "ada@example.com",
        role: "org:member",
        inviterUserId: "user_admin",
      },
    ]);
    await expect(response.json()).resolves.toEqual({
      invited: 1,
      skipped: [],
    });
  });

  it("adds existing users as members when using the database-backed fallback", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_alpha",
      sessionClaims: { org_role: "org:admin" },
    });
    systemDbMock.user.findUnique.mockResolvedValue({ id: "user_ada", email: "ada@example.com" });
    tenantDbMock.organizationMember.findUnique.mockResolvedValue(null);
    tenantDbMock.organizationMember.create.mockResolvedValue({ id: "member_ada" });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/onboarding/invite-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: ["ada@example.com"], role: "member" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(getTenantDbMock).toHaveBeenCalledWith("org_alpha");
    expect(tenantDbMock.organizationMember.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org_alpha",
        role: "MEMBER",
        userId: "user_ada",
      },
    });
    await expect(response.json()).resolves.toEqual({
      invited: 1,
      skipped: [],
    });
  });
});
