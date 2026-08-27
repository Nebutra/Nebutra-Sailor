import { describe, expect, it, vi } from "vitest";
import {
  getDeviceSessions,
  readBetterAuthSessionToken,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
} from "../device-sessions";

function makeDb() {
  return {
    authSession: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    desktopAuthSession: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe("device session infrastructure", () => {
  it("aggregates Better Auth web sessions and desktop app sessions without leaking tokens", async () => {
    const db = makeDb();
    db.authSession.findMany.mockResolvedValue([
      {
        id: "web_current",
        token: "tok_current",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        updatedAt: new Date("2026-06-05T09:00:00.000Z"),
        expiresAt: new Date("2026-07-01T10:00:00.000Z"),
        ipAddress: "203.0.113.10",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
      },
    ]);
    db.desktopAuthSession.findMany.mockResolvedValue([
      {
        id: "desktop_1",
        scheme: "foundry",
        createdAt: new Date("2026-06-02T10:00:00.000Z"),
        updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        lastUsedAt: new Date("2026-06-05T10:00:00.000Z"),
        expiresAt: new Date("2026-07-02T10:00:00.000Z"),
        ipAddress: "203.0.113.11",
        userAgent: "Nebutra Foundry/1.0 macOS",
      },
    ]);

    const sessions = await getDeviceSessions({
      currentWebSessionToken: "tok_current",
      db,
      userId: "user_1",
    });

    expect(db.authSession.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1", expiresAt: { gt: expect.any(Date) } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        token: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
    expect(db.desktopAuthSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        }),
      }),
    );
    expect(sessions).toEqual([
      expect.objectContaining({
        id: "desktop_1",
        kind: "desktop",
        label: "Nebutra Foundry desktop",
        isCurrent: false,
        canRevoke: true,
        lastActiveAt: "2026-06-05T10:00:00.000Z",
      }),
      expect.objectContaining({
        id: "web_current",
        kind: "web",
        browser: "Chrome",
        platform: "macOS",
        isCurrent: true,
        canRevoke: false,
        lastActiveAt: "2026-06-05T09:00:00.000Z",
      }),
    ]);
    expect(JSON.stringify(sessions)).not.toContain("tok_current");
  });

  it("reads the Better Auth session token from the request cookie", () => {
    const request = new Request("https://app.nebutra.com/settings/security", {
      headers: { cookie: "theme=dark; better-auth.session_token=tok%2Fcurrent; other=1" },
    });

    expect(readBetterAuthSessionToken(request)).toBe("tok/current");
  });

  it("revokes web sessions with hard delete and desktop sessions with soft revoke", async () => {
    const db = makeDb();
    db.authSession.deleteMany.mockResolvedValue({ count: 1 });
    db.desktopAuthSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      revokeDeviceSession({ db, kind: "web", sessionId: "web_1", userId: "user_1" }),
    ).resolves.toEqual({ count: 1 });
    expect(db.authSession.deleteMany).toHaveBeenCalledWith({
      where: { id: "web_1", userId: "user_1" },
    });

    await expect(
      revokeDeviceSession({ db, kind: "desktop", sessionId: "desktop_1", userId: "user_1" }),
    ).resolves.toEqual({ count: 1 });
    expect(db.desktopAuthSession.updateMany).toHaveBeenCalledWith({
      where: { id: "desktop_1", userId: "user_1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revokes all other device sessions while preserving the current web token", async () => {
    const db = makeDb();
    db.authSession.deleteMany.mockResolvedValue({ count: 2 });
    db.desktopAuthSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      revokeOtherDeviceSessions({
        currentWebSessionToken: "tok_current",
        db,
        userId: "user_1",
      }),
    ).resolves.toEqual({ desktop: 1, total: 3, web: 2 });

    expect(db.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1", NOT: { token: "tok_current" } },
    });
    expect(db.desktopAuthSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("refuses to revoke all other sessions when the current web token is unknown", async () => {
    const db = makeDb();

    await expect(
      revokeOtherDeviceSessions({
        currentWebSessionToken: null,
        db,
        userId: "user_1",
      }),
    ).rejects.toThrow("CURRENT_WEB_SESSION_REQUIRED");

    expect(db.authSession.deleteMany).not.toHaveBeenCalled();
    expect(db.desktopAuthSession.updateMany).not.toHaveBeenCalled();
  });
});
