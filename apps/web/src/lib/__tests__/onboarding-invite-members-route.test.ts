import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getSystemDbMock = vi.fn();
const clerkAuthMock = vi.fn();
const createInvitationBulkMock = vi.fn();
const loggerErrorMock = vi.fn();

const systemDbMock = {
  organizationInvitation: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: getSystemDbMock,
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
    clerkAuthMock.mockReset().mockResolvedValue({ userId: "user_admin" });
    createInvitationBulkMock
      .mockReset()
      .mockResolvedValue([{ id: "inv_1", emailAddress: "ada@example.com" }]);
    loggerErrorMock.mockReset();
    systemDbMock.organizationInvitation.create.mockReset().mockResolvedValue({ id: "invite_1" });
    systemDbMock.organizationInvitation.findFirst.mockReset().mockResolvedValue(null);
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

  it("creates a pending OrganizationInvitation row for the database fallback", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_alpha",
      sessionClaims: { org_role: "org:admin" },
    });
    systemDbMock.organizationInvitation.findFirst.mockResolvedValue(null);

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/onboarding/invite-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: ["ada@example.com"], role: "member" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(systemDbMock.organizationInvitation.create).toHaveBeenCalledTimes(1);
    const createArgs = systemDbMock.organizationInvitation.create.mock.calls[0]![0] as {
      data: {
        email: string;
        organizationId: string;
        role: string;
        inviterId: string;
        token: string;
        status: string;
        expiresAt: Date;
      };
    };
    expect(createArgs.data.email).toBe("ada@example.com");
    expect(createArgs.data.organizationId).toBe("org_alpha");
    expect(createArgs.data.role).toBe("member");
    expect(createArgs.data.inviterId).toBe("user_admin");
    expect(createArgs.data.status).toBe("pending");
    expect(typeof createArgs.data.token).toBe("string");
    expect(createArgs.data.token.length).toBeGreaterThan(8);
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    await expect(response.json()).resolves.toEqual({
      invited: 1,
      skipped: [],
    });
  });

  it("skips an email that already has a pending invitation for the org", async () => {
    getAuthMock.mockResolvedValue({
      userId: "user_admin",
      orgId: "org_alpha",
      sessionClaims: { org_role: "org:admin" },
    });
    systemDbMock.organizationInvitation.findFirst.mockResolvedValue({
      id: "invite_existing",
      status: "pending",
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/onboarding/invite-members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emails: ["ada@example.com"], role: "member" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(systemDbMock.organizationInvitation.create).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      invited: 0,
      skipped: [{ email: "ada@example.com", reason: "already_invited" }],
    });
  });
});
