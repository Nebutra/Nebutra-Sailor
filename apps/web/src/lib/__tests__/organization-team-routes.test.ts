import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const loggerErrorMock = vi.fn();

const dbMock = {
  organizationMember: {
    count: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

async function loadMembersRoute() {
  return import("@/app/api/organizations/[orgId]/members/route");
}

async function loadMemberRoute() {
  return import("@/app/api/organizations/[orgId]/members/[memberId]/route");
}

const params = (orgId = "org_alpha") => Promise.resolve({ orgId });
const memberParams = (memberId = "member_target", orgId = "org_alpha") =>
  Promise.resolve({ orgId, memberId });

describe("organization team member routes", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    loggerErrorMock.mockReset();
    dbMock.organizationMember.count.mockReset();
    dbMock.organizationMember.delete.mockReset();
    dbMock.organizationMember.findFirst.mockReset();
    dbMock.organizationMember.findMany.mockReset();
    dbMock.organizationMember.findUnique.mockReset();
    dbMock.organizationMember.update.mockReset();
  });

  it("rejects member listing outside the active organization", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_beta" });

    const { GET } = await loadMembersRoute();
    const response = await GET(
      new Request("http://localhost/api/organizations/org_alpha/members"),
      {
        params: params(),
      },
    );

    expect(response.status).toBe(403);
    expect(dbMock.organizationMember.findMany).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Organization mismatch." });
  });

  it("lists members only after validating current membership", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique.mockResolvedValue({
      id: "member_current",
      role: "MEMBER",
    });
    dbMock.organizationMember.findMany.mockResolvedValue([
      {
        id: "member_current",
        userId: "user_1",
        role: "ADMIN",
        createdAt: new Date("2026-04-25T00:00:00.000Z"),
        user: {
          id: "user_1",
          name: "Ada",
          email: "ada@example.com",
          avatarUrl: null,
        },
      },
    ]);

    const { GET } = await loadMembersRoute();
    const response = await GET(
      new Request("http://localhost/api/organizations/org_alpha/members"),
      {
        params: params(),
      },
    );

    expect(response.status).toBe(200);
    expect(dbMock.organizationMember.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: "org_alpha",
          userId: "user_1",
        },
      },
      select: {
        id: true,
        role: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      currentUserId: "user_1",
      canManageRoles: false,
      canRemoveMembers: false,
      members: [
        {
          id: "member_current",
          userId: "user_1",
          role: "admin",
          joinedAt: "2026-04-25T00:00:00.000Z",
          user: {
            id: "user_1",
            name: "Ada",
            email: "ada@example.com",
            image: null,
          },
        },
      ],
    });
  });

  it("lets admins update a non-owner member role", async () => {
    getAuthMock.mockResolvedValue({ userId: "admin_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique
      .mockResolvedValueOnce({ id: "member_admin", role: "ADMIN" })
      .mockResolvedValueOnce({
        id: "member_target",
        organizationId: "org_alpha",
        role: "MEMBER",
        userId: "user_2",
      });
    dbMock.organizationMember.update.mockResolvedValue({
      id: "member_target",
      role: "VIEWER",
    });

    const { PATCH } = await loadMemberRoute();
    const response = await PATCH(
      new Request("http://localhost/api/organizations/org_alpha/members/member_target", {
        method: "PATCH",
        body: JSON.stringify({ role: "viewer" }),
        headers: { "content-type": "application/json" },
      }),
      { params: memberParams() },
    );

    expect(response.status).toBe(200);
    expect(dbMock.organizationMember.update).toHaveBeenCalledWith({
      where: { id: "member_target" },
      data: { role: "VIEWER" },
      select: { id: true, role: true },
    });
    await expect(response.json()).resolves.toEqual({
      member: { id: "member_target", role: "viewer" },
    });
  });

  it("lets a member leave their own organization without team:remove", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique
      .mockResolvedValueOnce({ id: "member_current", role: "MEMBER" })
      .mockResolvedValueOnce({
        id: "member_current",
        organizationId: "org_alpha",
        role: "MEMBER",
        userId: "user_1",
      });
    dbMock.organizationMember.delete.mockResolvedValue({ id: "member_current" });

    const { DELETE } = await loadMemberRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/members/member_current", {
        method: "DELETE",
      }),
      { params: memberParams("member_current") },
    );

    expect(response.status).toBe(200);
    expect(dbMock.organizationMember.delete).toHaveBeenCalledWith({
      where: { id: "member_current" },
    });
    await expect(response.json()).resolves.toEqual({ ok: true, action: "left" });
  });

  it("blocks non-admins from removing another member", async () => {
    getAuthMock.mockResolvedValue({ userId: "user_1", orgId: "org_alpha" });
    dbMock.organizationMember.findUnique
      .mockResolvedValueOnce({ id: "member_current", role: "MEMBER" })
      .mockResolvedValueOnce({
        id: "member_target",
        organizationId: "org_alpha",
        role: "MEMBER",
        userId: "user_2",
      });

    const { DELETE } = await loadMemberRoute();
    const response = await DELETE(
      new Request("http://localhost/api/organizations/org_alpha/members/member_target", {
        method: "DELETE",
      }),
      { params: memberParams() },
    );

    expect(response.status).toBe(403);
    expect(dbMock.organizationMember.delete).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "You don't have permission to remove members.",
    });
  });
});
