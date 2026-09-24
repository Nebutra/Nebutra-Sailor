import { getBrandPublicUrls } from "@nebutra/brand/metadata-helpers";
import { z } from "zod";

// Better Auth is the only auth provider (ADR 2026-09-24 Sailor convergence).
const authConfigSchema = z.object({
  AUTH_PROVIDER: z.literal("better-auth").optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
});

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3002"),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Sentry (optional — disabled when absent)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // PostHog product analytics (optional — disabled when absent)
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Email / Resend
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Admin API (min 32 chars; generate with: openssl rand -hex 32)
  ADMIN_API_KEY: z.string().min(32).optional(),

  // Python service URLs (TS-by-default — see ADR 2026-05-10)
  AI_SERVICE_URL: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
  SERVICE_SECRET: z.string().optional(),
  GATEWAY_SHARED_SECRET: z.string().optional(),

  // Pebble support intake. The token secret falls back to SERVICE_SECRET when
  // unset so a deployment always signs with something unguessable; the bucket
  // falls back to a conventional name. See routes/pebble/.
  PEBBLE_DIAGNOSTICS_TOKEN_SECRET: z.string().min(32).optional(),
  PEBBLE_DIAGNOSTICS_BUCKET: z.string().optional(),

  // ClickHouse — used by event-ingest service module (in-process)
  CLICKHOUSE_URL: z.string().optional(),
  CLICKHOUSE_USERNAME: z.string().optional(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_DATABASE: z.string().optional(),

  // Frontend URLs
  LANDING_URL: z.string().optional(),
  WEB_URL: z.string().optional(),
  STUDIO_URL: z.string().optional(),
  // Additional allowed CORS origins (comma-separated)
  CORS_ORIGINS: z.string().optional(),

  // Domain overrides
  DOMAIN_LANDING: z.string().url().optional(),
  DOMAIN_APP: z.string().url().optional(),
  DOMAIN_API: z.string().url().optional(),
  DOMAIN_STUDIO: z.string().url().optional(),
});

const envSchema = z.intersection(baseSchema, authConfigSchema);

// Production domain constants — defaults dogfood brand.domains.
const brandUrls = getBrandPublicUrls();

export const DOMAINS = {
  landing: process.env.DOMAIN_LANDING ?? process.env.LANDING_URL ?? brandUrls.siteUrl,
  app: process.env.DOMAIN_APP ?? process.env.WEB_URL ?? brandUrls.appUrl,
  api: process.env.DOMAIN_API ?? brandUrls.apiUrl,
  studio: process.env.DOMAIN_STUDIO ?? process.env.STUDIO_URL ?? brandUrls.studioUrl,
  auth: process.env.DOMAIN_AUTH ?? process.env.NEXT_PUBLIC_AUTH_URL ?? brandUrls.authUrl,
  sso: process.env.DOMAIN_SSO ?? process.env.OIDC_ISSUER ?? brandUrls.ssoUrl,
  docs: process.env.DOMAIN_DOCS ?? process.env.NEXT_PUBLIC_DOCS_URL ?? brandUrls.docsUrl,
  router: process.env.DOMAIN_ROUTER ?? process.env.NEXT_PUBLIC_ROUTER_URL ?? brandUrls.routerUrl,
  forge: process.env.DOMAIN_FORGE ?? process.env.NEXT_PUBLIC_FORGE_URL ?? brandUrls.forgeUrl,
} as const;

export type Env = z.infer<typeof envSchema>;

function withRedisAliases(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const normalized = { ...source };

  normalized.UPSTASH_REDIS_URL ??= source.UPSTASH_REDIS_REST_URL;
  normalized.UPSTASH_REDIS_TOKEN ??= source.UPSTASH_REDIS_REST_TOKEN;
  normalized.UPSTASH_REDIS_REST_URL ??= source.UPSTASH_REDIS_URL;
  normalized.UPSTASH_REDIS_REST_TOKEN ??= source.UPSTASH_REDIS_TOKEN;

  return normalized;
}

export function getAuthProvider(): "better-auth" {
  return "better-auth";
}

export function validateEnv(): Env {
  const normalizedEnv = withRedisAliases(process.env);

  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return envSchema.parse({
      ...normalizedEnv,
      NODE_ENV: normalizedEnv.NODE_ENV ?? "development",
      PORT: normalizedEnv.PORT ?? "3002",
      DATABASE_URL: normalizedEnv.DATABASE_URL ?? "postgresql://localhost/dev",
      BETTER_AUTH_SECRET: normalizedEnv.BETTER_AUTH_SECRET ?? "dev_better_auth_secret_placeholder",
    });
  }

  const result = envSchema.safeParse(normalizedEnv);

  if (!result.success) {
    process.stderr.write("❌ Invalid environment variables:\n");
    process.stderr.write(JSON.stringify(result.error.format(), null, 2) + "\n");
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

/**
 * Validated lazily, on first property access.
 *
 * Validating at module scope runs during the Worker's startup validation,
 * before any handler — and before secrets are bound to the isolate — so the
 * gateway failed to deploy with "Invalid environment variables" no matter
 * which secrets were actually set. A Proxy keeps every `env.FOO` call site
 * unchanged while moving the check to the first read, which happens inside a
 * request. On Node nothing observable changes: the first access is still long
 * before any traffic is served.
 */
type ValidatedEnv = ReturnType<typeof validateEnv>;

let validated: ValidatedEnv | null = null;

function resolveEnv(): ValidatedEnv {
  if (validated === null) validated = validateEnv();
  return validated;
}

export const env = new Proxy({} as ValidatedEnv, {
  get: (_target, prop) => resolveEnv()[prop as keyof ValidatedEnv],
  has: (_target, prop) => prop in resolveEnv(),
  ownKeys: () => Reflect.ownKeys(resolveEnv()),
  getOwnPropertyDescriptor: (_target, prop) => Object.getOwnPropertyDescriptor(resolveEnv(), prop),
});
