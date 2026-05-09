import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  aPIKey: {
    findMany: vi.fn(),
    create: vi.fn(),
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
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/api-keys/route");
}

function buildRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

const ADMIN_AUTH = {
  userId: "user_admin",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:admin" },
};

const VIEWER_AUTH = {
  userId: "user_viewer",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:viewer" },
};

describe("/api/api-keys", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    Object.values(dbMock.aPIKey).forEach((fn) => fn.mockReset());
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      getAuthMock.mockResolvedValue({
        userId: null,
        orgId: null,
        isSignedIn: false,
        sessionClaims: {},
      });

      const { GET } = await loadRoute();
      const res = await GET(buildRequest("http://localhost/api/api-keys"));
      expect(res.status).toBe(401);
    });

    it("returns 403 when user lacks api_key:read", async () => {
      getAuthMock.mockResolvedValue({
        userId: "u1",
        orgId: null, // no org → forbidden
        isSignedIn: true,
        sessionClaims: { org_role: "org:viewer" },
      });

      const { GET } = await loadRoute();
      const res = await GET(buildRequest("http://localhost/api/api-keys"));
      expect(res.status).toBe(403);
    });

    it("returns active (non-revoked) keys for current org without exposing keyHash", async () => {
      getAuthMock.mockResolvedValue(ADMIN_AUTH);
      const now = new Date("2026-01-01T00:00:00Z");
      dbMock.aPIKey.findMany.mockResolvedValue([
        {
          id: "k1",
          name: "Production",
          keyPrefix: "nbk_live_abc",
          lastUsedAt: null,
          scopes: ["read"],
          rateLimitRps: 10,
          expiresAt: null,
          createdAt: now,
        },
      ]);

      const { GET } = await loadRoute();
      const res = await GET(buildRequest("http://localhost/api/api-keys"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.keys).toHaveLength(1);
      expect(body.keys[0]).toMatchObject({
        id: "k1",
        name: "Production",
        keyPrefix: "nbk_live_abc",
        scopes: ["read"],
      });
      expect(body.keys[0]).not.toHaveProperty("keyHash");
      // Verify findMany scoped to org and excluded revoked keys
      expect(dbMock.aPIKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org_1", revokedAt: null },
        }),
      );
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      getAuthMock.mockResolvedValue({
        userId: null,
        orgId: null,
        isSignedIn: false,
        sessionClaims: {},
      });

      const { POST } = await loadRoute();
      const res = await POST(
        buildRequest("http://localhost/api/api-keys", {
          method: "POST",
          body: JSON.stringify({ name: "x", scopes: [] }),
          headers: { "content-type": "application/json" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when role lacks api_key:create", async () => {
      getAuthMock.mockResolvedValue(VIEWER_AUTH);

      const { POST } = await loadRoute();
      const res = await POST(
        buildRequest("http://localhost/api/api-keys", {
          method: "POST",
          body: JSON.stringify({ name: "x", scopes: [] }),
          headers: { "content-type": "application/json" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid body (missing name)", async () => {
      getAuthMock.mockResolvedValue(ADMIN_AUTH);

      const { POST } = await loadRoute();
      const res = await POST(
        buildRequest("http://localhost/api/api-keys", {
          method: "POST",
          body: JSON.stringify({ scopes: [] }),
          headers: { "content-type": "application/json" },
        }),
      );
      expect(res.status).toBe(400);
    });

    it("creates a key, hashes it, and returns the plaintext ONCE", async () => {
      getAuthMock.mockResolvedValue(ADMIN_AUTH);
      dbMock.aPIKey.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: "k_new",
          name: data.name,
          keyPrefix: data.keyPrefix,
          scopes: data.scopes ?? [],
          rateLimitRps: data.rateLimitRps ?? 10,
          expiresAt: data.expiresAt ?? null,
          createdAt: new Date("2026-01-02T00:00:00Z"),
        }),
      );

      const { POST } = await loadRoute();
      const res = await POST(
        buildRequest("http://localhost/api/api-keys", {
          method: "POST",
          body: JSON.stringify({ name: "Prod", scopes: ["read", "write"] }),
          headers: { "content-type": "application/json" },
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.key).toMatch(/^nbk_live_[A-Za-z0-9]+$/);
      expect(body.id).toBe("k_new");
      expect(body.keyPrefix).toMatch(/^nbk_live_/);
      expect(body.name).toBe("Prod");

      // Verify create was called with hashed value, never plaintext
      const createCall = dbMock.aPIKey.create.mock.calls[0][0];
      expect(createCall.data.keyHash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
      expect(createCall.data.keyHash).not.toBe(body.key);
      expect(createCall.data.organizationId).toBe("org_1");
      expect(createCall.data.scopes).toEqual(["read", "write"]);
      expect(createCall.data.keyPrefix).toHaveLength(12);
    });
  });
});
