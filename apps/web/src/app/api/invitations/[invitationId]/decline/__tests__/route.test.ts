import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const getSystemDbMock = vi.fn();
const loggerErrorMock = vi.fn();

const systemDbMock = {
  organizationInvitation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: getSystemDbMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: loggerErrorMock },
}));

async function loadRoute() {
  return import("@/app/api/invitations/[invitationId]/decline/route");
}

function makeContext(invitationId: string) {
  return { params: Promise.resolve({ invitationId }) };
}

function makeRequest() {
  return new Request("http://localhost/api/invitations/abc/decline", { method: "POST" });
}

describe("POST /api/invitations/[invitationId]/decline", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    getSystemDbMock.mockReset().mockReturnValue(systemDbMock);
    loggerErrorMock.mockReset();
    systemDbMock.organizationInvitation.findUnique.mockReset();
    systemDbMock.organizationInvitation.update.mockReset().mockResolvedValue({});
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
    expect(systemDbMock.organizationInvitation.update).not.toHaveBeenCalled();
  });

  it("marks the invitation declined on the happy path", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_ada" });
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

    expect(response.status).toBe(200);
    expect(systemDbMock.organizationInvitation.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: expect.objectContaining({ status: "declined" }),
    });
    await expect(response.json()).resolves.toEqual({ ok: true });
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
    expect(systemDbMock.organizationInvitation.update).not.toHaveBeenCalled();
  });
});
