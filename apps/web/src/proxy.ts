import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getAuthCenterOrigin,
  getConfiguredAuthProvider,
} from "@nebutra/auth";
import { logger } from "@nebutra/logger";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Define public routes that don't require authentication.
 * Used by both Clerk and custom auth middlewares.
 */
const publicRoutePaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/login/success",
  "/desktop-auth",
  "/onboarding",
  "/select-org",
  "/sso-callback",
  "/demo",
  "/api/webhook",
];

function isPublicPathname(pathname: string): boolean {
  // Cookie-based i18n: no locale prefix in URLs — compare pathname directly.
  if (pathname === "/") {
    return true;
  }

  return publicRoutePaths.some(
    (publicPath) =>
      publicPath !== "/" && (pathname === publicPath || pathname.startsWith(`${publicPath}/`)),
  );
}

function isDesktopAuthRemotePath(pathname: string): boolean {
  return pathname === "/signup/remote" || pathname === "/login/remote";
}

const authProvider = getConfiguredAuthProvider();

// Only require Clerk key if using Clerk provider
const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (authProvider === "clerk" && !hasClerkKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "[auth] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required when using Clerk auth provider. " +
      "Set this env var or change NEXT_PUBLIC_AUTH_PROVIDER.",
  );
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const isClerk = authProvider === "clerk";

  const clerkDirectives = isClerk
    ? ["https://clerk.accounts.dev", "https://*.clerk.accounts.dev"]
    : [];

  const clerkImg = isClerk ? ["https://img.clerk.com", "https://*.clerk.accounts.dev"] : [];

  const clerkConnect = isClerk
    ? [
        "https://clerk.accounts.dev",
        "https://*.clerk.accounts.dev",
        "https://api.clerk.com",
        "wss://*.clerk.accounts.dev",
      ]
    : [];

  const clerkFrame = isClerk ? ["https://clerk.accounts.dev", "https://*.clerk.accounts.dev"] : [];

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...clerkDirectives,
    ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  ].join(" ");

  const styleSrc = ["'self'", ...(isDev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`])].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src 'self' data: blob: ${clerkImg.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${clerkConnect.join(" ")}`,
    `frame-src ${clerkFrame.join(" ") || "'none'"}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function withNonce(request: NextRequest, response: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  // Server components read the nonce via `getNonce()` → `headers().get("x-nonce")`,
  // which reads the *request* headers. Without injecting here, getNonce() always
  // returns "" and any inline `<script nonce={...}>` rendered server-side fails
  // CSP, throws, and the ErrorBoundary surfaces a generic "Something went wrong".
  request.headers.set("x-nonce", nonce);

  // The browser validates `<script nonce="...">` against the CSP header on the
  // *response*, so the same nonce must appear on both sides.
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

/**
 * Middleware handler — routes to Clerk or generic auth based on provider.
 *
 * Cookie-based i18n: no next-intl locale middleware runs here. Locale is
 * resolved from the NEXT_LOCALE cookie in getRequestConfig (request.ts).
 *
 * For Clerk: requires eager import of clerkMiddleware (top of file if using Clerk in prod)
 * For others: simple CSP handler
 */
export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (isDesktopAuthRemotePath(pathname)) {
    return withNonce(req, NextResponse.next());
  }

  // Login center owns /sign-in and /sign-up (multi-app RP model).
  // Preserve returnTo so auth redirects back into this app.
  const authCenter = getAuthCenterOrigin();
  // Prefer public app URL / forwarded host — Next standalone often reports
  // localhost/0.0.0.0 as nextUrl.origin when HOSTNAME binds the listen socket.
  const thisOrigin = (() => {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
    if (configured?.startsWith("http")) return configured;
    const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (
      xfHost &&
      !xfHost.startsWith("0.0.0.0") &&
      xfHost !== "127.0.0.1" &&
      xfHost !== "localhost"
    ) {
      return `${xfProto}://${xfHost}`;
    }
    const host = req.headers.get("host")?.split(",")[0]?.trim();
    if (
      host &&
      !host.startsWith("0.0.0.0") &&
      !host.startsWith("127.0.0.1") &&
      !host.startsWith("localhost")
    ) {
      return `${xfProto}://${host}`;
    }
    return req.nextUrl.origin;
  })();
  const isAuthCenterHost = (() => {
    try {
      return new URL(authCenter).host === new URL(thisOrigin).host;
    } catch {
      try {
        return new URL(authCenter).host === req.nextUrl.host;
      } catch {
        return false;
      }
    }
  })();

  // Auth-center owns the full login surface (sign-in/up, forgot/reset password).
  // Keep web APIs + desktop remotes local; UI always funnels to brand auth origin.
  if (
    !isAuthCenterHost &&
    authProvider !== "clerk" &&
    (pathname === "/sign-in" ||
      pathname.startsWith("/sign-in/") ||
      pathname === "/sign-up" ||
      pathname.startsWith("/sign-up/") ||
      pathname === "/forgot-password" ||
      pathname.startsWith("/forgot-password/") ||
      pathname === "/reset-password" ||
      pathname.startsWith("/reset-password/"))
  ) {
    const existing =
      req.nextUrl.searchParams.get("returnTo") ||
      req.nextUrl.searchParams.get("returnUrl") ||
      req.nextUrl.searchParams.get("redirect");
    // DEFAULT_POST_LOGIN_PATH — /workspace (not /dashboard; that route 404s).
    const returnTo = existing || `${thisOrigin}/workspace`;
    const authOrigin = getAuthCenterOrigin();
    let target: string;
    if (pathname.startsWith("/sign-up")) {
      target = buildAuthCenterSignUpUrl(returnTo);
    } else if (pathname === "/forgot-password" || pathname.startsWith("/forgot-password/")) {
      const url = new URL("/forgot-password", `${authOrigin}/`);
      url.searchParams.set("returnTo", returnTo);
      target = url.toString();
    } else if (pathname === "/reset-password" || pathname.startsWith("/reset-password/")) {
      // Preserve token path/query for email deep-links.
      const url = new URL(pathname + req.nextUrl.search, `${authOrigin}/`);
      target = url.toString();
    } else {
      target = buildAuthCenterSignInUrl(returnTo);
    }
    return NextResponse.redirect(target, 307);
  }

  if (authProvider === "clerk" && hasClerkKey) {
    // For Clerk provider, dynamically import and use clerkMiddleware
    // Note: In production with Clerk, consider importing clerkMiddleware at the top
    // for better performance instead of dynamic import
    try {
      const { clerkMiddleware } = await import("@clerk/nextjs/server");

      // Create Clerk middleware handler
      const clerk = clerkMiddleware(async (auth, innerReq) => {
        if (!isPublicPathname(innerReq.nextUrl.pathname)) {
          await auth.protect();
        }

        return withNonce(innerReq, NextResponse.next());
      });

      return clerk(req, event);
    } catch (error) {
      logger.error("Failed to load Clerk middleware:", error);
      // Fallback to generic handler
    }
  }

  // For non-Clerk providers or Clerk import failure, use simple CSP handler.
  // The AuthProvider in layout.tsx handles session management for non-Clerk providers.
  // Cookie-based i18n: no intl middleware or locale redirects needed.

  // Skip CSP injection for API routes — they don't need nonce processing.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return withNonce(req, NextResponse.next());
}

export default proxy;

export const config = {
  // Exclude API routes from the proxy/middleware so they resolve directly to
  // app/api/ route handlers without any locale or CSP processing.
  matcher: [
    "/((?!_next|api|trpc|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|xml|webmanifest)).*)",
  ],
};
