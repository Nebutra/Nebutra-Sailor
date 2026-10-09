import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts reaches @nebutra/auth through the SSO validator; its build output is not needed here.
vi.mock("@nebutra/auth", () => ({ sanitizeReturnUrl: (u: string) => u }));

async function loadEnv() {
  vi.resetModules();
  return (await import("./env")).env;
}

describe("web env: public URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function baseline(nodeEnv: string) {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@db.example.com:5432/x");
    for (const k of [
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_STUDIO_URL",
      "SKIP_ENV_VALIDATION",
      "NEBUTRA_ALLOW_LOCALHOST_URLS",
    ]) {
      delete process.env[k];
    }
  }

  it("keeps the local defaults outside production", async () => {
    baseline("development");
    expect((await loadEnv()).NEXT_PUBLIC_STUDIO_URL).toBe("http://localhost:3003");
  });

  it("refuses a production build missing a public URL, naming it", async () => {
    baseline("production");
    const errors = vi.mocked(console.error);
    await expect(loadEnv()).rejects.toThrow(/Invalid environment variables/);
    const reported = JSON.stringify(errors.mock.calls);
    for (const name of ["SITE", "APP", "API", "STUDIO"]) {
      expect(reported).toContain(`NEXT_PUBLIC_${name}_URL is not set`);
    }
  });
});
