import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk middleware for Sleptons. Without it `auth()` in route handlers throws
 * ("can't detect usage of clerkMiddleware"). Only the résumé editor and its
 * API are protected; the gallery and member pages stay public.
 */
const isProtected = createRouteMatcher(["/resume(.*)", "/api/resume(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  // Everything except Next internals and static assets. /api is included on
  // purpose so auth() works in route handlers.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|txt|xml|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
