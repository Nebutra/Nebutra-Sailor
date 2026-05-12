import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applySessionHint,
  buildSessionHintCookie,
  isSignInSuccessPath,
  isSignOutSuccessPath,
  SESSION_HINT_COOKIE,
} from "../session-hint";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("buildSessionHintCookie", () => {
  beforeEach(() => {
    delete process.env.NEBUTRA_SESSION_HINT_DOMAIN;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("emits the canonical name + Path + Max-Age + SameSite by default", () => {
    const out = buildSessionHintCookie("1", 60);
    expect(out).toContain(`${SESSION_HINT_COOKIE}=1`);
    expect(out).toContain("Path=/");
    expect(out).toContain("Max-Age=60");
    expect(out).toContain("SameSite=Lax");
  });

  it("adds Domain= when NEBUTRA_SESSION_HINT_DOMAIN is set", () => {
    process.env.NEBUTRA_SESSION_HINT_DOMAIN = ".nebutra.com";
    expect(buildSessionHintCookie("1", 30)).toContain("Domain=.nebutra.com");
  });

  it("omits Domain= in dev/preview when the env var is undefined", () => {
    delete process.env.NEBUTRA_SESSION_HINT_DOMAIN;
    expect(buildSessionHintCookie("1", 30)).not.toContain("Domain=");
  });

  it("adds Secure only in production", () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    expect(buildSessionHintCookie("1", 30)).toContain("Secure");
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(buildSessionHintCookie("1", 30)).not.toContain("Secure");
  });

  it("clearing emits Max-Age=0 with empty value (legal cookie-deletion form)", () => {
    const out = buildSessionHintCookie("", 0);
    expect(out).toContain(`${SESSION_HINT_COOKIE}=`);
    expect(out).toContain("Max-Age=0");
  });
});

describe("isSignInSuccessPath", () => {
  it("matches BA sign-in / sign-up / callback paths on 2xx", () => {
    expect(isSignInSuccessPath("/api/auth/sign-in", 200)).toBe(true);
    expect(isSignInSuccessPath("/api/auth/sign-in/email", 200)).toBe(true);
    expect(isSignInSuccessPath("/api/auth/sign-up", 200)).toBe(true);
    expect(isSignInSuccessPath("/api/auth/callback/github", 200)).toBe(true);
  });

  it("returns false on non-2xx", () => {
    expect(isSignInSuccessPath("/api/auth/sign-in", 401)).toBe(false);
    expect(isSignInSuccessPath("/api/auth/sign-in", 500)).toBe(false);
  });

  it("does not match unrelated paths", () => {
    expect(isSignInSuccessPath("/api/auth/list-sessions", 200)).toBe(false);
    expect(isSignInSuccessPath("/api/auth/two-factor-status", 200)).toBe(false);
  });
});

describe("isSignOutSuccessPath", () => {
  it("matches sign-out on 2xx", () => {
    expect(isSignOutSuccessPath("/api/auth/sign-out", 200)).toBe(true);
    expect(isSignOutSuccessPath("/api/auth/sign-out/all", 200)).toBe(true);
  });

  it("rejects non-2xx", () => {
    expect(isSignOutSuccessPath("/api/auth/sign-out", 401)).toBe(false);
  });
});

describe("applySessionHint", () => {
  beforeEach(() => {
    delete process.env.NEBUTRA_SESSION_HINT_DOMAIN;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  });

  it("sets the hint cookie on a successful sign-in response", () => {
    const req = new Request("https://app.nebutra.com/api/auth/sign-in/email", { method: "POST" });
    const resp = new Response(null, { status: 200 });
    applySessionHint(req, resp);
    const cookie = resp.headers.get("set-cookie");
    expect(cookie).not.toBeNull();
    expect(cookie).toContain(`${SESSION_HINT_COOKIE}=1`);
  });

  it("clears the hint cookie on a successful sign-out response", () => {
    const req = new Request("https://app.nebutra.com/api/auth/sign-out", { method: "POST" });
    const resp = new Response(null, { status: 200 });
    applySessionHint(req, resp);
    const cookie = resp.headers.get("set-cookie");
    expect(cookie).not.toBeNull();
    expect(cookie).toContain(`${SESSION_HINT_COOKIE}=;`);
    expect(cookie).toContain("Max-Age=0");
  });

  it("does nothing for unrelated paths", () => {
    const req = new Request("https://app.nebutra.com/api/auth/list-sessions");
    const resp = new Response(null, { status: 200 });
    applySessionHint(req, resp);
    expect(resp.headers.get("set-cookie")).toBeNull();
  });

  it("does nothing when the auth response failed", () => {
    const req = new Request("https://app.nebutra.com/api/auth/sign-in/email", { method: "POST" });
    const resp = new Response(null, { status: 401 });
    applySessionHint(req, resp);
    expect(resp.headers.get("set-cookie")).toBeNull();
  });

  it("preserves any pre-existing Set-Cookie (e.g. BA's session cookie) — appends, does not replace", () => {
    const req = new Request("https://app.nebutra.com/api/auth/sign-in/email", { method: "POST" });
    const resp = new Response(null, { status: 200 });
    resp.headers.append("Set-Cookie", "better-auth.session_token=abc; HttpOnly; Path=/");
    applySessionHint(req, resp);
    const all = resp.headers.getSetCookie();
    expect(all).toHaveLength(2);
    expect(all[0]).toContain("better-auth.session_token=abc");
    expect(all[1]).toContain(`${SESSION_HINT_COOKIE}=1`);
  });
});
