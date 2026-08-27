import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const organizationUpdateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      update: organizationUpdateMock,
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn() },
}));

const params = Promise.resolve({ orgId: "org_1" });

async function loadRoute() {
  return import("../route");
}

describe("PATCH /api/admin/organizations/[orgId]", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    organizationUpdateMock.mockReset();
  });

  it("requires an authenticated admin with manage org scope", async () => {
    getAuthMock.mockResolvedValue({ isSignedIn: false, userId: null, sessionClaims: {} });
    const { PATCH } = await loadRoute();

    const response = await PATCH(new Request("https://app.example/api/admin/organizations/org_1"), {
      params,
    });

    expect(response.status).toBe(401);
    expect(organizationUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "admin_1",
      sessionClaims: { org_role: "org:member" },
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(new Request("https://app.example/api/admin/organizations/org_1"), {
      params,
    });

    expect(response.status).toBe(403);
    expect(organizationUpdateMock).not.toHaveBeenCalled();
  });

  it("updates allowed editable organization fields", async () => {
    getAuthMock.mockResolvedValue({
      isSignedIn: true,
      userId: "admin_1",
      sessionClaims: { org_role: "org:admin" },
    });
    organizationUpdateMock.mockResolvedValue({
      id: "org_1",
      name: "Nebutra Labs",
      slug: "nebutra-labs",
      plan: "ENTERPRISE",
      updatedAt: new Date("2026-05-16T00:00:00.000Z"),
    });
    const { PATCH } = await loadRoute();

    const response = await PATCH(
      new Request("https://app.example/api/admin/organizations/org_1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Nebutra Labs",
          slug: "nebutra-labs",
          plan: "enterprise",
        }),
      }),
      { params },
    );

    expect(response.status).toBe(200);
    expect(organizationUpdateMock).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        name: "Nebutra Labs",
        slug: "nebutra-labs",
        plan: "ENTERPRISE",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        updatedAt: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      organization: {
        id: "org_1",
        name: "Nebutra Labs",
        slug: "nebutra-labs",
        plan: "ENTERPRISE",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    });
  });
});
