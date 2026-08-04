// @brand-exempt: health payload defaults for production hostnames
import { isAuthFeatureEnabledSync, isTurnstileConfigured } from "@nebutra/auth";
import { probeGoogleOAuthPairing } from "@/lib/google-oauth-probe";
import { detectEnabledOAuthProviders } from "@/lib/oauth-providers";

export const dynamic = "force-dynamic";

/**
 * Liveness + operator surface for the login center.
 * Includes feature flags and OAuth callback base so redirect-URI setup is checkable.
 *
 * Optional: `GET /health?probe=google` — safe client/secret pairing check against
 * Google's token endpoint (never returns secrets; only Google error codes).
 */
export async function GET(request: Request) {
  const origin = (
    process.env.NEXT_PUBLIC_AUTH_URL ||
    process.env.BETTER_AUTH_URL ||
    "https://auth.nebutra.com"
  ).replace(/\/$/, "");

  const oauthProviders = detectEnabledOAuthProviders();
  const url = new URL(request.url);
  const wantGoogleProbe = url.searchParams.get("probe") === "google";

  const googlePairing = wantGoogleProbe ? await probeGoogleOAuthPairing(origin) : undefined;

  return Response.json({
    service: "nebutra-auth-center",
    status: "ok",
    origin,
    role: "login-center",
    idp: process.env.OIDC_ISSUER || "https://sso.nebutra.com",
    features: {
      magicLink: isAuthFeatureEnabledSync("magicLink"),
      passkeys: isAuthFeatureEnabledSync("passkeys"),
      turnstile: isTurnstileConfigured() || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    },
    oauth: {
      providers: oauthProviders,
      /** Register these in Google/GitHub/Apple/Microsoft developer consoles. */
      callbackUrls: oauthProviders.map((p) => `${origin}/api/auth/callback/${p}`),
      /**
       * Presence flags only (never secrets). `invalid_code` after Google almost
       * always means secret/redirect mismatch when clientId is configured but
       * secret is missing or wrong on this host.
       */
      env: {
        googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
        googleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
        githubClientId: Boolean(process.env.GITHUB_CLIENT_ID?.trim()),
        githubClientSecret: Boolean(process.env.GITHUB_CLIENT_SECRET?.trim()),
        betterAuthUrl: Boolean(
          process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_AUTH_URL?.trim(),
        ),
        authCookieDomain: Boolean(process.env.AUTH_COOKIE_DOMAIN?.trim()),
      },
      ...(googlePairing ? { googlePairing } : {}),
    },
    passkey: {
      rpID: process.env.PASSKEY_RP_ID || new URL(origin).hostname,
      origin: process.env.PASSKEY_ORIGIN || origin,
    },
  });
}
