import { describe, expect, it } from "vitest";
import { appendSetCookieHeaders, buildOAuthStartRedirectResponse } from "./oauth-start-response";

describe("appendSetCookieHeaders", () => {
  it("forwards every Set-Cookie via getSetCookie when available", () => {
    const source = new Headers();
    source.append("Set-Cookie", "a=1; Path=/; HttpOnly");
    source.append("Set-Cookie", "b=2; Path=/; Secure");
    const target = new Headers();
    appendSetCookieHeaders(target, source);
    const cookies = target.getSetCookie();
    expect(cookies).toEqual(
      expect.arrayContaining(["a=1; Path=/; HttpOnly", "b=2; Path=/; Secure"]),
    );
  });

  it("no-ops when source is missing", () => {
    const target = new Headers();
    appendSetCookieHeaders(target, undefined);
    expect(target.getSetCookie()).toEqual([]);
  });
});

describe("buildOAuthStartRedirectResponse", () => {
  it("returns 302 with Location and state cookies on success", () => {
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "__Secure-better-auth.state=abc.def; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax",
    );

    const response = buildOAuthStartRedirectResponse(
      {
        ok: true,
        redirectTo: "https://accounts.google.com/o/oauth2/v2/auth?state=abc",
        headers,
      },
      "https://auth.nebutra.com/api/auth/oauth/google",
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=abc",
    );
    const cookies = response.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("__Secure-better-auth.state="))).toBe(true);
  });

  it("redirects to sign-in with error when OAuth cannot start", () => {
    const response = buildOAuthStartRedirectResponse(
      {
        ok: false,
        error: { code: "unsupported", message: "no social" },
      },
      "https://auth.nebutra.com/api/auth/oauth/google",
      { provider: "google" },
    );

    expect(response.status).toBe(302);
    const location = response.headers.get("Location");
    expect(location).toContain("/sign-in");
    expect(location).toContain("error=unsupported");
    expect(location).toContain("provider=google");
  });
});
