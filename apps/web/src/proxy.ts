import { routing } from "@nebutra/i18n/routing";
import { logger } from "@nebutra/logger";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Define public routes that don't require authentication.
 * Used by both Clerk and custom auth middlewares.
 */
const publicRoutePaths = [
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/select-org",
  "/sso-callback",
  "/demo",
  "/api/webhook",
];

const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

// Only require Clerk key if using Clerk provider
const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (authProvider === "clerk" && !hasClerkKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "[Nebutra] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required when using Clerk auth provider. " +
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

  const styleSrc = ["'self'", `'nonce-${nonce}'`, ...(isDev ? ["'unsafe-inline'"] : [])].join(" ");

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

function withNonce(_request: NextRequest, response: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

/**
 * Check if a request path is public (doesn't require auth).
 */
function isPublicPath(pathname: string): boolean {
  return publicRoutePaths.some((path) => {
    if (path.includes("(.*)")) {
      const regex = new RegExp(`^${path.replace("(.*)", ".*")}$`);
      return regex.test(pathname);
    }
    return pathname === path || pathname.startsWith(path);
  });
}

/**
 * Middleware handler — routes to Clerk or generic auth based on provider.
 *
 * For Clerk: requires eager import of clerkMiddleware (top of file if using Clerk in prod)
 * For others: simple locale + CSP handler
 */
export async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (authProvider === "clerk" && hasClerkKey) {
    // For Clerk provider, dynamically import and use clerkMiddleware
    // Note: In production with Clerk, consider importing clerkMiddleware at the top
    // for better performance instead of dynamic import
    try {
      const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
      const clerkRoutematcher = createRouteMatcher(publicRoutePaths);

      // Create Clerk middleware handler
      const clerk = clerkMiddleware(async (auth, innerReq) => {
        if (!clerkRoutematcher(innerReq)) {
          await auth.protect();
        }

        // Run next-intl locale detection/redirect
        const intlResponse = intlMiddleware(innerReq);

        // Apply CSP nonce to the response
        const response = intlResponse || NextResponse.next();
        return withNonce(innerReq, response);
      });

      return clerk(req, event);
    } catch (error) {
      logger.error("Failed to load Clerk middleware:", error);
      // Fallback to generic handler
    }
  }

  // For non-Clerk providers or Clerk import failure, use simple locale + CSP handler
  // The AuthProvider in layout.tsx handles session management for non-Clerk providers

  // Skip intl locale detection for API routes — they don't need locale processing
  // and next-intl rewrites them into /en/api/... which causes 404s.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return withNonce(req, response);
  }

  // Run next-intl locale detection/redirect
  const intlResponse = intlMiddleware(req);

  const response = intlResponse || NextResponse.next();
  return withNonce(req, response);
}

export default proxy;

export const config = {
  // Exclude API routes from the proxy/middleware so they resolve directly to
  // app/api/ route handlers without any locale or CSP processing.
  matcher: [
    "/((?!_next|api|trpc|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
