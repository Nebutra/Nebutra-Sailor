# Observability

Logging, tracing, and metrics configuration.

## Stack

| Tool              | Purpose                                 |
| ----------------- | --------------------------------------- |
| **Sentry**        | Error tracking & performance monitoring |
| **OpenTelemetry** | Distributed tracing                     |
| **OpenStatus**    | Uptime monitoring                       |

## Sentry Setup

### 1. Install SDK

```bash
pnpm add @sentry/nextjs
```

### 2. Configure

```bash
npx @sentry/wizard@latest -i nextjs
```

### 3. Environment Variables

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=...
```

### 4. Usage

Errors are automatically captured. Manual capture:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.captureException(error);
Sentry.captureMessage("Something happened");
```

## OpenTelemetry Setup

### 1. Install packages

```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node
```

### 2. Configure tracing

```typescript
// lib/tracing.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### 3. Environment Variables

```bash
OTEL_SERVICE_NAME=nebutra-web
OTEL_EXPORTER_OTLP_ENDPOINT=https://...
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ...
```

## OpenStatus Setup

See [infra/openstatus/](../openstatus/) for uptime monitoring configuration.

## Logging Best Practices

### Structured Logging

```typescript
import { logger } from "@/lib/logger";

logger.info("User created", {
  userId: user.id,
  email: user.email,
  tenantId: tenant.id,
});
```

### Log Levels

| Level   | Usage                          |
| ------- | ------------------------------ |
| `error` | Exceptions and failures        |
| `warn`  | Potentially harmful situations |
| `info`  | General information            |
| `debug` | Detailed debugging info        |

## Dashboards

- **Sentry**: [sentry.io/organizations/your-org](https://sentry.io)
- **Grafana**: Custom dashboards for metrics
- **OpenStatus**: Public status page

## Related

- [OpenStatus config](../openstatus/)
- [Cloudflare config](../cloudflare/)
