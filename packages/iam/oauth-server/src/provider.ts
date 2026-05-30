/**
 * @nebutra/oauth-server — OIDC Provider Factory
 *
 * Creates a fully configured oidc-provider instance backed by
 * Prisma (clients) + Redis (ephemeral tokens/sessions).
 *
 * Usage:
 *   import { createNebutraOIDCProvider } from "@nebutra/oauth-server";
 *   const provider = createNebutraOIDCProvider({ prisma, redis, issuer, ... });
 *   app.use("/oidc", provider.callback());
 */

import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@nebutra/db";
import type { Redis } from "ioredis";
import Provider, { type AccountClaims } from "oidc-provider";
import { createPrismaAdapter } from "./adapters/prisma-adapter";
import { NEBUTRA_CLAIMS, SUPPORTED_SCOPES } from "./claims";

/**
 * Known-weak cookie signing keys that must NEVER reach production.
 *
 * These were either historic hardcoded package defaults or the IdP app's
 * dev-only `OIDC_COOKIE_KEYS` fallback. If any of them show up at runtime it
 * means a deployment forgot to provision real secrets — Keygrip-signed
 * session/interaction cookies would then be forgeable by anyone who has read
 * the source. We refuse to boot the provider in that state.
 */
const KNOWN_WEAK_COOKIE_KEYS = new Set<string>([
  "nebutra-oidc-cookie-key-1",
  "nebutra-oidc-cookie-key-2",
  "dev-key-1",
  "dev-key-2",
]);

/**
 * Validates the cookie signing keys, refusing weak/missing values in
 * production. The returned array always contains at least two strong keys
 * (the first signs, the rest verify rotated cookies).
 *
 * @throws Error in production when keys are missing, empty, or known-weak.
 */
function resolveCookieKeys(cookieKeys: string[] | undefined): string[] {
  const isProduction = process.env.NODE_ENV === "production";

  const provided = (cookieKeys ?? []).map((k) => k.trim()).filter((k) => k.length > 0);

  const hasWeakKey = provided.some((k) => KNOWN_WEAK_COOKIE_KEYS.has(k));
  const missing = provided.length === 0;

  if (isProduction && (missing || hasWeakKey)) {
    const reason = missing
      ? "no cookie signing keys were provided"
      : "known-weak/default cookie signing keys were provided";
    throw new Error(
      `[@nebutra/oauth-server] Refusing to start the OIDC provider: ${reason}. ` +
        "Set strong, secret cookie signing keys via the `cookieKeys` option " +
        "(e.g. from the OIDC_COOKIE_KEYS env var, two or more high-entropy values). " +
        "These keys sign session/interaction cookies — weak values let attackers forge them.",
    );
  }

  if (missing || hasWeakKey) {
    // Non-production: warn loudly and substitute ephemeral, clearly-labelled
    // random keys so local/test runs keep working without shipping weak
    // secrets. These rotate on every process start (sessions won't persist
    // across restarts in dev — acceptable, and a signal to set real keys).
    console.warn(
      "[@nebutra/oauth-server] No strong cookie signing keys provided; " +
        "using ephemeral dev-only random keys. Set `cookieKeys` (OIDC_COOKIE_KEYS) " +
        "for stable sessions and before deploying to production.",
    );
    return [
      `dev-only-ephemeral-${randomBytes(24).toString("hex")}`,
      `dev-only-ephemeral-${randomBytes(24).toString("hex")}`,
    ];
  }

  return provided;
}

export interface NebutraOIDCConfig {
  /** The issuer URL (e.g., "https://id.nebutra.com") */
  issuer: string;

  /** Prisma client instance */
  prisma: PrismaClient;

  /** Redis client instance */
  redis: Redis;

  /** JWKS (JSON Web Key Set) for signing tokens */
  jwks?: { keys: Array<Record<string, unknown>> };

  /**
   * Cookie signing keys (at least 2 high-entropy secrets for rotation).
   * First key is used for signing, others for verification of old cookies.
   *
   * REQUIRED in production: if missing, empty, or set to a known-weak/default
   * value, the provider throws at startup (NODE_ENV === "production").
   * In non-production, missing/weak keys trigger a warning and ephemeral
   * random keys are substituted (sessions won't persist across restarts).
   */
  cookieKeys?: string[];

  /**
   * URL that oidc-provider redirects to for user login.
   * Defaults to "/oauth/login"
   */
  loginUrl?: string;

  /**
   * URL that oidc-provider redirects to for user consent.
   * Defaults to "/oauth/authorize"
   */
  consentUrl?: string;

  /** Enable debug mode (verbose logging) */
  debug?: boolean;
}

/**
 * Creates a fully configured OIDC Provider instance.
 *
 * This is the heart of Nebutra's Identity Provider.
 * It handles all the complex OAuth 2.0 / OIDC protocol mechanics:
 * - Authorization code flow with PKCE
 * - Client credentials flow
 * - Token refresh
 * - Token introspection & revocation
 * - JWKS key serving
 * - OpenID Connect Discovery (.well-known/openid-configuration)
 */
export function createNebutraOIDCProvider(config: NebutraOIDCConfig): Provider {
  const {
    issuer,
    prisma,
    redis,
    jwks,
    cookieKeys,
    loginUrl = "/oauth/login",
    consentUrl = "/oauth/authorize",
    debug = false,
  } = config;

  // Validate cookie signing keys: throw in production on missing/weak values,
  // warn + substitute ephemeral random keys in dev. No hardcoded weak default.
  const resolvedCookieKeys = resolveCookieKeys(cookieKeys);

  const provider = new Provider(issuer, {
    // Storage adapters
    adapter: createPrismaAdapter(prisma, redis),

    // Signing keys
    ...(jwks ? { jwks } : {}),

    // Cookie configuration
    cookies: {
      keys: resolvedCookieKeys,
      long: { signed: true, httpOnly: true, sameSite: "lax" as const },
      short: { signed: true, httpOnly: true, sameSite: "lax" as const },
    },

    // Supported claims per scope
    claims: NEBUTRA_CLAIMS,

    // Supported features
    features: {
      // Client Credentials (machine-to-machine)
      clientCredentials: { enabled: true },

      // Token introspection (for resource servers)
      introspection: { enabled: true },

      // Token revocation
      revocation: { enabled: true },

      // Refresh token rotation (security best practice)
      // Refresh tokens are single-use; new one issued on each use
      resourceIndicators: { enabled: false },

      // Device Authorization Grant (for CLI tools — Phase 2)
      devInteractions: { enabled: debug },
    },

    // PKCE is enforced by default in oidc-provider v9 for public clients

    // Token TTL configuration
    ttl: {
      AccessToken: 3600, // 1 hour
      AuthorizationCode: 600, // 10 minutes
      ClientCredentials: 600, // 10 minutes
      IdToken: 3600, // 1 hour
      RefreshToken: 30 * 24 * 3600, // 30 days
      Interaction: 3600, // 1 hour
      Session: 14 * 24 * 3600, // 14 days
      Grant: 14 * 24 * 3600, // 14 days
    },

    // Scopes
    scopes: SUPPORTED_SCOPES,

    // Subject (user ID) type
    subjectTypes: ["public"],

    // Interaction policy — redirect to our custom Next.js pages
    interactions: {
      url(_ctx, interaction) {
        switch (interaction.prompt.name) {
          case "login":
            return `${loginUrl}?uid=${interaction.uid}`;
          case "consent":
            return `${consentUrl}?uid=${interaction.uid}`;
          default:
            return `${loginUrl}?uid=${interaction.uid}`;
        }
      },
    },

    // Custom claims resolver — maps Nebutra user data to OIDC claims
    async findAccount(_ctx, id) {
      // This will be called by oidc-provider when it needs to look up a user
      // The actual user lookup is done via Prisma
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          organizations: {
            include: { organization: true },
            take: 1, // Primary organization
          },
        },
      });

      if (!user) return undefined;

      const primaryMembership = user.organizations[0];

      return {
        accountId: id,
        async claims(_use: string, scope: string): Promise<AccountClaims> {
          const claims: AccountClaims = {
            sub: user.id,
          };

          if (scope?.includes("profile")) {
            claims.name = user.name;
            claims.picture = user.avatarUrl;
            claims.updated_at = Math.floor(user.updatedAt.getTime() / 1000);
          }

          if (scope?.includes("email")) {
            claims.email = user.email;
            claims.email_verified = true; // Users are verified at sign-up
          }

          if (
            primaryMembership &&
            (scope?.includes("organization:read") || scope?.includes("organization:write"))
          ) {
            claims["nebutra:organization_id"] = primaryMembership.organization.id;
            claims["nebutra:organization_name"] = primaryMembership.organization.name;
            claims["nebutra:organization_slug"] = primaryMembership.organization.slug;
            claims["nebutra:role"] = primaryMembership.role;
            claims["nebutra:plan"] = primaryMembership.organization.plan;
          }

          if (primaryMembership && scope?.includes("billing:read")) {
            claims["nebutra:organization_id"] = primaryMembership.organization.id;
            claims["nebutra:plan"] = primaryMembership.organization.plan;
          }

          return claims;
        },
      };
    },

    // Render error responses as JSON (UI handles display)
    renderError: async (ctx, out, _error) => {
      ctx.type = "application/json";
      ctx.body = {
        error: out.error,
        error_description: out.error_description,
      };
    },
  });

  return provider;
}
