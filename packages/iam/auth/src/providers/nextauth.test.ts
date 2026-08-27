import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNextAuthProvider, mapSession, withDefaultNextAuthCallbacks } from "./nextauth";

describe("mapSession (NextAuth → canonical Session)", () => {
  it("returns null when the payload is null/undefined", () => {
    expect(mapSession(null)).toBeNull();
    expect(mapSession(undefined)).toBeNull();
  });

  it("returns null when the user object is missing", () => {
    expect(mapSession({ expires: "2030-01-01T00:00:00.000Z" })).toBeNull();
  });

  it("returns null when user.id is empty (custom session callback not wired yet)", () => {
    expect(
      mapSession({
        user: { id: "", email: "x@example.com" },
        expires: "2030-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("maps a populated session and parses the expires ISO string", () => {
    const session = mapSession({
      user: { id: "user_123", email: "a@b.test", name: "Alice", image: null },
      expires: "2030-01-01T00:00:00.000Z",
    });

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user_123");
    expect(session?.email).toBe("a@b.test");
    expect(session?.expiresAt.toISOString()).toBe("2030-01-01T00:00:00.000Z");
  });

  it("omits optional fields entirely when absent (exactOptionalPropertyTypes contract)", () => {
    const session = mapSession({
      user: { id: "user_123" },
      expires: "2030-01-01T00:00:00.000Z",
    });

    expect(session).not.toBeNull();
    if (!session) throw new Error("expected session");
    expect("email" in session).toBe(false);
    expect("organizationId" in session).toBe(false);
    expect("role" in session).toBe(false);
  });

  it("forwards organizationId + role when supplied via custom session callback", () => {
    const session = mapSession({
      user: { id: "user_123", email: "a@b.test" },
      expires: "2030-01-01T00:00:00.000Z",
      organizationId: "org_456",
      role: "admin",
    });

    expect(session?.organizationId).toBe("org_456");
    expect(session?.role).toBe("admin");
  });

  it("falls back to a +1h expiresAt when the payload omits expires", () => {
    const before = Date.now();
    const session = mapSession({ user: { id: "user_123" } });
    const after = Date.now();

    const ms = session?.expiresAt.getTime();
    expect(ms).toBeGreaterThanOrEqual(before + 3_600_000 - 50);
    expect(ms).toBeLessThanOrEqual(after + 3_600_000 + 50);
  });
});

describe("createNextAuthProvider env validation", () => {
  const originalSecret = process.env.AUTH_SECRET;
  const originalNextSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
    if (originalNextSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalNextSecret;
  });

  it("throws with explicit guidance when no signing secret is set", () => {
    expect(() => createNextAuthProvider({ provider: "nextauth" })).toThrow(/AUTH_SECRET/);
  });

  it("accepts the legacy NEXTAUTH_SECRET env var for back-compat", () => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.provider).toBe("nextauth");
  });

  it("prefers AUTH_SECRET over NEXTAUTH_SECRET when both are set", () => {
    process.env.AUTH_SECRET = "modern-secret";
    process.env.NEXTAUTH_SECRET = "legacy-secret";
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.provider).toBe("nextauth");
  });
});

describe("withDefaultNextAuthCallbacks", () => {
  it("projects token.sub onto session.user.id when consumers do not provide callbacks", async () => {
    const options = withDefaultNextAuthCallbacks({});
    const callbacks = options.callbacks as {
      session: (args: unknown) => Promise<unknown>;
    };

    const session = await callbacks.session({
      session: { user: { email: "ada@example.com", name: "Ada" } },
      token: { sub: "google-sub-123" },
    });

    expect(session).toMatchObject({
      user: {
        id: "google-sub-123",
        email: "ada@example.com",
        name: "Ada",
      },
    });
  });

  it("preserves consumer callbacks and fills the id after they run", async () => {
    const options = withDefaultNextAuthCallbacks({
      callbacks: {
        async jwt({ token }: { token: Record<string, unknown> }) {
          return { ...token, role: "admin" };
        },
        async session({ session }: { session: Record<string, unknown> }) {
          return { ...session, role: "admin" };
        },
      },
    });
    const callbacks = options.callbacks as {
      jwt: (args: unknown) => Promise<unknown>;
      session: (args: unknown) => Promise<unknown>;
    };

    const token = await callbacks.jwt({
      token: { email: "ada@example.com" },
      user: { id: "user_123" },
    });
    const session = await callbacks.session({
      session: { user: { email: "ada@example.com" } },
      token,
    });

    expect(token).toMatchObject({ sub: "user_123", role: "admin" });
    expect(session).toMatchObject({
      role: "admin",
      user: { id: "user_123", email: "ada@example.com" },
    });
  });
});
