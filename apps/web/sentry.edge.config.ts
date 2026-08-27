/**
 * Sentry edge runtime configuration for the web app.
 *
 * Runs in Next.js middleware and edge route handlers. The edge runtime cannot
 * use Node profiling — keep this config minimal. No-op when DSN is missing.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
