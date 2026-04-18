/**
 * Nebutra OIDC Provider Singleton
 *
 * Lazily creates and caches the oidc-provider instance.
 * This ensures only one Provider exists per Node.js process,
 * which is critical for oidc-provider's internal state management.
 */

import { getSystemDb } from "@nebutra/db";
import { createNebutraOIDCProvider } from "@nebutra/oauth-server";
import Redis from "ioredis";

let _provider: ReturnType<typeof createNebutraOIDCProvider> | null = null;
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return _redis;
}

export function getOIDCProvider() {
  if (!_provider) {
    const issuer = process.env.OIDC_ISSUER || "http://localhost:3100";
    const cookieKeys = (process.env.OIDC_COOKIE_KEYS || "dev-key-1,dev-key-2").split(",");

    _provider = createNebutraOIDCProvider({
      issuer,
      // AUDIT(no-tenant): OIDC authorization-server tables (OAuthClient,
      // OAuthSession, etc.) are global, not scoped to an Organization.
      prisma: getSystemDb(),
      redis: getRedis(),
      cookieKeys,
      loginUrl: "/oauth/login",
      consentUrl: "/oauth/authorize",
      debug: process.env.NODE_ENV === "development",
    });
  }
  return _provider;
}
