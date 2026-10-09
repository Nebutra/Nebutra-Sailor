import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public URL variables default to localhost for `pnpm dev` only. A production
 * build that forgets one must fail by name, not ship http://localhost:3001 in
 * every Sign in link (the demo site did).
 */
async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

describe("landing env: public URLs", () => {
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errors = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    vi.stubEnv("NEBUTRA_ALLOW_LOCALHOST_URLS", "");
    // t3-env treats "" as set; unset for real.
    for (const k of [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_API_URL",
      "SKIP_ENV_VALIDATION",
      "NEBUTRA_ALLOW_LOCALHOST_URLS",
    ]) {
      delete process.env[k];
    }
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    errors.mockRestore();
  });

  it("keeps the zero-key local defaults outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const env = await loadEnv();
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3001");
    expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:3002");
  });

  it("refuses a production build without NEXT_PUBLIC_APP_URL, naming it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    await expect(loadEnv()).rejects.toThrow(/Invalid environment variables/);
    expect(JSON.stringify(errors.mock.calls)).toContain("NEXT_PUBLIC_APP_URL is not set");
  });

  it("refuses a production build without NEXT_PUBLIC_API_URL, naming it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    await expect(loadEnv()).rejects.toThrow(/Invalid environment variables/);
    expect(JSON.stringify(errors.mock.calls)).toContain("NEXT_PUBLIC_API_URL is not set");
  });

  it("builds for production when the URLs are given", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const env = await loadEnv();
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  it("allows localhost in production only on the explicit opt-in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEBUTRA_ALLOW_LOCALHOST_URLS", "1");
    const env = await loadEnv();
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3001");
  });
});
