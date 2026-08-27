import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Import after mocking server-only
const { resolveLogoUrl } = await import("../logo-url");

describe("resolveLogoUrl", () => {
  beforeEach(() => {
    vi.stubEnv("UPLOADS_PUBLIC_BASE_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves via proxy path when UPLOADS_PUBLIC_BASE_URL is not set", () => {
    vi.stubEnv("UPLOADS_PUBLIC_BASE_URL", "");
    expect(resolveLogoUrl("org-logos/org_1/logo.png")).toBe(
      "/api/uploads/org-logos%2Forg_1%2Flogo.png",
    );
  });

  it("resolves via CDN base URL when UPLOADS_PUBLIC_BASE_URL is set", () => {
    vi.stubEnv("UPLOADS_PUBLIC_BASE_URL", "https://cdn.example.com/");
    expect(resolveLogoUrl("org-logos/org_1/logo.png")).toBe(
      "https://cdn.example.com/org-logos/org_1/logo.png",
    );
  });

  it("strips trailing slashes from CDN base URL", () => {
    vi.stubEnv("UPLOADS_PUBLIC_BASE_URL", "https://cdn.example.com///");
    expect(resolveLogoUrl("org-logos/org_1/logo.png")).toBe(
      "https://cdn.example.com/org-logos/org_1/logo.png",
    );
  });
});
