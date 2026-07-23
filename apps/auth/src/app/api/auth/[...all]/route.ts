// @brand-exempt: documents canonical auth.nebutra.com host for operators
/**
 * Auth-center catch-all — Better Auth / NextAuth surface for all first-party apps.
 * Canonical host: auth.nebutra.com (BETTER_AUTH_URL).
 *
 * Also handles GET /api/auth/oauth/:provider?callbackURL=… (same contract as apps/web).
 */

import type { AuthProvider, AuthProviderId } from "@nebutra/auth";
import { getConfiguredAuthProvider, sanitizeReturnUrl } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { isOAuthProvider, type OAuthProvider } from "@/lib/oauth-providers";
import { applySessionHint } from "@/lib/session-hint";

const PROVIDERS_USING_THIS_ROUTE: ReadonlySet<AuthProviderId> = new Set([
  "better-auth",
  "nextauth",
]);

const provider = getConfiguredAuthProvider();
let authInstance: AuthProvider | null = null;

async function getAuth(): Promise<AuthProvider> {
  if (!authInstance) {
    authInstance = await createAuth({ provider });
  }
  return authInstance;
}

type OAuthStartRequest = {
  provider: OAuthProvider | null;
  invalidProvider?: string;
  callbackURL: string;
};

function readOAuthStartRequest(request: Request): OAuthStartRequest | null {
  const url = new URL(request.url);
  const match = url.pathname.match(/\/api\/auth\/oauth\/([^/]+)\/?$/);
  if (!match) return null;

  const rawProvider = decodeURIComponent(match[1] ?? "");
  const rawCallback =
    url.searchParams.get("callbackURL") ??
    url.searchParams.get("callback") ??
    url.searchParams.get("returnUrl") ??
    url.searchParams.get("returnTo") ??
    url.searchParams.get("redirect");

  const appOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://app.nebutra.com"
  ).replace(/\/$/, "");
  const fallback = `${appOrigin}/dashboard`;

  let callbackURL = fallback;
  if (rawCallback?.trim()) {
    const trimmed = rawCallback.trim();
    if (trimmed.startsWith("/")) {
      callbackURL = `${appOrigin}${sanitizeReturnUrl(trimmed, { fallback: "/dashboard" })}`;
    } else {
      callbackURL = sanitizeReturnUrl(trimmed, { fallback });
    }
  }

  return {
    provider: isOAuthProvider(rawProvider) ? rawProvider : null,
    ...(isOAuthProvider(rawProvider) ? {} : { invalidProvider: rawProvider }),
    callbackURL,
  };
}

async function handleOAuthStartRequest(request: Request): Promise<Response | null> {
  const oauthStart = readOAuthStartRequest(request);
  if (!oauthStart) return null;

  if (request.method.toUpperCase() !== "GET") {
    return Response.json(
      { code: "METHOD_NOT_ALLOWED", error: "OAuth start requests must use GET." },
      { status: 405 },
    );
  }

  if (!oauthStart.provider) {
    return Response.json(
      {
        code: "OAUTH_PROVIDER_NOT_SUPPORTED",
        error: "This OAuth provider is not supported.",
        provider: oauthStart.invalidProvider,
      },
      { status: 400 },
    );
  }

  try {
    const auth = await getAuth();
    const result = await auth.signIn({
      type: "oauth",
      provider: oauthStart.provider,
      redirectUrl: oauthStart.callbackURL,
    });

    if (result.ok && result.redirectTo) {
      return Response.redirect(new URL(result.redirectTo, request.url).toString(), 302);
    }

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("error", result.error?.code ?? "oauth_unavailable");
    signInUrl.searchParams.set("provider", oauthStart.provider);
    return Response.redirect(signInUrl, 302);
  } catch {
    return Response.json(
      { code: "OAUTH_START_FAILED", error: "Unable to start OAuth sign-in." },
      { status: 500 },
    );
  }
}

async function handle(request: Request): Promise<Response> {
  if (!PROVIDERS_USING_THIS_ROUTE.has(provider)) {
    return new Response("Auth provider does not use this route", { status: 404 });
  }

  const oauthStartResponse = await handleOAuthStartRequest(request);
  if (oauthStartResponse) {
    const url = new URL(request.url);
    return applySessionHint(oauthStartResponse, url.pathname, oauthStartResponse.status);
  }

  const auth = await getAuth();
  const authHandler = auth.middleware();
  const response = (await authHandler(request)) ?? new Response(null, { status: 404 });
  const url = new URL(request.url);
  return applySessionHint(response, url.pathname, response.status);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
