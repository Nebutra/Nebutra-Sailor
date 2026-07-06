import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

async function loadRoute() {
  return import("@/app/api/admin/impersonate/route");
}

function buildRequest(url: string, init: RequestInit) {
  return new Request(url, init);
}

describe("/api/admin/impersonate", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    dbMock.user.findUnique.mockReset();
    process.env.BETTER_AUTH_SECRET = "test-impersonate-secret-1234567890";
  });

  describe("POST", () => {
    it("rejects unauthenticated requests with 401", async () => {
      getAuthMock.mockResolvedValue({
        userId: null,
        isSignedIn: false,
        sessionClaims: {},
      });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(401);
      expect(dbMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejects non-admin users with 403", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_123",
        isSignedIn: true,
        sessionClaims: { org_role: "org:member" },
      });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(403);
      expect(dbMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejects signed-in users with missing role claims with 403", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_123",
        isSignedIn: true,
        sessionClaims: {},
      });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(403);
      expect(dbMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns 501 while auth-layer impersonation consumption is disabled", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_admin",
        isSignedIn: true,
        sessionClaims: { org_role: "org:admin" },
      });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_target" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(501);
      await expect(response.json()).resolves.toEqual({
        error: "Admin impersonation is disabled until auth-layer integration is complete.",
      });
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(dbMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("rejects unauthenticated requests with 401", async () => {
      getAuthMock.mockResolvedValue({
        userId: null,
        isSignedIn: false,
        sessionClaims: {},
      });

      const { DELETE } = await loadRoute();
      const response = await DELETE(
        buildRequest("http://localhost/api/admin/impersonate", { method: "DELETE" }),
      );

      expect(response.status).toBe(401);
    });

    it("clears the impersonation cookie for admin", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_admin",
        isSignedIn: true,
        sessionClaims: { org_role: "org:admin" },
      });

      const { DELETE } = await loadRoute();
      const response = await DELETE(
        buildRequest("http://localhost/api/admin/impersonate", { method: "DELETE" }),
      );

      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie");
      expect(cookie).toBeTruthy();
      expect(cookie).toContain("nebutra-impersonate=");
      // Cleared cookie has Max-Age=0 (or expires in the past)
      expect(cookie?.toLowerCase()).toMatch(/max-age=0|expires=/);
    });
  });
});
