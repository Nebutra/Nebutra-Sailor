import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Format: "1.2.3+sha-abc1234" — links errors to both version and commit
    release:
      process.env.SENTRY_RELEASE ??
      (process.env.npm_package_version && process.env.GITHUB_SHA
        ? `${process.env.npm_package_version}+${process.env.GITHUB_SHA.slice(0, 7)}`
        : process.env.npm_package_version),

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers["x-api-key"];
        delete event.request.headers.cookie;
      }
      return event;
    },

    // Ignore specific errors
    ignoreErrors: ["ECONNRESET", "ETIMEDOUT", "Network request failed"],
  });
}

/**
 * Capture exception with tenant context
 */
export function captureException(
  error: Error,
  context?: {
    tenantId?: string;
    userId?: string;
    requestId?: string;
    extra?: Record<string, unknown>;
  },
): void {
  Sentry.withScope((scope) => {
    if (context?.tenantId) {
      scope.setTag("tenant_id", context.tenantId);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.requestId) {
      scope.setTag("request_id", context.requestId);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id: string; email?: string; tenantId?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
  if (user.tenantId) {
    Sentry.setTag("tenant_id", user.tenantId);
  }
}

export { Sentry };
