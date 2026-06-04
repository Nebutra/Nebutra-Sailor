/**
 * Global OpenTelemetry NodeSDK bootstrap.
 *
 * Wires up trace export to:
 *   - Langfuse (when LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY are set) — for
 *     LLM/AI SDK span capture.
 *   - Generic OTLP endpoint (when OTEL_EXPORTER_OTLP_ENDPOINT is set) — for
 *     vendor-neutral observability backends (Sentry, Grafana, Datadog, ...).
 *
 * Differences vs. {@link initOtel} (otel.ts):
 *   - `initOtel` is opt-in via OTEL_ENABLED=true and registers OTLP traces +
 *     metrics + auto-instrumentations.
 *   - `initGlobalOtel` is the LIGHTWEIGHT path for capturing
 *     `experimental_telemetry` spans from the Vercel AI SDK and shipping them
 *     to Langfuse. It activates whenever Langfuse is configured.
 *   - Both are idempotent. If `initOtel` has already started, `initGlobalOtel`
 *     is a no-op.
 *
 * Sentry interop:
 *   Sentry v8+ uses `@sentry/opentelemetry` under the hood. When this NodeSDK
 *   is registered FIRST, Sentry's Next.js / Node SDK detects an existing
 *   global tracer provider and attaches its own SpanProcessor on top, so both
 *   Sentry AND Langfuse receive spans. Order matters — call this BEFORE
 *   `Sentry.init()`.
 */

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { LangfuseExporter } from "langfuse-vercel";
import { logger } from "./logger.js";

// `BatchSpanProcessor` / `OTLPTraceExporter` may resolve to different
// `@opentelemetry/sdk-trace-base` major versions (v1 vs v2) depending on the
// consumer dependency tree. The runtime API is compatible — bridge the type
// gap until all OTel packages align.
// biome-ignore lint/suspicious/noExplicitAny: OTel version bridge
type AnySpanProcessor = any;

interface InitGlobalOtelOptions {
  serviceName: string;
  /** Default true. Set false to skip Langfuse even if env is configured. */
  includeLangfuse?: boolean;
}

let initialized = false;
let activeSdk: NodeSDK | null = null;
let shutdownHookInstalled = false;

/**
 * Initialize the global OTel NodeSDK with Langfuse + optional OTLP exporters.
 *
 * Returns the SDK instance (or null if no exporter was configured / a previous
 * call already initialized). Safe to call repeatedly — second call is a no-op.
 */
export function initGlobalOtel(opts: InitGlobalOtelOptions): NodeSDK | null {
  if (initialized) return activeSdk;
  initialized = true;

  // If the legacy `initOtel` path is active, defer to it.
  if (process.env.OTEL_ENABLED === "true") {
    logger.debug("initGlobalOtel: legacy OTEL_ENABLED path active, skipping");
    return null;
  }

  const includeLangfuse = opts.includeLangfuse !== false;
  const langfuseConfigured =
    includeLangfuse &&
    Boolean(process.env.LANGFUSE_PUBLIC_KEY) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY);
  const otlpConfigured = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

  if (!langfuseConfigured && !otlpConfigured) {
    logger.debug("initGlobalOtel: no exporters configured, skipping");
    return null;
  }

  const spanProcessors: AnySpanProcessor[] = [];

  if (langfuseConfigured) {
    try {
      const langfuseParams: {
        publicKey?: string;
        secretKey?: string;
        baseUrl?: string;
      } = {};
      if (process.env.LANGFUSE_PUBLIC_KEY)
        langfuseParams.publicKey = process.env.LANGFUSE_PUBLIC_KEY;
      if (process.env.LANGFUSE_SECRET_KEY)
        langfuseParams.secretKey = process.env.LANGFUSE_SECRET_KEY;
      if (process.env.LANGFUSE_HOST) langfuseParams.baseUrl = process.env.LANGFUSE_HOST;
      const langfuseExporter = new LangfuseExporter(langfuseParams) as unknown as SpanExporter;
      spanProcessors.push(new BatchSpanProcessor(langfuseExporter));
      logger.info("OTel: Langfuse exporter registered", { service: opts.serviceName });
    } catch (err) {
      logger.warn("OTel: failed to register Langfuse exporter", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (otlpConfigured) {
    try {
      const otlpExporter = new OTLPTraceExporter() as unknown as SpanExporter;
      spanProcessors.push(new BatchSpanProcessor(otlpExporter));
      logger.info("OTel: OTLP trace exporter registered", { service: opts.serviceName });
    } catch (err) {
      logger.warn("OTel: failed to register OTLP exporter", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (spanProcessors.length === 0) {
    return null;
  }

  try {
    const sdk = new NodeSDK({
      serviceName: opts.serviceName,
      spanProcessors,
      // No auto-instrumentations here — keep this path lightweight. Manual
      // spans (Vercel AI SDK `experimental_telemetry`, Sentry's own OTel
      // integration) are picked up via the global tracer provider.
    });
    sdk.start();
    activeSdk = sdk;

    if (!shutdownHookInstalled) {
      shutdownHookInstalled = true;
      const shutdown = async () => {
        try {
          await sdk.shutdown();
        } catch (err) {
          logger.warn("OTel: shutdown failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };
      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);
      process.on("beforeExit", shutdown);
    }

    return sdk;
  } catch (err) {
    logger.warn("OTel: NodeSDK start failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Test helper — resets module-level init state. */
export function _resetGlobalOtelForTests(): void {
  initialized = false;
  activeSdk = null;
  shutdownHookInstalled = false;
}
