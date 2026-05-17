import { describe, expect, it } from "vitest";
import { z } from "zod";

// Test the Zod schema in isolation (without importing env.ts which validates process.env at load time)
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002"),
  NEXT_PUBLIC_STUDIO_URL: z.string().url().default("http://localhost:3003"),
  NEXT_PUBLIC_AUTH_PROVIDER: z
    .enum(["clerk", "better-auth", "nextauth", "supabase", "dev"])
    .default("better-auth"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default("wyfqr24v"),
  NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

describe("web env schema", () => {
  it("accepts empty object and applies all defaults", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.NODE_ENV).toBe("development");
    expect(result.data.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
    expect(result.data.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3001");
    expect(result.data.NEXT_PUBLIC_API_URL).toBe("http://localhost:3002");
    expect(result.data.NEXT_PUBLIC_AUTH_PROVIDER).toBe("better-auth");
  });

  it("accepts production NODE_ENV", () => {
    const result = envSchema.safeParse({ NODE_ENV: "production" });
    expect(result.success).toBe(true);
    expect(result.data?.NODE_ENV).toBe("production");
  });

  it("rejects invalid NODE_ENV", () => {
    const result = envSchema.safeParse({ NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL value for site URL", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_SITE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid clerk key when provided", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
    });
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe("pk_test_abc123");
  });

  it("accepts every supported auth provider id", () => {
    for (const provider of ["clerk", "better-auth", "nextauth", "supabase", "dev"]) {
      const result = envSchema.safeParse({ NEXT_PUBLIC_AUTH_PROVIDER: provider });
      expect(result.success).toBe(true);
      expect(result.data?.NEXT_PUBLIC_AUTH_PROVIDER).toBe(provider);
    }
  });

  it("rejects unknown auth provider ids", () => {
    const result = envSchema.safeParse({ NEXT_PUBLIC_AUTH_PROVIDER: "auth0" });
    expect(result.success).toBe(false);
  });

  it("allows missing optional keys (clerk, stripe, sentry)", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(result.data?.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(result.data?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeUndefined();
    expect(result.data?.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it("uses correct default Sanity config", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_SANITY_PROJECT_ID).toBe("wyfqr24v");
    expect(result.data?.NEXT_PUBLIC_SANITY_DATASET).toBe("production");
  });

  it("overrides defaults with explicit values", () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    });
    expect(result.success).toBe(true);
    expect(result.data?.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
  });
});
