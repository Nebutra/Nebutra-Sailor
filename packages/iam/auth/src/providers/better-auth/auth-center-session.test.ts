import { describe, expect, it, vi } from "vitest";
import {
  fetchAuthCenterSession,
  parseAuthCenterSessionPayload,
  shouldResolveSessionAtAuthCenter,
} from "./auth-center-session";

describe("shouldResolveSessionAtAuthCenter", () => {
  it("uses the auth center when the product host is a different origin", () => {
    expect(
      shouldResolveSessionAtAuthCenter(
        "https://app.nebutra.com/workspace",
        "https://auth.nebutra.com",
      ),
    ).toBe(true);
  });

  it("stays local on the auth center itself", () => {
    expect(
      shouldResolveSessionAtAuthCenter(
        "https://auth.nebutra.com/api/auth/get-session",
        "https://auth.nebutra.com",
      ),
    ).toBe(false);
  });

  it("stays local when BETTER_AUTH_URL is unset", () => {
    expect(shouldResolveSessionAtAuthCenter("https://app.nebutra.com/workspace", undefined)).toBe(
      false,
    );
  });
});

describe("parseAuthCenterSessionPayload", () => {
  it("reads Better Auth's { session, user } envelope", () => {
    const parsed = parseAuthCenterSessionPayload({
      session: { userId: "user_1", expiresAt: "2026-09-01T00:00:00.000Z" },
      user: { id: "user_1", email: "a@example.com" },
    });
    expect(parsed?.session.userId).toBe("user_1");
    expect(parsed?.user.email).toBe("a@example.com");
  });

  it("treats null / empty as signed out", () => {
    expect(parseAuthCenterSessionPayload(null)).toBeNull();
    expect(parseAuthCenterSessionPayload({})).toBeNull();
  });
});

describe("fetchAuthCenterSession", () => {
  it("forwards cookies to the auth center and returns the session", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://auth.nebutra.com/api/auth/get-session");
      expect(new Headers(init?.headers).get("cookie")).toContain("session_token=tok");
      return Response.json({
        session: { userId: "user_1", expiresAt: "2026-09-01T00:00:00.000Z" },
        user: { id: "user_1" },
      });
    });

    const session = await fetchAuthCenterSession(
      new Request("https://app.nebutra.com/workspace", {
        headers: { cookie: "__Secure-better-auth.session_token=tok" },
      }),
      "https://auth.nebutra.com",
      fetchImpl as unknown as typeof fetch,
    );

    expect(session?.session.userId).toBe("user_1");
  });

  it("returns null when the browser sent no cookie", async () => {
    const fetchImpl = vi.fn();
    const session = await fetchAuthCenterSession(
      new Request("https://app.nebutra.com/workspace"),
      "https://auth.nebutra.com",
      fetchImpl as unknown as typeof fetch,
    );
    expect(session).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws on auth-center 5xx so callers can fall back to local Prisma", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 502 }));
    await expect(
      fetchAuthCenterSession(
        new Request("https://app.nebutra.com/workspace", {
          headers: { cookie: "better-auth.session_token=tok" },
        }),
        "https://auth.nebutra.com",
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/502/);
  });
});
