import { describe, expect, it } from "vitest";
import { isAppRedirectablePath, shouldBounceSignedInVisitorToApp } from "./session-home-redirect";

const LOCALES = ["en", "zh-Hans", "ja"] as const;

describe("isAppRedirectablePath", () => {
  it("treats the apex and bare locale roots as product shortcuts", () => {
    expect(isAppRedirectablePath("/", LOCALES)).toBe(true);
    expect(isAppRedirectablePath("/zh-Hans", LOCALES)).toBe(true);
    expect(isAppRedirectablePath("/pricing", LOCALES)).toBe(false);
  });
});

describe("shouldBounceSignedInVisitorToApp", () => {
  const base = {
    pathname: "/",
    host: "nebutra.com",
    statusHost: "status.nebutra.com",
    authHost: "auth.nebutra.com",
    landingHost: "nebutra.com",
    hasSessionHint: true,
    stayParam: null as string | null,
    referer: null as string | null,
    locales: LOCALES,
  };

  it("bounces a hinted visitor from the marketing root into the app", () => {
    expect(shouldBounceSignedInVisitorToApp(base)).toBe(true);
  });

  it("stays on marketing when the login-center Home link asked to stay", () => {
    expect(shouldBounceSignedInVisitorToApp({ ...base, stayParam: "1" })).toBe(false);
  });

  it("stays on marketing when the click came from the auth host", () => {
    expect(
      shouldBounceSignedInVisitorToApp({
        ...base,
        referer: "https://auth.nebutra.com/sign-in",
      }),
    ).toBe(false);
  });

  it("stays on marketing when the logo is clicked from a marketing page", () => {
    expect(
      shouldBounceSignedInVisitorToApp({
        ...base,
        referer: "https://nebutra.com/blog/some-post",
      }),
    ).toBe(false);
  });

  it("stays on marketing when the referer is the www landing host", () => {
    expect(
      shouldBounceSignedInVisitorToApp({
        ...base,
        referer: "https://www.nebutra.com/zh-Hans/blog/some-post",
      }),
    ).toBe(false);
  });

  it("never bounces without a session hint or off a marketing subpage", () => {
    expect(shouldBounceSignedInVisitorToApp({ ...base, hasSessionHint: false })).toBe(false);
    expect(shouldBounceSignedInVisitorToApp({ ...base, pathname: "/blog" })).toBe(false);
  });
});
