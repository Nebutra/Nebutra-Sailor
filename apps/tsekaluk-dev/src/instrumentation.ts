/**
 * Next.js instrumentation hook for server-side telemetry.
 *
 * Better Auth 1.6 emits OpenTelemetry spans automatically once a global tracer
 * provider is registered. Keep the hook lightweight and exporter-gated so local
 * development remains zero-config.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { initGlobalOtel } = await import("@nebutra/logger/otel-bootstrap");
    initGlobalOtel({ serviceName: "tsekaluk-dev" });
  } catch (err) {
    globalThis.console.warn(
      `[tsekaluk-dev] Global OTel initialization failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const { initOtel } = await import("@nebutra/logger/otel");
    initOtel({ serviceName: "tsekaluk-dev" });
  } catch (err) {
    globalThis.console.warn(
      `[tsekaluk-dev] OTel initialization failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
