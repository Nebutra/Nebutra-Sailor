import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { Resource } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const serviceName = process.env.OTEL_SERVICE_NAME || "nebutra-sailor";
const serviceVersion = process.env.npm_package_version || "0.0.1";
const environment = process.env.NODE_ENV || "development";

// Configure resource attributes
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: serviceName,
  [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || "http://localhost:4318/v1/traces",
  headers: {
    Authorization: process.env.OTEL_EXPORTER_OTLP_HEADERS || "",
  },
});

// Configure metrics exporter
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || "http://localhost:4318/v1/metrics",
    headers: {
      Authorization: process.env.OTEL_EXPORTER_OTLP_HEADERS || "",
    },
  }),
  exportIntervalMillis: 60000, // Export every 60 seconds
});

// Create SDK
//
// Explicit instrumentation list — see packages/platform/logger/src/otel.ts for
// the full rationale. Short version: getNodeAutoInstrumentations() statically
// pulls in 30+ instrumentations with unsatisfiable peer-dep imports (notably
// instrumentation-winston → winston-transport) that break Next.js webpack
// bundling. We list only the runtimes actually present in this codebase.
const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingPaths: ["/health", "/misc/health", "/system/status"],
    }),
    new UndiciInstrumentation(),
    new PgInstrumentation(),
    new IORedisInstrumentation(),
    new PinoInstrumentation(),
  ],
});

/**
 * Initialize OpenTelemetry
 */
export function initTracing(): void {
  sdk.start();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk.shutdown().then(
      () => {},
      (_error) => {},
    );
  });
}

export { sdk };
