import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Resend — contact form email delivery
    RESEND_API_KEY: z.string().optional(),
    // Override recipient for contact form (defaults to contact@nebutra.com)
    CONTACT_FORM_TO: z.string().email().default("contact@nebutra.com"),
    // Direct docs app origin used for health checks and edge redirects.
    DOCS_ORIGIN_URL: z.string().url().default("https://docs.nebutra.com"),
  },

  client: {
    // Content / CMS
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default("wyfqr24v"),
    NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),

    // URLs
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3002"),
    NEXT_PUBLIC_DOCS_URL: z.string().url().default("https://docs.nebutra.com"),
    NEXT_PUBLIC_AUTH_PROVIDER: z
      .enum(["clerk", "better-auth", "nextauth", "supabase", "dev"])
      .default("better-auth"),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP: z.enum(["true", "false"]).default("true"),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP,
  },
});

export default env;
