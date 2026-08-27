import { describe, expect, it } from "vitest";
import { getSanitizedReturnUrl, sanitizeReturnUrl } from "../utils/return-url";

describe("sanitizeReturnUrl", () => {
  describe("accepts safe inputs", () => {
    it("accepts simple absolute path", () => {
      expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    });

    it("preserves query string and hash", () => {
      expect(sanitizeReturnUrl("/dashboard?org=acme&plan=pro#billing")).toBe(
        "/dashboard?org=acme&plan=pro#billing",
      );
    });

    it("normalizes path traversal", () => {
      // URL() collapses `..` segments inside the path.
      expect(sanitizeReturnUrl("/foo/../bar")).toBe("/bar");
    });

    it("accepts allow-listed absolute URL", () => {
      expect(
        sanitizeReturnUrl("https://app.nebutra.com/dashboard", {
          allowedHosts: ["app.nebutra.com"],
        }),
      ).toBe("https://app.nebutra.com/dashboard");
    });

    it("matches hostname case-insensitively", () => {
      expect(
        sanitizeReturnUrl("https://App.Nebutra.COM/x", {
          allowedHosts: ["app.nebutra.com"],
        }),
      ).toBe("https://app.nebutra.com/x");
    });
  });

  describe("rejects unsafe inputs (returns fallback)", () => {
    it("rejects undefined / null", () => {
      expect(sanitizeReturnUrl(undefined)).toBe("/");
      expect(sanitizeReturnUrl(null)).toBe("/");
    });

    it("rejects empty string", () => {
      expect(sanitizeReturnUrl("")).toBe("/");
      expect(sanitizeReturnUrl("   ")).toBe("/");
    });

    it("rejects protocol-relative URL", () => {
      expect(sanitizeReturnUrl("//evil.com/x")).toBe("/");
    });

    it("rejects backslash path (some browsers normalize to protocol-relative)", () => {
      expect(sanitizeReturnUrl("\\\\evil.com\\x")).toBe("/");
      expect(sanitizeReturnUrl("\\evil")).toBe("/");
    });

    it("rejects javascript: scheme", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing security boundary
      expect(sanitizeReturnUrl("javascript:alert(1)" as any)).toBe("/");
    });

    it("rejects data: scheme", () => {
      expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/");
    });

    it("rejects absolute URL with no allowlist", () => {
      expect(sanitizeReturnUrl("https://evil.com/x")).toBe("/");
    });

    it("rejects absolute URL not in allowlist", () => {
      expect(
        sanitizeReturnUrl("https://evil.com/x", {
          allowedHosts: ["app.nebutra.com"],
        }),
      ).toBe("/");
    });

    it("rejects non-http(s) scheme even when host matches allowlist", () => {
      expect(
        sanitizeReturnUrl("ftp://app.nebutra.com/x", {
          allowedHosts: ["app.nebutra.com"],
        }),
      ).toBe("/");
    });

    it("uses custom fallback", () => {
      expect(sanitizeReturnUrl("//evil.com", { fallback: "/home" })).toBe("/home");
    });

    it("rejects path without leading slash (relative)", () => {
      expect(sanitizeReturnUrl("dashboard")).toBe("/");
    });
  });
});

describe("getSanitizedReturnUrl", () => {
  it("reads returnUrl param from Request URL", () => {
    const req = new Request("https://app.nebutra.com/sign-in?returnUrl=/dashboard");
    expect(getSanitizedReturnUrl(req)).toBe("/dashboard");
  });

  it("falls back to returnTo, then redirect", () => {
    expect(getSanitizedReturnUrl("/sign-in?returnTo=/admin")).toBe("/admin");
    expect(getSanitizedReturnUrl("/sign-in?redirect=/billing")).toBe("/billing");
  });

  it("rejects unsafe values from query string", () => {
    expect(getSanitizedReturnUrl("/sign-in?returnUrl=//evil.com")).toBe("/");
  });

  it("returns fallback when no return param present", () => {
    expect(getSanitizedReturnUrl("/sign-in")).toBe("/");
  });
});
