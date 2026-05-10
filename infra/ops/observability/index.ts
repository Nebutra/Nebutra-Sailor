export { createTenantLogger, type Logger, logger, requestLogger } from "./logging";
export * from "./metrics";
export { captureException, initSentry, Sentry, setUser } from "./sentry";
export { initTracing, sdk } from "./tracing";

/**
 * Initialize all observability components
 */
export function initObservability(): void {
  // Initialize tracing first (must be before other imports)
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  }

  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    require("./sentry").initSentry();
  }
}
