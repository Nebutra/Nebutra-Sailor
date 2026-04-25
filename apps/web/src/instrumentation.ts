/**
 * Next.js OpenTelemetry instrumentation.
 * Loaded once per process via the Next.js instrumentation hook.
 * Only runs on the Node.js runtime (not edge).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── OpenTelemetry ───────────────────────────────────────────────────────
    try {
      const { initOtel } = await import("@nebutra/logger/otel");
      initOtel({ serviceName: "web" });
    } catch (err) {
      process.stderr.write(
        `[web] OTel initialization failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }

    // ── Sentry server-side ──────────────────────────────────────────────────
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV ?? "development",
          release: process.env.SENTRY_RELEASE,
          // 10% of server-rendered requests sampled for performance monitoring
          tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
          beforeSend(event) {
            // Strip PII from server-side errors before sending to Sentry
            if (event.request?.headers) {
              delete event.request.headers.cookie;
              delete event.request.headers.authorization;
            }
            return event;
          },
        });
      } catch (err) {
        process.stderr.write(
          `[web] Sentry initialization failed: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
  }
}

/**
 * Next.js 15 onRequestError hook.
 * Automatically called for RSC errors, route handler errors, and server action errors.
 * Routes every unhandled server error to Sentry with digest + URL context.
 */
export const onRequestError = async (
  err: { digest?: string } & Error,
  request: { url: string; method: string },
) => {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, {
      extra: { digest: err.digest, url: request.url, method: request.method },
    });
  } catch {
    // Never let error reporting crash the request path
  }
};
