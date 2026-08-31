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
    expect(csp).toContain("connect-src");
    expect(csp).toContain("'self'");
    expect(csp).toContain("https://accounts.google.com/gsi/");
    // Navbar session + sign-out talk to the app host. Without these origins
    // the browser drops the credentialed fetch and the header stays anonymous.
    expect(csp).toContain("https://app.nebutra.com");
    expect(csp).toContain("https://auth.nebutra.com");
    expect(csp).toContain("frame-src https://accounts.google.com/gsi/");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style");
    // Google / GitHub / Gravatar profile photos. Without these the navbar
    // avatar <img> is dropped by CSP and shows the broken-image glyph.
    expect(csp).toContain("https://*.googleusercontent.com");
    expect(csp).toContain("https://avatars.githubusercontent.com");
    expect(csp).toContain("https://*.gravatar.com");
  });
});
