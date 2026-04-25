/**
 * Next.js OpenTelemetry instrumentation.
 * Loaded once per process via the Next.js instrumentation hook.
 * Only runs on the Node.js runtime (not edge).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initOtel } = await import("@nebutra/logger/otel");
      initOtel({ serviceName: "landing-page" });
    } catch (err) {
      process.stderr.write(
        `[landing-page] OTel initialization failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }
}
