import {
  getBrandEmail,
  getDocsUrl,
  localhostFallback,
  missingPublicUrlMessage,
} from "@nebutra/brand/metadata-helpers";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * A public URL whose localhost default exists for `pnpm dev` only. In a
 * production build it is required and its absence fails by name.
 */
function publicUrl(name: string, devDefault: string) {
  const schema = z.string({ error: missingPublicUrlMessage(name) }).url();
  const fallback = localhostFallback(devDefault);
  return fallback === undefined ? schema : schema.default(fallback);
}

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Resend — contact form email delivery
    RESEND_API_KEY: z.string().optional(),
    // Override recipient for contact form (defaults to brand contact mailbox)
    CONTACT_FORM_TO: z.string().email().default(getBrandEmail("contact")),
    // Direct docs app origin used for health checks and edge redirects.
    DOCS_ORIGIN_URL: z.string().url().default(getDocsUrl()),
    // Status page history + incident store (Upstash REST — optional, edge-friendly)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    // Shared secret for POST /api/status/incidents
    STATUS_ADMIN_TOKEN: z.string().min(16).optional(),
  },

  client: {
    // Content / CMS
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default(""),
    NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),

    // URLs
    NEXT_PUBLIC_APP_URL: publicUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3001"),
    NEXT_PUBLIC_API_URL: publicUrl("NEXT_PUBLIC_API_URL", "http://localhost:3002"),
    // Demo-site override: where "Sign in" / "Get started" lead when no product app is
    // deployed behind this site. Unset everywhere except an instance that says so.
    NEXT_PUBLIC_DEMO_CTA_URL: z.string().url().optional(),
    NEXT_PUBLIC_DOCS_URL: z.string().url().default(getDocsUrl()),
    NEXT_PUBLIC_AUTH_PROVIDER: z.enum(["better-auth", "dev"]).default("better-auth"),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
    NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP: z.enum(["true", "false"]).default("true"),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DEMO_CTA_URL: process.env.NEXT_PUBLIC_DEMO_CTA_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_ONE_TAP,
  },
});

export default env;
