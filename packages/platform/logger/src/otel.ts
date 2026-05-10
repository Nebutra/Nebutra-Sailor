import { type Meter, metrics } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ParentBasedSampler, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node";

let sdk: NodeSDK | null = null;
let httpRequestCounter: ReturnType<Meter["createCounter"]> | null = null;
let httpErrorCounter: ReturnType<Meter["createCounter"]> | null = null;

/**
 * Initialize OpenTelemetry SDK.
 * No-op unless OTEL_ENABLED=true.
 *
 * Environment variables:
 *   OTEL_ENABLED=true                          — activate tracing
 *   OTEL_EXPORTER_OTLP_ENDPOINT=https://...   — Sentry / Datadog / Grafana / Jaeger
 *   OTEL_EXPORTER_OTLP_HEADERS=...            — auth headers (e.g. "Authorization=Bearer ...")
 *   OTEL_SERVICE_NAME=my-service              — override service name
 *   OTEL_SAMPLE_RATE=0.1                      — fraction of traces to export (default: 0.1 in prod, 1.0 in dev)
 */
export function initOtel(opts: { serviceName: string }): void {
  if (process.env.OTEL_ENABLED !== "true") return;

  const serviceName = process.env.OTEL_SERVICE_NAME ?? opts.serviceName;
  const isProduction = process.env.NODE_ENV === "production";

  // Configurable sample rate — defaults to 10% in production, 100% in dev.
  // Parent-based sampler respects upstream sampling decisions (e.g. from ingress).
  const sampleRate = process.env.OTEL_SAMPLE_RATE
    ? parseFloat(process.env.OTEL_SAMPLE_RATE)
    : isProduction
      ? 0.1
      : 1.0;

  const sampler = new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(
      Math.max(0, Math.min(1, sampleRate)), // clamp to [0, 1]
    ),
  });

  // OTLPMetricExporter / PeriodicExportingMetricReader may resolve to different
  // @opentelemetry/sdk-metrics major versions (v1 vs v2) depending on the
  // consumer's dependency tree. The runtime API is compatible — cast through
  // `any` to bridge the type gap until all OTel packages align.
  // biome-ignore lint/suspicious/noExplicitAny: OTel version bridge
  const metricExporter = new OTLPMetricExporter() as any;
  // biome-ignore lint/suspicious/noExplicitAny: OTel version bridge
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: isProduction ? 60_000 : 10_000,
  }) as any;

  sdk = new NodeSDK({
    serviceName,
    sampler,
    traceExporter: new OTLPTraceExporter(),
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is extremely noisy — generates spans for every file read
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Create HTTP counters after SDK is started so the MeterProvider is registered
  const meter = metrics.getMeter(serviceName);
  httpRequestCounter = meter.createCounter("http.server.request.count", {
    description: "Total number of HTTP requests received",
  });
  httpErrorCounter = meter.createCounter("http.server.error.count", {
    description: "Total number of HTTP error responses (4xx/5xx)",
  });

  // Flush pending spans and metrics before the process exits
  process.on("SIGTERM", async () => {
    await sdk?.shutdown();
  });
}

/**
 * Return a named OTel Meter. Falls back to a no-op meter when OTEL is disabled.
 */
export function getMeter(name: string): Meter {
  return metrics.getMeter(name);
}

/**
 * Increment the HTTP request counter. No-op when OTEL is disabled.
 */
export function recordHttpRequest(attributes?: Record<string, string>): void {
  httpRequestCounter?.add(1, attributes);
}

/**
 * Increment the HTTP error counter. No-op when OTEL is disabled.
 */
export function recordHttpError(attributes?: Record<string, string>): void {
  httpErrorCounter?.add(1, attributes);
}
