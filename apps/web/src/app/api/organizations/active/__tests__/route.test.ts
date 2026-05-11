/**
 * Tests for POST /api/organizations/active — phase 2.5.
 *
 * Verifies the route consumes the new `OrganizationCapability.setActive`
 * signature introduced in phase 2.3 (returns `{ headers }` rather than void)
 * and forwards Better Auth's `Set-Cookie` rotation onto the outgoing
 * response so the active org binding persists across requests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createAuthMock = vi.fn();
const setActiveOrganizationCookie = vi.fn();

vi.mock("@nebutra/auth/server", () => ({
  createAuth: (config: unknown) => createAuthMock(config),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/active-organization", () => ({
  setActiveOrganizationCookie: (...args: unknown[]) => setActiveOrganizationCookie(...args),
}));

function buildJsonRequest(body: unknown) {
  return new Request("http://localhost/api/organizations/active", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/organizations/active (phase 2.5)", () => {
  beforeEach(() => {
    createAuthMock.mockReset();
    setActiveOrganizationCookie.mockReset();
    process.env.AUTH_PROVIDER = "better-auth";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "better-auth";
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.AUTH_PROVIDER;
    delete process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  });

  it("returns 400 when body is invalid", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/organizations/active", {
        method: "POST",
        body: "{bad",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when session is missing", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue(null),
      organizations: {
        setActive: vi.fn(),
      },
    });

    const { POST } = await import("../route");
    const res = await POST(buildJsonRequest({ organizationId: "org_1" }));

    expect(res.status).toBe(401);
  });

  it("returns 404 when provider does not expose an organizations capability", async () => {
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ userId: "user_1", expiresAt: new Date() }),
      organizations: undefined,
    });

    const { POST } = await import("../route");
    const res = await POST(buildJsonRequest({ organizationId: "org_1" }));

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/organizations/i);
  });

  it("forwards Set-Cookie headers returned by setActive to the response", async () => {
    const baHeaders = new Headers({
      "set-cookie": "better-auth.session=new-token; Path=/; HttpOnly",
    });
    const setActive = vi.fn().mockResolvedValue({ headers: baHeaders });

    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ userId: "user_1", expiresAt: new Date() }),
      organizations: { setActive },
    });

    const { POST } = await import("../route");
    const res = await POST(buildJsonRequest({ organizationId: "org_1" }));

    expect(res.status).toBe(200);
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setActive.mock.calls[0]?.[1]).toBe("org_1");
    // Set-Cookie from Better Auth must be on the outgoing response.
    expect(res.headers.get("set-cookie")).toContain("better-auth.session=new-token");
    expect(res.headers.get("content-type")).toMatch(/application\/json/i);
  });

  it("succeeds with empty Set-Cookie (BA accepted the change, no rotation needed)", async () => {
    const setActive = vi.fn().mockResolvedValue({ headers: new Headers() });

    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ userId: "user_1", expiresAt: new Date() }),
      organizations: { setActive },
    });

    const { POST } = await import("../route");
    const res = await POST(buildJsonRequest({ organizationId: "org_2" }));

    expect(res.status).toBe(200);
    // No Set-Cookie returned from BA → none on the response.
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns 4xx with an explicit error body when setActive throws", async () => {
    const setActive = vi
      .fn()
      .mockRejectedValue(new Error("Better Auth: user is not a member of this organization."));

    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ userId: "user_1", expiresAt: new Date() }),
      organizations: { setActive },
    });

    const { POST } = await import("../route");
    const res = await POST(buildJsonRequest({ organizationId: "org_x" }));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("also mirrors the active-org cookie via setActiveOrganizationCookie for first-party use", async () => {
    const setActive = vi.fn().mockResolvedValue({ headers: new Headers() });
    createAuthMock.mockResolvedValue({
      getSession: vi.fn().mockResolvedValue({ userId: "user_1", expiresAt: new Date() }),
      organizations: { setActive },
    });

    const { POST } = await import("../route");
    await POST(buildJsonRequest({ organizationId: "org_3" }));

    // Defensive: also write the first-party ACTIVE_ORG_COOKIE so the existing
    // resolver in `lib/auth.ts` continues to work even before BA cookie reaches.
    expect(setActiveOrganizationCookie).toHaveBeenCalled();
  });
});
