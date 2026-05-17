import { decode } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleOneTapSessionCookie,
  getGoogleOneTapAllowedOrigins,
  handleGoogleOneTapSignIn,
  verifyGoogleOneTapCsrf,
} from "../google-one-tap";

const verifiedUser = {
  sub: "google-sub-123",
  email: "ada@example.com",
  emailVerified: true,
  name: "Ada Lovelace",
  picture: "https://lh3.googleusercontent.com/a/test",
};

function makePost({
  origin = "https://nebutra.com",
  cookie = "csrf_123",
  csrf = "csrf_123",
  credential = "google.jwt",
} = {}) {
  const body = new URLSearchParams({
    credential,
    g_csrf_token: csrf,
  });
  return new Request("https://app.nebutra.com/api/auth/google-one-tap", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: `g_csrf_token=${cookie}`,
      origin,
    },
    body,
  });
}

describe("verifyGoogleOneTapCsrf", () => {
  it("accepts Google's double-submit CSRF token only when cookie and body match", async () => {
    await expect(verifyGoogleOneTapCsrf(makePost())).resolves.toBe("google.jwt");
  });

  it("rejects missing or mismatched Google CSRF tokens", async () => {
    await expect(verifyGoogleOneTapCsrf(makePost({ csrf: "other" }))).rejects.toThrow(
      /CSRF token mismatch/,
    );
    await expect(verifyGoogleOneTapCsrf(makePost({ cookie: "" }))).rejects.toThrow(
      /CSRF token missing/,
    );
  });
});

describe("getGoogleOneTapAllowedOrigins", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nebutra.com");
    vi.stubEnv("NEBUTRA_LANDING_ORIGIN", "https://www.nebutra.com");
  });

  it("allows the canonical landing origins plus the app origin receiving the POST", () => {
    expect(
      getGoogleOneTapAllowedOrigins(new URL("https://app.nebutra.com/api/auth/google-one-tap")),
    ).toEqual(["https://app.nebutra.com", "https://nebutra.com", "https://www.nebutra.com"]);
  });
});

describe("buildGoogleOneTapSessionCookie", () => {
  it("issues an Auth.js JWT session cookie that NextAuth can decode", async () => {
    const cookie = await buildGoogleOneTapSessionCookie({
      maxAge: 60 * 60,
      requestUrl: new URL("https://app.nebutra.com/api/auth/google-one-tap"),
      secret: "test-secret-test-secret-test-secret",
      user: verifiedUser,
    });

    expect(cookie).toContain("__Secure-authjs.session-token=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");

    const token = cookie.match(/__Secure-authjs\.session-token=([^;]+)/)?.[1];
    expect(token).toBeTruthy();
    await expect(
      decode({
        token,
        secret: "test-secret-test-secret-test-secret",
        salt: "__Secure-authjs.session-token",
      }),
    ).resolves.toMatchObject({
      sub: "google-sub-123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      picture: "https://lh3.googleusercontent.com/a/test",
      provider: "google",
    });
  });
});

describe("handleGoogleOneTapSignIn", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-test-secret-test-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://nebutra.com");
  });

  it("rejects posts from origins outside the configured landing/app allowlist", async () => {
    await expect(
      handleGoogleOneTapSignIn(makePost({ origin: "https://evil.example" }), {
        verifyIdToken: vi.fn(async () => verifiedUser),
      }),
    ).rejects.toThrow(/Origin is not allowed/);
  });

  it("verifies the Google ID token and returns a dashboard redirect with session cookies", async () => {
    const verifyIdToken = vi.fn(async () => verifiedUser);
    const response = await handleGoogleOneTapSignIn(makePost(), { verifyIdToken });

    expect(verifyIdToken).toHaveBeenCalledWith("google.jwt");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://app.nebutra.com/dashboard");
    expect(response.headers.get("set-cookie")).toContain("__Secure-authjs.session-token=");
    expect(response.headers.get("set-cookie")).toContain("nebutra_session_hint=1");
  });
});
