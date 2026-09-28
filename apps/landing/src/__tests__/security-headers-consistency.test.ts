import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Visibility G35 — single X-Frame-Options policy across next.config and proxy.
 * Visibility G38 — no legacy X-XSS-Protection (deprecated, can create XSS issues in old IE).
 *
 * vercel.json used to be a third copy of the policy. The site ships as a Fly
 * Machine now, so next.config and the proxy are the only two places headers
 * can be set; a reintroduced third copy would be the drift this guards.
 */
const root = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("security header consistency (landing)", () => {
  it("X-Frame-Options is DENY in next.config and proxy.ts", () => {
    const nextConfig = read("next.config.ts");
    const proxy = read("src/proxy.ts");

    // next.config securityHeaders entry
    expect(nextConfig).toMatch(/key:\s*"X-Frame-Options"[\s\S]*?value:\s*"DENY"/);
    // SAMEORIGIN appears exactly once, on the rule for the one self-framed page.
    expect(nextConfig.match(/"SAMEORIGIN"/g) ?? []).toHaveLength(1);
    expect(nextConfig).toMatch(
      /SELF_FRAMED_SOURCES\.map[\s\S]*?"X-Frame-Options", value: "SAMEORIGIN"/,
    );

    // proxy edge — DENY, relaxed only for SELF_FRAMED_PAGE
    expect(proxy).toMatch(/X-Frame-Options["']?\s*,\s*["']DENY["']/);
    expect(proxy.match(/"SAMEORIGIN"/g) ?? []).toHaveLength(1);
    expect(proxy).toMatch(
      /if \(SELF_FRAMED_PAGE\.test\(pathname\)\) response\.headers\.set\("X-Frame-Options", "SAMEORIGIN"\)/,
    );
  });

  it("frames only Studio's catalog page, and only by its own origin", async () => {
    const { SELF_FRAMED_PAGE } = await import("../lib/security/framing");
    for (const path of [
      "/sailor/studio/frame",
      "/zh-Hans/sailor/studio/frame",
      "/en/sailor/studio/frame",
    ]) {
      expect(SELF_FRAMED_PAGE.test(path), path).toBe(true);
    }
    for (const path of [
      "/",
      "/sailor/studio",
      "/sailor/studio/frame/x",
      "/blog/sailor/studio/frame",
      "/evil/x/sailor/studio/frame",
    ]) {
      expect(SELF_FRAMED_PAGE.test(path), path).toBe(false);
    }
  });

  it("does not set legacy X-XSS-Protection (G38)", () => {
    const nextConfig = read("next.config.ts");
    const proxy = read("src/proxy.ts");

    expect(nextConfig).not.toContain("X-XSS-Protection");
    expect(proxy).not.toContain("X-XSS-Protection");
  });

  it("CSP frame-ancestors is none (matches X-Frame DENY), 'self' only for the framed page", () => {
    const nextConfig = read("next.config.ts");
    expect(nextConfig).toMatch(
      /"frame-ancestors", framing\.framedBySelf \? \["'self'"\] : \["'none'"\]/,
    );
  });
});
