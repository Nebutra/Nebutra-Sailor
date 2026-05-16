import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const userUpdateMock = vi.fn();
const authUserUpdateManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    authUser: {
      updateMany: authUserUpdateManyMock,
    },
    user: {
      update: userUpdateMock,
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

const params = Promise.resolve({ userId: "user_1" });

async function loadRoute() {
  return import("../route");
}

describe("PATCH /api/admin/users/[userId]", () => {
  beforeEach(() => {
    authUserUpdateManyMock.mockReset();
    getAuthMock.mockReset();
    userUpdateMock.mockReset();
  });

  it("requires an authenticated admin with manage user scope", async () => {
    getAuthMock.mockResolvedValue({ isSignedIn: false, userId: null, sessionClaims: {} });
    const { PATCH } = await loadRoute();

    const response = await PATCH(new Request("https://app.example/api/admin/users/user_1"), {
      params,
    });

    expect(response.status).toBe(401);
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(authUserUpdateManyMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "admin_1",
      sessionClaims: { org_role: "org:member" },
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(new Request("https://app.example/api/admin/users/user_1"), {
      params,
    });

    expect(response.status).toBe(403);
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(authUserUpdateManyMock).not.toHaveBeenCalled();
  });

  it("updates allowed editable user fields", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "admin_1",
      sessionClaims: { org_role: "org:admin" },
    });
    userUpdateMock.mockResolvedValue({
      id: "user_1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerified: true,
      updatedAt: new Date("2026-05-16T00:00:00.000Z"),
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("https://app.example/api/admin/users/user_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          emailVerified: true,
        }),
      }),
      { params },
    );

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
    });
    expect(authUserUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        emailVerified: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user_1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        emailVerified: true,
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    });
  });
});
