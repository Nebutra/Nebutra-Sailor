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
    // Phase 2.5: membership validation now happens inside
    // `auth.organizations.setActive(...)` (Better Auth). When the user is
    // not a member, BA throws → route surfaces 4xx with an explicit error.
    const setActive = vi
      .fn()
      .mockRejectedValue(new Error("Better Auth: user is not a member of this organization."));

    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        userId: "user_123",
        expiresAt: new Date("2026-04-23T00:00:00.000Z"),
      }),
      organizations: { setActive },
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org_alpha" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("forwards setActive's Set-Cookie headers and mirrors the first-party active-org cookie", async () => {
    // Phase 2.5: route consumes the new `SetActiveResult` (phase 2.3),
    // forwards BA's `Set-Cookie` (session rotation) AND also writes the
    // first-party `nebutra_active_org` cookie used by the server resolver.
    const setActive = vi.fn().mockResolvedValue({
      headers: new Headers({
        "set-cookie": "better-auth.session=rotated; Path=/; HttpOnly",
      }),
    });

    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({
        userId: "user_123",
        expiresAt: new Date("2026-04-23T00:00:00.000Z"),
      }),
      organizations: { setActive },
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
    expect(setActive).toHaveBeenCalledTimes(1);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("better-auth.session=rotated");
    expect(setCookie).toContain("nebutra_active_org=org_alpha");
  });
});
