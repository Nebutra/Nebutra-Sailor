import { describe, expect, it } from "vitest";
import { applySessionHint, inspectSessionCookie, SESSION_HINT_COOKIE } from "./session-hint";

function responseWithCookies(status: number, cookies: string[]): Response {
  const headers = new Headers();
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status, headers });
}

describe("inspectSessionCookie", () => {
  it("detects better-auth session_token set", () => {
    const res = responseWithCookies(302, [
      "__Secure-better-auth.session_token=abc; Path=/; HttpOnly; Secure",
    ]);
    expect(inspectSessionCookie(res)).toBe("set");
  });

  it("detects session clear", () => {
    const res = responseWithCookies(200, ["better-auth.session_token=; Path=/; Max-Age=0"]);
    expect(inspectSessionCookie(res)).toBe("cleared");
  });

  it("ignores state cookies (not a session)", () => {
    const res = responseWithCookies(200, [
      "__Secure-better-auth.state=xyz; Path=/; HttpOnly; Max-Age=300",
    ]);
    expect(inspectSessionCookie(res)).toBe("none");
  });
});

describe("applySessionHint", () => {
  it("does NOT set hint on OAuth start (2xx under sign-in/social, state only)", () => {
    const res = responseWithCookies(200, [
      "__Secure-better-auth.state=xyz; Path=/; HttpOnly; Max-Age=300",
    ]);
    const out = applySessionHint(res, "/api/auth/sign-in/social", 200);
    const cookies = out.headers.getSetCookie?.() ?? [];
    expect(cookies.some((c) => c.startsWith(`${SESSION_HINT_COOKIE}=1`))).toBe(false);
  });

  it("sets hint when a session cookie is established on callback redirect", () => {
    const res = responseWithCookies(302, [
      "__Secure-better-auth.session_token=tok; Path=/; HttpOnly; Secure",
    ]);
    const out = applySessionHint(res, "/api/auth/callback/google", 302);
    const cookies = out.headers.getSetCookie?.() ?? [];
    expect(cookies.some((c) => c.startsWith(`${SESSION_HINT_COOKIE}=1`))).toBe(true);
  });

  it("clears hint on sign-out", () => {
    const res = new Response(null, { status: 200 });
    const out = applySessionHint(res, "/api/auth/sign-out", 200);
    const cookies = out.headers.getSetCookie?.() ?? [];
    expect(
      cookies.some((c) => c.includes(`${SESSION_HINT_COOKIE}=`) && c.includes("Max-Age=0")),
    ).toBe(true);
  });
});
