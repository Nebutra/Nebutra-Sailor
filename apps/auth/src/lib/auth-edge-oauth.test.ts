import { describe, expect, it } from "vitest";
import {
  asBrowserOAuthRedirect,
  copySetCookieHeaders,
  finalizeOAuthCallback,
  isOAuthCallbackPath,
  shouldServeOAuthContinuePage,
  socialStartToRedirect,
  summarizeAuthResponse,
} from "./auth-edge-oauth";

describe("copySetCookieHeaders", () => {
  it("copies every Set-Cookie from a Headers instance", () => {
    const source = new Headers();
    source.append("Set-Cookie", "a=1; Path=/");
    source.append("Set-Cookie", "b=2; Path=/");
    const target = new Headers();
    copySetCookieHeaders(target, source);
    expect(target.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("copies Set-Cookie from a plain object (Better Auth returnHeaders)", () => {
    const target = new Headers();
    copySetCookieHeaders(target, {
      "set-cookie":
        "__Secure-better-auth.state=abc; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.nebutra.com",
    });
    expect(target.getSetCookie()[0]).toContain("__Secure-better-auth.state=abc");
  });
});

describe("socialStartToRedirect", () => {
  it("forwards state cookies from a plain headers object", () => {
    const res = socialStartToRedirect({
      url: "https://accounts.google.com/o/oauth2/v2/auth?state=xyz",
      headers: {
        "set-cookie":
          "__Secure-better-auth.state=xyz; Max-Age=300; Domain=.nebutra.com; Path=/; HttpOnly; Secure; SameSite=Lax",
      },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("accounts.google.com");
    expect(res.headers.getSetCookie()[0]).toContain("__Secure-better-auth.state=xyz");
  });

  it("throws when Better Auth omits the authorize URL", () => {
    expect(() => socialStartToRedirect({ redirect: true })).toThrow(/authorize URL/i);
  });
});

describe("asBrowserOAuthRedirect", () => {
  it("turns a 200 JSON social start into a 302 and keeps cookies", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      location: "https://accounts.google.com/o/oauth2/v2/auth?state=1",
    });
    headers.append("Set-Cookie", "__Secure-better-auth.state=1; Path=/; HttpOnly");
    const raw = new Response(
      JSON.stringify({ url: "https://accounts.google.com/x", redirect: true }),
      {
        status: 200,
        headers,
      },
    );
    const out = await asBrowserOAuthRedirect(raw);
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=1",
    );
    expect(out.headers.getSetCookie()[0]).toContain("__Secure-better-auth.state=1");
  });

  it("leaves a real 302 alone", async () => {
    const raw = new Response(null, {
      status: 302,
      headers: { location: "https://app.nebutra.com/workspace" },
    });
    const out = await asBrowserOAuthRedirect(raw);
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("https://app.nebutra.com/workspace");
  });
});

describe("isOAuthCallbackPath", () => {
  it("matches Better Auth callback routes", () => {
    expect(isOAuthCallbackPath("/api/auth/callback/google")).toBe(true);
    expect(isOAuthCallbackPath("/api/auth/callback/github/")).toBe(true);
    expect(isOAuthCallbackPath("/api/auth/oauth/google")).toBe(false);
    expect(isOAuthCallbackPath("/api/auth/get-session")).toBe(false);
  });
});

describe("shouldServeOAuthContinuePage", () => {
  const requestUrl = "https://auth.nebutra.com/api/auth/callback/google";

  it("hops when Better Auth 302s to the product app", () => {
    const res = new Response(null, {
      status: 302,
      headers: { location: "https://app.nebutra.com/workspace" },
    });
    expect(shouldServeOAuthContinuePage(res, requestUrl)).toBe("https://app.nebutra.com/workspace");
  });

  it("does not hop for same-host error redirects", () => {
    const res = new Response(null, {
      status: 302,
      headers: { location: "/sign-in?error=state_mismatch" },
    });
    expect(shouldServeOAuthContinuePage(res, requestUrl)).toBeNull();
  });

  it("rejects javascript and off-brand hosts", () => {
    expect(
      shouldServeOAuthContinuePage(
        new Response(null, {
          status: 302,
          headers: { location: "https://evil.example/phish" },
        }),
        requestUrl,
      ),
    ).toBeNull();
  });
});

describe("finalizeOAuthCallback", () => {
  it("serves a same-origin 200 that keeps the session cookie before leaving auth", () => {
    const headers = new Headers({ location: "https://app.nebutra.com/workspace" });
    headers.append(
      "Set-Cookie",
      "__Secure-better-auth.session_token=tok; Domain=.nebutra.com; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    const res = new Response(null, { status: 302, headers });
    const out = finalizeOAuthCallback(
      res,
      new Request("https://auth.nebutra.com/api/auth/callback/google?code=unused"),
    );
    expect(out.status).toBe(200);
    expect(out.headers.get("content-type")).toMatch(/text\/html/);
    expect(out.headers.get("location")).toBeNull();
    expect(out.headers.getSetCookie()[0]).toContain("__Secure-better-auth.session_token=tok");
  });

  it("passes through /sign-in error redirects", () => {
    const res = new Response(null, {
      status: 302,
      headers: { location: "/sign-in?error=account_not_linked" },
    });
    const out = finalizeOAuthCallback(
      res,
      new Request("https://auth.nebutra.com/api/auth/callback/google"),
    );
    expect(out.status).toBe(302);
    expect(out.headers.get("location")).toBe("/sign-in?error=account_not_linked");
  });
});

describe("summarizeAuthResponse", () => {
  it("never includes cookie values or OAuth codes", () => {
    const headers = new Headers({
      location: "https://app.nebutra.com/workspace?secret=1",
    });
    headers.append("Set-Cookie", "__Secure-better-auth.session_token=SUPERSECRET; Path=/");
    const summary = summarizeAuthResponse(
      new Response(null, { status: 302, headers }),
      "https://auth.nebutra.com/api/auth/callback/google?code=STEALME",
    );
    const encoded = JSON.stringify(summary);
    expect(encoded).not.toContain("SUPERSECRET");
    expect(encoded).not.toContain("STEALME");
    expect(summary.cookieNames).toEqual(["__Secure-better-auth.session_token"]);
    expect(summary.hasSessionCookie).toBe(true);
    expect(summary.location).toBe("https://app.nebutra.com/workspace");
  });
});
