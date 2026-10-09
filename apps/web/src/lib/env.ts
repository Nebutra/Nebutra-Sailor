import { localhostFallback, missingPublicUrlMessage } from "@nebutra/brand/metadata-helpers";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { isValidSsoProviderConfig } from "./auth/sso-discovery";

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

    // Auth provider selection (client side definition handles both)

    // Database — used by server components and server actions calling Prisma
    DATABASE_URL: z.string().url(),

    // Stripe — required for billing webhooks and checkout sessions
    STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

    // Sentry — server-side DSN + sourcemap upload (all optional)
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),

    // Logger Sentry transport — opt-in to avoid double-capturing errors
    LOGGER_SENTRY_ENABLED: z.enum(["true", "false"]).optional().default("false"),

    // PostHog — server-side product event capture (optional)
    POSTHOG_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().url().optional(),

    // Cross-subdomain session-hint cookie + landing-origin CORS allowlist.
    // Both are unset in dev/preview so cookies stay host-scoped (no traversal
    // between localhost:3000 ↔ localhost:3001) and CORS rejects cross-origin
    // probes by default. Production: set NEBUTRA_LANDING_ORIGIN to the
    // configured landing URL and NEBUTRA_SESSION_HINT_DOMAIN to the shared
    // parent domain.
    NEBUTRA_LANDING_ORIGIN: z.string().url().optional(),
    NEBUTRA_SESSION_HINT_DOMAIN: z.string().optional(),

    // Enterprise SSO discovery mapping. Validates the provider JSON at startup
    // so deploys fail before users hit a dead SSO handoff.
    AUTH_SSO_DISCOVERY_PROVIDERS: z
      .string()
      .optional()
      .refine(isValidSsoProviderConfig, "Invalid AUTH_SSO_DISCOVERY_PROVIDERS JSON."),

    // Feishu/Lark OAuth SSO via Better Auth generic OAuth. Required only when
    // a discovery provider uses `provider: "feishu"` or the Feishu button is
    // enabled.
    FEISHU_APP_ID: z.string().min(1).optional(),
    FEISHU_APP_SECRET: z.string().min(1).optional(),
    FEISHU_OAUTH_SCOPES: z.string().optional(),
    FEISHU_ALLOWED_TENANT_KEYS: z.string().optional(),
    FEISHU_OAUTH_BASE_URL: z.string().url().optional(),
    FEISHU_AUTHORIZATION_URL: z.string().url().optional(),
    FEISHU_TOKEN_URL: z.string().url().optional(),
    FEISHU_USER_INFO_URL: z.string().url().optional(),
    FEISHU_REDIRECT_URI: z.string().url().optional(),

    // Sanity write token for first-party blog comments. Missing token keeps
    // public reads working but returns 503 for comment creation.
    SANITY_API_TOKEN: z.string().optional(),
  },

  client: {
    // Public URLs
    NEXT_PUBLIC_SITE_URL: publicUrl("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
    NEXT_PUBLIC_APP_URL: publicUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3001"),
    NEXT_PUBLIC_API_URL: publicUrl("NEXT_PUBLIC_API_URL", "http://localhost:3002"),
    NEXT_PUBLIC_STUDIO_URL: publicUrl("NEXT_PUBLIC_STUDIO_URL", "http://localhost:3003"),

    // Auth provider selection
    NEXT_PUBLIC_AUTH_PROVIDER: z.enum(["better-auth", "dev"]).default("better-auth"),

    // Sanity CMS
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().default(""),
    NEXT_PUBLIC_SANITY_DATASET: z.string().default("production"),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string().default("2024-01-01"),

    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

    // Sentry
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

    // PostHog analytics — both optional, host falls back to US cloud
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STUDIO_URL: process.env.NEXT_PUBLIC_STUDIO_URL,
    NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});

export default env;
