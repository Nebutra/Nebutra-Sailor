/**
 * Sentry initialization for the API Gateway.
 * Call initSentry() once at process startup before any request handling.
 */
import * as Sentry from "@sentry/node";

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    return; // Sentry disabled in local dev
  }

  const options: Sentry.NodeOptions = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
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

  if (process.env.SENTRY_RELEASE) {
    options.release = process.env.SENTRY_RELEASE;
  }

  Sentry.init(options);
}

/** Hono error handler that captures unhandled exceptions to Sentry. */
export function captureRequestError(err: Error, requestId?: string, tenantId?: string): void {
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("request_id", requestId);
    if (tenantId) scope.setTag("tenant_id", tenantId);
    Sentry.captureException(err);
  });
}
