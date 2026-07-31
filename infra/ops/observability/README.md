# Observability

Logging, tracing, and metrics configuration.

## Stack

| Tool              | Purpose                                 |
| ----------------- | --------------------------------------- |
| **Sentry**        | Error tracking, stack traces, release regression, performance symptoms |
| **OpenTelemetry** | Vendor-neutral traces and metrics export |
| **PostHog**       | Product events, funnels, retention, session replay, feature usage |
| **@nebutra/logger** | Structured application logs and optional Sentry breadcrumbs |
| **OpenStatus**    | Uptime monitoring                       |

## Responsibility Boundary

| Question | Source of truth | Do not use |
| -------- | --------------- | ---------- |
| What code path failed, with stack trace and release? | Sentry | PostHog product events |
| What did the user do before/after the failure? | PostHog session replay and product events | Sentry issue metadata alone |
| What happened inside this request or worker? | `@nebutra/logger` plus OTel trace IDs | ad hoc `console.log` |
| What marketing link or invite caused the conversion? | Dub via `createAnalyticsClient` | PostHog capture |
| What product funnel or retention cohort moved? | PostHog via `createProductAnalyticsClient` | Dub link analytics |

Sentry and PostHog may both receive context for the same incident, but they do
not own the same job. Sentry owns application health. PostHog owns user/product
behavior. Correlate them by carrying `userId`, `organizationId`, release, and
request IDs where available.

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

## PostHog Setup

Use PostHog for product analytics and session context. Browser events use the
public key. Server-originated events use the server key first and fall back to
the public key only when a separate server key is not configured.

```bash
POSTHOG_KEY=phc_server_project_key
POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_KEY=phc_browser_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Code ownership:

```typescript
import { createProductAnalyticsClientFromEnv } from "@nebutra/analytics";

const productAnalytics = createProductAnalyticsClientFromEnv();
await productAnalytics.track("checkout", { action: "completed", tier: "STARTUP" });
```

Do not send product events through `createAnalyticsClient`; that entry point is
for Dub attribution and short links.

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

OpenStatus uptime monitoring is configured via `openstatus.lock` at the repository root and `packages/platform/status/src/providers/openstatus.ts`.
`@nebutra/status` also ships native read adapters for Atlassian Statuspage, Better Stack (`/index.json`), and Instatus (`/summary.json`) — see `packages/platform/status/README.md`.

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

- [Cloudflare config](../../iac/cloudflare/)
