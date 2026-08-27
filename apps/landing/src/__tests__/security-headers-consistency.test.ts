import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Visibility G35 — single X-Frame-Options policy across next.config, vercel.json, proxy.
 * Visibility G38 — no legacy X-XSS-Protection (deprecated, can create XSS issues in old IE).
 */
const root = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("security header consistency (landing)", () => {
  it("X-Frame-Options is DENY in next.config, vercel.json, and proxy.ts", () => {
    const nextConfig = read("next.config.ts");
    const vercel = read("vercel.json");
    const proxy = read("src/proxy.ts");

    // next.config securityHeaders entry
    expect(nextConfig).toMatch(/key:\s*"X-Frame-Options"[\s\S]*?value:\s*"DENY"/);
    expect(nextConfig).not.toMatch(/X-Frame-Options"[\s\S]*?SAMEORIGIN/);

    // vercel.json
    expect(vercel).toMatch(/"X-Frame-Options"\s*,\s*\n\s*"value"\s*:\s*"DENY"/);
    expect(vercel).not.toContain("SAMEORIGIN");

    // proxy edge
    expect(proxy).toMatch(/X-Frame-Options["']?\s*,\s*["']DENY["']/);
  });

  it("does not set legacy X-XSS-Protection (G38)", () => {
    const vercel = read("vercel.json");
    const nextConfig = read("next.config.ts");
    const proxy = read("src/proxy.ts");

    expect(vercel).not.toContain("X-XSS-Protection");
    expect(nextConfig).not.toContain("X-XSS-Protection");
    expect(proxy).not.toContain("X-XSS-Protection");
  });

  it("CSP frame-ancestors is none (matches X-Frame DENY)", () => {
    const nextConfig = read("next.config.ts");
    expect(nextConfig).toMatch(/frame-ancestors["']?\s*,\s*\[["']'none'["']\]/);
  });
});
