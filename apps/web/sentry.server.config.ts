/**
 * Sentry server-side SDK configuration for the web app (Node.js runtime).
 *
 * Picked up by @sentry/nextjs in instrumentation.ts. No-op when DSN is missing
 * so local development and zero-config deployments still work.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,

    // 10% of server-rendered requests sampled for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    beforeSend(event) {
      // Strip PII headers before sending to Sentry
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },
  });
}
