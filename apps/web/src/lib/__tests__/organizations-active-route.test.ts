import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuthMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@nebutra/auth/server", () => ({
  createAuth: createAuthMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

async function loadRoute() {
  return import("@/app/api/organizations/active/route");
}

describe("POST /api/organizations/active", () => {
  beforeEach(() => {
    createAuthMock.mockReset();
    loggerErrorMock.mockReset();
  });

  it("rejects invalid request bodies before hitting auth", async () => {
    const { POST } = await loadRoute();

    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(createAuthMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid organization selection.",
    });
  });

  it("rejects unauthenticated requests", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue(null),
      getUserOrganizations: vi.fn(),
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org_alpha" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
  });

  it("rejects selecting an organization the user does not belong to", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        userId: "user_123",
        expiresAt: new Date("2026-04-23T00:00:00.000Z"),
      }),
      getUserOrganizations: vi.fn().mockResolvedValue([
        {
          id: "org_beta",
          name: "Beta",
          slug: "beta",
          plan: "FREE",
          createdAt: new Date("2026-04-23T00:00:00.000Z"),
        },
      ]),
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org_alpha" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Organization not found." });
  });

  it("sets the active-organization cookie after validating membership", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        userId: "user_123",
        expiresAt: new Date("2026-04-23T00:00:00.000Z"),
      }),
      getUserOrganizations: vi.fn().mockResolvedValue([
        {
          id: "org_alpha",
          name: "Alpha",
          slug: "alpha",
          plan: "FREE",
          createdAt: new Date("2026-04-23T00:00:00.000Z"),
        },
      ]),
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org_alpha" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      organizationId: "org_alpha",
      name: "Alpha",
      slug: "alpha",
    });
    expect(response.headers.get("set-cookie")).toContain("nebutra_active_org=org_alpha");
  });
});
