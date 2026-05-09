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

    it("returns 400 for invalid body", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_admin",
        isSignedIn: true,
        sessionClaims: { org_role: "org:admin" },
      });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);
    });

    it("returns 404 if target user does not exist", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_admin",
        isSignedIn: true,
        sessionClaims: { org_role: "org:admin" },
      });
      dbMock.user.findUnique.mockResolvedValue(null);

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_does_not_exist" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(404);
    });

    it("sets a signed HTTP-only cookie when admin impersonates valid user", async () => {
      getAuthMock.mockResolvedValue({
        userId: "user_admin",
        isSignedIn: true,
        sessionClaims: { org_role: "org:admin" },
      });
      dbMock.user.findUnique.mockResolvedValue({ id: "u_target" });

      const { POST } = await loadRoute();
      const response = await POST(
        buildRequest("http://localhost/api/admin/impersonate", {
          method: "POST",
          body: JSON.stringify({ userId: "u_target" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });

      const cookie = response.headers.get("set-cookie");
      expect(cookie).toBeTruthy();
      expect(cookie).toContain("nebutra-impersonate=");
      expect(cookie).toContain("HttpOnly");
      // Signed payload format: <userId>.<signature>
      expect(cookie).toMatch(/nebutra-impersonate=u_target\.[a-f0-9]+/);
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
