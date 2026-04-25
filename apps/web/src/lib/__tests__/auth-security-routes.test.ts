import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();
const loggerErrorMock = vi.fn();

const dbMock = {
  authAccount: {
    findMany: vi.fn(),
  },
  authSession: {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
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

async function loadListAccountsRoute() {
  return import("@/app/api/auth/list-accounts/route");
}

async function loadListSessionsRoute() {
  return import("@/app/api/auth/list-sessions/route");
}

async function loadRevokeSessionRoute() {
  return import("@/app/api/auth/revoke-session/route");
}

describe("security auth routes", () => {
  beforeEach(() => {
    getAuthMock.mockReset();
    loggerErrorMock.mockReset();
    dbMock.authAccount.findMany.mockReset();
    dbMock.authSession.findMany.mockReset();
    dbMock.authSession.deleteMany.mockReset();
  });

  describe("GET /api/auth/list-accounts", () => {
    it("rejects unauthenticated requests", async () => {
      getAuthMock.mockResolvedValue({ userId: null });

      const { GET } = await loadListAccountsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-accounts"));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
      expect(dbMock.authAccount.findMany).not.toHaveBeenCalled();
    });

    it("returns serialized accounts for the authenticated user", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authAccount.findMany.mockResolvedValue([
        {
          id: "account_1",
          providerId: "credential",
          accountId: "user@example.com",
          createdAt: new Date("2026-04-23T00:00:00.000Z"),
          updatedAt: new Date("2026-04-23T01:00:00.000Z"),
        },
      ]);

      const { GET } = await loadListAccountsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-accounts"));

      expect(response.status).toBe(200);
      expect(dbMock.authAccount.findMany).toHaveBeenCalledWith({
        where: { userId: "user_123" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          providerId: true,
          accountId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await expect(response.json()).resolves.toEqual([
        {
          id: "account_1",
          providerId: "credential",
          accountId: "user@example.com",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T01:00:00.000Z",
        },
      ]);
    });

    it("returns a stable 500 payload when account lookup fails", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authAccount.findMany.mockRejectedValue(new Error("db offline"));

      const { GET } = await loadListAccountsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-accounts"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to load linked sign-in methods.",
      });
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/list-sessions", () => {
    it("rejects unauthenticated requests", async () => {
      getAuthMock.mockResolvedValue({ userId: null });

      const { GET } = await loadListSessionsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-sessions"));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
      expect(dbMock.authSession.findMany).not.toHaveBeenCalled();
    });

    it("returns serialized sessions for the authenticated user", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authSession.findMany.mockResolvedValue([
        {
          id: "session_1",
          createdAt: new Date("2026-04-23T00:00:00.000Z"),
          updatedAt: new Date("2026-04-23T01:00:00.000Z"),
          expiresAt: new Date("2026-04-30T00:00:00.000Z"),
          ipAddress: "127.0.0.1",
          userAgent: "Vitest Browser",
        },
      ]);

      const { GET } = await loadListSessionsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-sessions"));

      expect(response.status).toBe(200);
      expect(dbMock.authSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user_123" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
        },
      });
      await expect(response.json()).resolves.toEqual([
        {
          id: "session_1",
          createdAt: "2026-04-23T00:00:00.000Z",
          updatedAt: "2026-04-23T01:00:00.000Z",
          expiresAt: "2026-04-30T00:00:00.000Z",
          ipAddress: "127.0.0.1",
          userAgent: "Vitest Browser",
        },
      ]);
    });

    it("returns a stable 500 payload when session lookup fails", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authSession.findMany.mockRejectedValue(new Error("db offline"));

      const { GET } = await loadListSessionsRoute();
      const response = await GET(new Request("http://localhost/api/auth/list-sessions"));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to load active sessions.",
      });
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/revoke-session", () => {
    it("rejects unauthenticated requests", async () => {
      getAuthMock.mockResolvedValue({ userId: null });

      const { POST } = await loadRevokeSessionRoute();
      const response = await POST(
        new Request("http://localhost/api/auth/revoke-session", {
          method: "POST",
          body: JSON.stringify({ sessionId: "session_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
      expect(dbMock.authSession.deleteMany).not.toHaveBeenCalled();
    });

    it("rejects invalid request bodies", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });

      const { POST } = await loadRevokeSessionRoute();
      const response = await POST(
        new Request("http://localhost/api/auth/revoke-session", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Invalid session revoke request.",
      });
      expect(dbMock.authSession.deleteMany).not.toHaveBeenCalled();
    });

    it("returns not found when the session does not belong to the user", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authSession.deleteMany.mockResolvedValue({ count: 0 });

      const { POST } = await loadRevokeSessionRoute();
      const response = await POST(
        new Request("http://localhost/api/auth/revoke-session", {
          method: "POST",
          body: JSON.stringify({ sessionId: "session_missing" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "Session not found." });
    });

    it("revokes the session for the authenticated user", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authSession.deleteMany.mockResolvedValue({ count: 1 });

      const { POST } = await loadRevokeSessionRoute();
      const response = await POST(
        new Request("http://localhost/api/auth/revoke-session", {
          method: "POST",
          body: JSON.stringify({ sessionId: "session_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(200);
      expect(dbMock.authSession.deleteMany).toHaveBeenCalledWith({
        where: {
          id: "session_1",
          userId: "user_123",
        },
      });
      await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it("returns a stable 500 payload when revoke fails", async () => {
      getAuthMock.mockResolvedValue({ userId: "user_123" });
      dbMock.authSession.deleteMany.mockRejectedValue(new Error("db offline"));

      const { POST } = await loadRevokeSessionRoute();
      const response = await POST(
        new Request("http://localhost/api/auth/revoke-session", {
          method: "POST",
          body: JSON.stringify({ sessionId: "session_1" }),
          headers: { "content-type": "application/json" },
        }),
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Failed to revoke session.",
      });
      expect(loggerErrorMock).toHaveBeenCalled();
    });
  });
});
