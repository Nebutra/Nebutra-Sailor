# @nebutra/logger

Structured logging (pino) with OpenTelemetry trace-ID injection for Nebutra services.

## Design Intent

All Nebutra backend services and packages share a single logger instance rather than configuring pino individually. The logger automatically injects the active OpenTelemetry `traceId` into every log record when a span is active, enabling log-trace correlation without any call-site changes. In development, `pino-pretty` renders colored, human-readable output; in production, JSON is emitted for log aggregators.

`initOtel` must be called once at process startup (before any imports that create spans) to initialize the OpenTelemetry SDK.

## Usage

```typescript
import { logger } from "@nebutra/logger";
import { initOtel } from "@nebutra/logger/otel";

// At process startup
initOtel({ serviceName: "api-gateway" });

// Anywhere in the codebase
logger.info("User signed in", { userId: "u_123" });
logger.error("Payment failed", error, { orderId: "ord_456" });

// Scoped child logger
const log = logger.child({ service: "billing" });
log.warn("Quota approaching", { used: 950, limit: 1000 });
```
