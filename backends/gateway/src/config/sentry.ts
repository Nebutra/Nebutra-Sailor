/**
 * Sentry initialization for the API Gateway.
 * Call initSentry() once at process startup before any request handling.
 */

import type { ErrorEvent, Scope } from "@sentry/node";

type SentryModule = typeof import("@sentry/node");

let sentryModulePromise: Promise<SentryModule | null> | null = null;

function loadSentry(): Promise<SentryModule | null> {
  if (!process.env.SENTRY_DSN) {
    return Promise.resolve(null);
  }

  sentryModulePromise ??= import("@sentry/node").catch(() => null);
  return sentryModulePromise;
}

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry disabled in local dev
  }

  const release = process.env.SENTRY_RELEASE;
  const options = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    // Only set `release` when defined — `exactOptionalPropertyTypes` forbids
    // assigning an explicit `undefined` to the optional NodeOptions.release.
    ...(release ? { release } : {}),
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event: ErrorEvent) {
      // Strip auth headers before sending to Sentry
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers["x-api-key"];
        delete event.request.headers.cookie;
        delete event.request.headers["x-admin-key"];
      }
      return event;
    },
    ignoreErrors: ["ECONNRESET", "ETIMEDOUT"],
  };

  void loadSentry().then((sentry) => {
    sentry?.init(options);
  });
}

/** Hono error handler that captures unhandled exceptions to Sentry. */
export function captureRequestError(err: Error, requestId?: string, tenantId?: string): void {
  void loadSentry().then((sentry) => {
    if (!sentry) {
      return;
    }

    sentry.withScope((scope: Scope) => {
      if (requestId) scope.setTag("request_id", requestId);
      if (tenantId) scope.setTag("tenant_id", tenantId);
      sentry.captureException(err);
    });
  });
}
