import "server-only";

import { brand } from "@nebutra/brand";
import { getSystemDb } from "@nebutra/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins/generic-oauth";

/**
 * Control-plane authentication.
 *
 * Identity comes from the permanent OIDC issuer at sso.nebutra.com; the
 * authorisation decision does NOT — see requireStaff() in ./staff.
 *
 * THE COOKIE IS HOST-ONLY, AND THAT IS THE POINT.
 *
 * Production sets AUTH_COOKIE_DOMAIN=.nebutra.com so auth.nebutra.com can share
 * a session with app.nebutra.com. A cookie scoped to `.nebutra.com` is sent to
 * EVERY subdomain, including this one. If the control plane trusted that cookie,
 * any signed-up tenant user would be carrying a valid session into it.
 *
 * So this app deliberately does not read AUTH_COOKIE_DOMAIN and never sets a
 * domain on its own cookie. The inherited tenant cookie arrives on every request
 * and is ignored: it has a different name, and nothing here looks at it. The
 * only session this app accepts is one it issued itself, for its own host.
 */

const ISSUER = process.env.OIDC_ISSUER ?? "https://sso.nebutra.com";
const CLIENT_ID = process.env.ADMIN_OIDC_CLIENT_ID ?? "nebutra-admin";

/** The `providerId` under which Better Auth records the SSO account link. */
export const SSO_PROVIDER_ID = "nebutra-sso";

/**
 * A missing secret must not be survivable at runtime. Better Auth will happily
 * invent one per process, which under PM2 means every restart silently
 * invalidates every session — and with `instances > 1` would mean sessions that
 * work or not depending on which worker answered.
 *
 * Not during `next build`, though. Route modules are evaluated to collect page
 * data with NODE_ENV=production and none of the real secrets present — the
 * deploy workflow feeds a placeholder DATABASE_URL for exactly this reason. The
 * phase check is the same one apps/web/src/lib/nonce.ts uses.
 */
/**
 * Taken from the brand SSOT rather than a `NEXT_PUBLIC_*` variable. Such a
 * variable is inlined at build time, so a CI job that lacked it would bake in
 * the localhost fallback and every redirect_uri would then mismatch — at
 * runtime, on the deployed host, with nothing wrong in the logs.
 */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? `https://${brand.domains.admin}`
    : "http://localhost:3108";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const secret = process.env.ADMIN_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production" && !isBuildPhase) {
  throw new Error("[admin] ADMIN_AUTH_SECRET is required in production.");
}

/**
 * `nebutra-admin` is registered as a PUBLIC client — the Prisma adapter behind
 * the issuer refuses shared-secret auth methods (see
 * scripts/register-admin-oidc-client.ts for why). PKCE is enforced by
 * oidc-provider v9, so there is no secret to configure here. If the client is
 * ever upgraded to private_key_jwt, this is where the key would be wired.
 */
export const auth = betterAuth({
  baseURL: BASE_URL,
  secret,

  /**
   * NOT OPTIONAL, DESPITE THE TYPES SAYING SO.
   *
   * better-auth 1.6 does not throw when `database` is absent — it imports
   * @better-auth/memory-adapter and carries on (see dist/db/adapter-base.mjs).
   * That failure mode is worse than a crash: the control plane would boot, walk
   * a visitor all the way through the SSO round-trip, mint a session against an
   * id that exists only in this process's heap, and then deny them — because no
   * PlatformStaff row can ever match a per-process invented id. Every PM2
   * restart would also drop every session, silently.
   *
   * AUDIT(no-tenant): staff sessions are platform-scope, so the system client is
   * correct; getTenantDb() would scope these rows to a tenant that has none.
   */
  database: prismaAdapter(getSystemDb() as Parameters<typeof prismaAdapter>[0], {
    provider: "postgresql",
    usePlural: false,
  }),

  // The schema calls these AuthUser/AuthSession/AuthAccount/AuthVerification
  // (tables auth_users/…). Without this mapping the adapter queries `user`,
  // which is a different model with a different id space — see ./staff.
  user: { modelName: "AuthUser" },
  session: { modelName: "AuthSession" },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },

  advanced: {
    // No `domain` key: host-only, per the note above. Do not "helpfully" add
    // crossSubDomainCookies here — it would hand the control plane's session
    // to every other subdomain and hand every other subdomain's session to it.
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "nebutra-admin",
  },

  // Staff do not self-register, and there are no passwords to manage. The only
  // way in is the SSO flow below.
  emailAndPassword: { enabled: false },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: SSO_PROVIDER_ID,
          clientId: CLIENT_ID,
          // Public client: no secret. Better Auth requires the key to exist.
          clientSecret: "",
          discoveryUrl: `${ISSUER}/.well-known/openid-configuration`,
          scopes: ["openid", "profile", "email"],
          pkce: true,
        },
      ],
    }),
  ],
});

export type AdminSession = Awaited<ReturnType<typeof auth.api.getSession>>;
