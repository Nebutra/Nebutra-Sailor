import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getUserMock = vi.fn();
const getSystemDbMock = vi.fn();
const loggerErrorMock = vi.fn();

const systemDbMock = {
  organizationInvitation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organizationMember: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
  getUser: getUserMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: getSystemDbMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: loggerErrorMock },
}));

async function loadRoute() {
  return import("@/app/api/invitations/[invitationId]/accept/route");
}

function makeContext(invitationId: string) {
  return { params: Promise.resolve({ invitationId }) };
}

function makeRequest() {
  return new Request("http://localhost/api/invitations/abc/accept", { method: "POST" });
}

describe("POST /api/invitations/[invitationId]/accept", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    getUserMock.mockReset();
    getSystemDbMock.mockReset().mockReturnValue(systemDbMock);
    loggerErrorMock.mockReset();
    systemDbMock.organizationInvitation.findUnique.mockReset();
    systemDbMock.organizationInvitation.update.mockReset().mockResolvedValue({});
    systemDbMock.organizationMember.findUnique.mockReset().mockResolvedValue(null);
    systemDbMock.organizationMember.create.mockReset().mockResolvedValue({ id: "member_1" });
  });

  it("rejects unauthenticated callers with 401", async () => {
    getAuthMock.mockResolvedValue({ userId: null });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(401);
    expect(systemDbMock.organizationInvitation.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the invitation does not exist", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue(null);
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_missing"));

    expect(response.status).toBe(404);
  });

  it("returns 410 when the invitation is no longer pending", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      organizationId: "org_alpha",
      role: "member",
      status: "accepted",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(410);
    expect(systemDbMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("returns 410 and marks the invitation expired when past expiresAt", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      organizationId: "org_alpha",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() - 60_000),
    });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(410);
    expect(systemDbMock.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { status: "expired" },
    });
    expect(systemDbMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("returns 403 when the signed-in user's email does not match the invitation", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    getUserMock.mockResolvedValue({ id: "user_ada", email: "different@example.com" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      organizationId: "org_alpha",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(403);
    expect(systemDbMock.organizationMember.create).not.toHaveBeenCalled();
  });

  it("creates a membership and marks the invitation accepted on the happy path", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    getUserMock.mockResolvedValue({ id: "user_ada", email: "ada@example.com" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      organizationId: "org_alpha",
      role: "admin",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(200);
    expect(systemDbMock.organizationMember.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org_alpha",
        userId: "user_ada",
        role: "ADMIN",
      },
    });
    expect(systemDbMock.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: expect.objectContaining({ status: "accepted" }),
    });
    await expect(response.json()).resolves.toEqual({ ok: true, organizationId: "org_alpha" });
  });

  it("is idempotent when the membership already exists", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
    getUserMock.mockResolvedValue({ id: "user_ada", email: "ada@example.com" });
    systemDbMock.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv_1",
      email: "ada@example.com",
      organizationId: "org_alpha",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 60_000),
    });
    systemDbMock.organizationMember.findUnique.mockResolvedValue({ id: "member_existing" });
    const { POST } = await loadRoute();

    const response = await POST(makeRequest(), makeContext("inv_1"));

    expect(response.status).toBe(200);
    expect(systemDbMock.organizationMember.create).not.toHaveBeenCalled();
    expect(systemDbMock.organizationInvitation.update).toHaveBeenCalled();
  });
});
