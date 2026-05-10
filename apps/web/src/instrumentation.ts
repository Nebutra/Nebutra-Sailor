/**
 * Next.js OpenTelemetry instrumentation.
 * Loaded once per process via the Next.js instrumentation hook.
 * Only runs on the Node.js runtime (not edge).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ── Global OTel NodeSDK (Langfuse + optional OTLP) ─────────────────────
    // Must run BEFORE Sentry so Sentry's @sentry/opentelemetry layer attaches
    // to the existing global tracer provider rather than installing its own.
    try {
      const { initGlobalOtel } = await import("@nebutra/logger/otel-bootstrap");
      initGlobalOtel({ serviceName: "nebutra-web" });
    } catch (err) {
      process.stderr.write(
        `[web] Global OTel initialization failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }

    // ── Legacy OTel path (OTLP traces + metrics, gated by OTEL_ENABLED) ────
    try {
      const { initOtel } = await import("@nebutra/logger/otel");
      initOtel({ serviceName: "web" });
    } catch (err) {
      process.stderr.write(
        `[web] OTel initialization failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }

    // ── Sentry server-side ──────────────────────────────────────────────────
    // Loaded from sentry.server.config.ts (canonical Next.js convention).
    try {
      await import("../sentry.server.config");
    } catch (err) {
      process.stderr.write(
        `[web] Sentry server init failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    try {
      await import("../sentry.edge.config");
    } catch (err) {
      process.stderr.write(
        `[web] Sentry edge init failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
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
