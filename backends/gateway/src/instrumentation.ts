/**
 * api-gateway OpenTelemetry bootstrap.
 *
 * Imported as the very first side-effect in `src/index.ts` so that the global
 * tracer provider is registered BEFORE any module that emits spans (Vercel AI
 * SDK, Sentry, Hono middleware) is loaded. Order matters for OTel.
 */
import { initGlobalOtel } from "@nebutra/logger/otel-bootstrap";

initGlobalOtel({ serviceName: "nebutra-api-gateway" });
