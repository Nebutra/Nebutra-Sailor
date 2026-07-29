import "server-only";

import { betterAuth } from "better-auth";
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

/**
 * `nebutra-admin` is registered as a PUBLIC client — the Prisma adapter behind
 * the issuer refuses shared-secret auth methods (see
 * scripts/register-admin-oidc-client.ts for why). PKCE is enforced by
 * oidc-provider v9, so there is no secret to configure here. If the client is
 * ever upgraded to private_key_jwt, this is where the key would be wired.
 */
export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3108",
  secret: process.env.ADMIN_AUTH_SECRET,

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
          providerId: "nebutra-sso",
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
