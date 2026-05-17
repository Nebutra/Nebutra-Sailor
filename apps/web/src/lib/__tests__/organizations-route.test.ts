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
  return import("@/app/api/organizations/route");
}

describe("/api/organizations", () => {
  beforeEach(() => {
    vi.resetModules();
    createAuthMock.mockReset();
    loggerErrorMock.mockReset();
    delete process.env.AUTH_PROVIDER;
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  });

  it("rejects invalid organization creation bodies before hitting auth", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "", slug: "Invalid Slug!" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(createAuthMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid organization details.",
    });
  });

  it("rejects unauthenticated organization creation", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue(null),
      createOrganization: vi.fn(),
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Acme Labs", slug: "acme-labs" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
  });

  it("creates an organization and marks it active for better-auth sessions", async () => {
    const createOrganizationMock = vi.fn().mockResolvedValue({
      id: "org_alpha",
      name: "Acme Labs",
      slug: "acme-labs",
      plan: "FREE",
      createdAt: new Date("2026-04-29T00:00:00.000Z"),
    });
    createAuthMock.mockResolvedValue({
      capabilities: { organizations: true },
      getSession: vi.fn().mockResolvedValue({
        userId: "user_alpha",
        expiresAt: new Date("2026-04-29T01:00:00.000Z"),
      }),
      createOrganization: createOrganizationMock,
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Acme Labs", slug: "acme-labs" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(createOrganizationMock).toHaveBeenCalledWith({
      name: "Acme Labs",
      slug: "acme-labs",
      createdByUserId: "user_alpha",
    });
    await expect(response.json()).resolves.toEqual({
      organizationId: "org_alpha",
      organization: {
        id: "org_alpha",
        name: "Acme Labs",
        slug: "acme-labs",
        image: null,
      },
    });
    expect(response.headers.get("set-cookie")).toContain("nebutra_active_org=org_alpha");
  });

  it("does not route NextAuth organization creation through Better Auth", async () => {
    process.env.AUTH_PROVIDER = "nextauth";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "nextauth";

    createAuthMock.mockResolvedValue({
      capabilities: { organizations: false },
      getSession: vi.fn().mockResolvedValue({
        userId: "user_alpha",
        expiresAt: new Date("2026-04-29T01:00:00.000Z"),
      }),
      createOrganization: vi.fn(),
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Acme Labs", slug: "acme-labs" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(createAuthMock).toHaveBeenCalledWith({ provider: "nextauth" });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Organizations are not enabled for this provider.",
    });
  });
});
