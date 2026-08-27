import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

async function getCspHeader(): Promise<string> {
  const headers = await nextConfig.headers?.();
  const globalHeaders = headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
  const csp = globalHeaders.find((header) => header.key === "Content-Security-Policy")?.value;

  if (!csp) {
    throw new Error("Content-Security-Policy header is missing");
  }

  return csp;
}

describe("landing Next.js security headers", () => {
  it("allows Google Identity Services under the production CSP", async () => {
    const csp = await getCspHeader();

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://accounts.google.com/gsi/client");
    expect(csp).toContain("connect-src 'self' https://accounts.google.com/gsi/");
    expect(csp).toContain("frame-src https://accounts.google.com/gsi/");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style");
  });
});
