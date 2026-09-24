import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("gateway env normalization", () => {
  it("accepts Upstash REST aliases for gateway validation", async () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("DATABASE_URL", "https://example.com/db");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-rest");
    vi.stubEnv("AUTH_PROVIDER", "better-auth");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");

    const { validateEnv } = await import("../config/env.js");
    const env = validateEnv();

    expect(env.UPSTASH_REDIS_URL).toBe("https://example.upstash.io");
    expect(env.UPSTASH_REDIS_TOKEN).toBe("token-rest");
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://example.upstash.io");
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("token-rest");
  });
});
