import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routing } from "@nebutra/i18n/routing";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/select-org(.*)",
  "/sso-callback(.*)",
  "/demo(.*)",
  "/api/webhook(.*)",
]);

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!hasClerkKey && process.env.NODE_ENV === "production") {
  throw new Error(
    "[Nebutra] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. " +
      "Authentication proxy cannot start. Set this env var or configure auth.",
  );
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://clerk.accounts.dev",
    "https://*.clerk.accounts.dev",
    ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  ].join(" ");

  const styleSrc = ["'self'", `'nonce-${nonce}'`, ...(isDev ? ["'unsafe-inline'"] : [])].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.accounts.dev",
    "font-src 'self' data:",
    "connect-src 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://api.clerk.com wss://*.clerk.accounts.dev",
    "frame-src https://clerk.accounts.dev https://*.clerk.accounts.dev",
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

export const proxy = hasClerkKey
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }

      // Run next-intl locale detection/redirect
      const intlResponse = intlMiddleware(req);

      // Apply CSP nonce to the response
      const response = intlResponse || NextResponse.next();
      return withNonce(req, response);
    })
  : (() => {
      let devWarned = false;
      return function devNoopProxy(req: NextRequest) {
        if (!devWarned) {
          devWarned = true;
        }

        // Run next-intl locale detection/redirect
        const intlResponse = intlMiddleware(req);

        const response = intlResponse || NextResponse.next();
        return withNonce(req, response);
      };
    })();

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
