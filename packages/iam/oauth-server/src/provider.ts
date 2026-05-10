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

import type { PrismaClient } from "@nebutra/db";
import type { Redis } from "ioredis";
import Provider, { type AccountClaims } from "oidc-provider";
import { createPrismaAdapter } from "./adapters/prisma-adapter.js";
import { NEBUTRA_CLAIMS, SUPPORTED_SCOPES } from "./claims.js";

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
   * Cookie signing keys (at least 2 for rotation).
   * First key is used for signing, others for verification of old cookies.
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
    cookieKeys = ["nebutra-oidc-cookie-key-1", "nebutra-oidc-cookie-key-2"],
    loginUrl = "/oauth/login",
    consentUrl = "/oauth/authorize",
    debug = false,
  } = config;

  const provider = new Provider(issuer, {
    // Storage adapters
    adapter: createPrismaAdapter(prisma, redis),

    // Signing keys
    ...(jwks ? { jwks } : {}),

    // Cookie configuration
    cookies: {
      keys: cookieKeys,
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
