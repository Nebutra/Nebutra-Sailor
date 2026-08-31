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
    aliasHosts: ["status.nebutra.com", "open.nebutra.com"],
    hasSessionHint: true,
    hasHomeFlag: false,
    locales: LOCALES,
  };

  it("bounces a hinted visitor from the marketing root into the app", () => {
    expect(shouldBounceSignedInVisitorToApp(base)).toBe(true);
  });

  it("keeps marketing only when ?home is present", () => {
    expect(shouldBounceSignedInVisitorToApp({ ...base, hasHomeFlag: true })).toBe(false);
  });

  it("never bounces without a session hint or off a marketing subpage", () => {
    expect(shouldBounceSignedInVisitorToApp({ ...base, hasSessionHint: false })).toBe(false);
    expect(shouldBounceSignedInVisitorToApp({ ...base, pathname: "/blog" })).toBe(false);
  });

  it("never bounces landing host aliases used as product surfaces", () => {
    expect(shouldBounceSignedInVisitorToApp({ ...base, host: "status.nebutra.com" })).toBe(false);
    expect(shouldBounceSignedInVisitorToApp({ ...base, host: "open.nebutra.com" })).toBe(false);
  });
});
