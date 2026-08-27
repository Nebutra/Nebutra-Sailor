/**
 * Sentry browser-side SDK configuration for the web app.
 *
 * This file is automatically picked up by @sentry/nextjs via its Webpack plugin.
 * It runs in the browser for every page load.
 *
 * Install: pnpm --filter @nebutra/web add @sentry/nextjs
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // 10% of client-side navigations sampled for performance
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay — record 1% of sessions, 100% when errors occur
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all images by default (PII protection)
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Propagate trace context to the Nebutra API
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api\.nebutra\.ai/,
    /^https:\/\/api\.nebutra\.com/,
  ],

  beforeSend(event) {
    // Drop errors from browser extensions (they pollute dashboards)
    const isExtension =
      event.exception?.values?.some((ex) =>
        ex.stacktrace?.frames?.some(
          (f) =>
            f.filename?.includes("chrome-extension://") || f.filename?.includes("moz-extension://"),
        ),
      ) ?? false;

    if (isExtension) return null;
    return event;
  },

  ignoreErrors: [
    // Browser-generated noise
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network timeouts
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // Cancelled navigations
    "AbortError",
  ],
});
