# Observability, Testing & CORS Design

**Date:** 2026-02-28
**Status:** Approved
**Scope:** packages/logger (new), test suites for alerting/rate-limit/api-gateway, CORS refactor

---

## Design Principles

- **Zero-config startup** — `pnpm dev` works without any env vars configured
- **Progressive disclosure** — add env vars to unlock external observability platforms
- **Indie-first** — minimal boilerplate, maximum clarity for solo devs and small teams
- **Vendor-neutral** — OpenTelemetry as the single integration point; swap backends without code changes

---

## Part 1: packages/logger

### Purpose

Replace all `console.log/error` throughout the monorepo with a structured, OTel-aware logger. Single source of truth for logs, traces, and error correlation.

### Package Structure

```
packages/logger/
├── src/
│   ├── index.ts          # Public API: createLogger, initOtel, logger (default instance)
│   ├── logger.ts         # Pino instance + Logger interface
│   ├── otel.ts           # OpenTelemetry SDK setup (conditional init)
│   └── types.ts          # Logger interface, LogLevel, OtelConfig types
├── package.json
└── tsconfig.json
```

### Public API

```typescript
// Singleton for simple usage (zero config)
import { logger } from "@nebutra/logger";
logger.info("Server started", { port: 3002 });
logger.error("DB failed", error, { query: "findUser" });

// Child logger with bound context (for services/routes)
const routeLogger = logger.child({ service: "consent", requestId: "..." });

// OTel initialization (call once at app startup)
import { initOtel } from "@nebutra/logger";
initOtel({ serviceName: "api-gateway" }); // reads env vars automatically
```

### Logger Interface

```typescript
interface Logger {
  debug(msg: string, meta?: Meta): void;
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, error?: unknown, meta?: Meta): void;
  child(bindings: Meta): Logger;
}
type Meta = Record<string, unknown>;
```

### Pino Configuration

| Environment | Format                       | Level |
| ----------- | ---------------------------- | ----- |
| development | pino-pretty (human-readable) | debug |
| production  | JSON                         | info  |
| test        | silent                       | -     |

Log entries include: `timestamp`, `level`, `msg`, `service`, `traceId` (auto-injected from OTel context when available).

### OpenTelemetry Setup

**Dependencies:**

- `@opentelemetry/sdk-node` — core SDK
- `@opentelemetry/auto-instrumentations-node` — auto-instruments HTTP, pg, Redis, fetch
- `@opentelemetry/exporter-otlp-http` — OTLP exporter (works with Sentry, Datadog, Grafana, New Relic, Jaeger)

**Initialization (conditional):**

```typescript
export function initOtel(opts: { serviceName: string }): void {
  if (process.env.OTEL_ENABLED !== "true") return; // no-op in dev
  // register SDK, auto-instrumentations, OTLP exporter
}
```

**New env vars (all optional, safe to omit in dev):**

```
LOG_LEVEL=info                          # debug | info | warn | error
OTEL_ENABLED=true                       # false by default
OTEL_SERVICE_NAME=api-gateway           # used in traces/metrics
OTEL_EXPORTER_OTLP_ENDPOINT=https://...  # platform-specific
OTEL_EXPORTER_OTLP_HEADERS=...          # auth (e.g., "sentry-trace=xxx")
```

**Platform connection examples (for docs/README):**

- Sentry: set endpoint to `https://o<id>.ingest.sentry.io/api/<proj>/envelope/`
- Datadog: set endpoint to `https://trace.agent.datadoghq.com`
- Grafana Cloud: set endpoint from Grafana UI → Connections → OTLP

### Integration Points

1. **packages/alerting** → `setAlertErrorHandler((ctx, err) => logger.error(ctx, err))`
2. **backends/gateway `onError`** → `logger.error('Unhandled error', err)` (remove `console.error`)
3. **backends/gateway startup** → `logger.info('API Gateway started', { port })` (remove `console.log`)
4. **backends/gateway/consent.ts** → 8 catch blocks → `routeLogger.error(msg, error)` per route
5. **backends/gateway/config/env.ts** → `console.error` in `validateEnv` → `process.stderr.write` (can't use logger before init) or keep as-is (acceptable for startup-time config errors)

---

## Part 2: Testing

### Strategy: Behavior-First, Not Coverage-First

Write tests that verify **behavior that would cause production incidents if broken**. Coverage is a byproduct, not the goal.

### Test Suite 1: packages/alerting

**File:** `packages/alerting/src/__tests__/alerting.test.ts`

```
trackError() behavior:
  ✓ does not alert below threshold
  ✓ fires alert when threshold reached
  ✓ respects cooldown — does not re-alert during cooldown window
  ✓ resets error count when window expires
  ✓ tracks separate services independently

Channel registry:
  ✓ registerChannel / unregisterChannel
  ✓ clearChannels (lifecycle - already implemented)
  ✓ getRegisteredChannelNames

sendAlert():
  ✓ calls all registered channels
  ✓ records failures without throwing
  ✓ returns per-channel result map

setAlertErrorHandler():
  ✓ error handler is called when channel.send throws
  ✓ default handler is no-op (does not throw)
```

**Setup:** `vi.useFakeTimers()` for windowing/cooldown tests. `beforeEach: clearChannels() + resetErrorCounts()`.

### Test Suite 2: packages/rate-limit

**File:** `packages/rate-limit/src/__tests__/tokenBucket.test.ts`

```
TokenBucket.consume():
  ✓ allows request when tokens available
  ✓ deducts correct token count
  ✓ denies request when tokens exhausted
  ✓ returns correct retryAfter seconds
  ✓ refills tokens after refillInterval
  ✓ does not exceed maxTokens on refill
  ✓ tracks separate keys independently

getApiWeight():
  ✓ returns correct weight for known routes
  ✓ returns default weight for unknown routes

cleanup():
  ✓ removes buckets older than maxAge
  ✓ keeps active buckets

PLAN_LIMITS:
  ✓ FREE has lower limits than PRO
  ✓ PRO has lower limits than ENTERPRISE
```

**Setup:** `vi.useFakeTimers()` to control `Date.now()` for refill calculations.

### Test Suite 3: backends/gateway (consent routes)

**File:** `backends/gateway/src/__tests__/consent.test.ts`

Uses Hono's built-in test utility (`app.request()`) + `vi.mock('@nebutra/db')`.

```
POST /api/v1/legal/consent:
  ✓ 201 with valid payload + existing document
  ✓ 404 when document not found
  ✓ 422 when documentSlug missing (Zod validation)
  ✓ 500 on database error (Prisma throws)

GET /api/v1/legal/consent/status:
  ✓ returns hasConsented: true when consent exists
  ✓ returns needsReconsent: true when version mismatch
  ✓ 400 when documentSlug missing
  ✓ 404 when document not found

DELETE /api/v1/legal/consent:
  ✓ 200 with withdrawnCount
  ✓ 400 when documentSlug missing

POST /api/v1/legal/cookie-consent:
  ✓ creates new consent record
  ✓ upserts on second call (same visitorId)
  ✓ 422 on invalid email/missing visitorId

GET /api/v1/legal/cookie-consent:
  ✓ returns preferences when consent exists and not expired
  ✓ returns hasConsent: false when expired
  ✓ 400 when neither visitorId nor userId provided
```

**Prisma mock pattern:**

```typescript
vi.mock("@nebutra/db", () => ({
  prisma: {
    legalDocument: { findFirst: vi.fn(), findMany: vi.fn() },
    userConsent: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    cookieConsent: { upsert: vi.fn(), findFirst: vi.fn() },
    contactSubmission: { create: vi.fn() },
  },
}));
```

---

## Part 3: CORS Refactor

### Problem

`backends/gateway/src/index.ts` has production domain strings hardcoded inline. Template users must manually grep and replace.

### Solution

Reference existing `DOMAINS` constants from `env.ts` + add `CORS_ORIGINS` env var for arbitrary overrides.

### New CORS construction (index.ts)

```typescript
import { env, DOMAINS } from "./config/env.js";

const corsOrigins = [
  // Localhost dev origins (auto-included in development)
  ...(env.NODE_ENV !== "production"
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3003",
      ]
    : []),
  // Production constants (single source of truth in env.ts)
  DOMAINS.landing,
  `https://www.${new URL(DOMAINS.landing).hostname}`,
  DOMAINS.app,
  DOMAINS.studio,
  // Per-environment URL overrides
  env.LANDING_URL,
  env.WEB_URL,
  env.STUDIO_URL,
  // Arbitrary additional origins (comma-separated)
  ...(env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter(Boolean) as string[];
```

### New env var (add to env.ts schema)

```typescript
CORS_ORIGINS: z.string().optional();
// Example: CORS_ORIGINS=https://preview.vercel.app,https://staging.myapp.com
```

### Template user experience

Fork the template → set `DOMAINS` in `env.ts` to their domains → all CORS is automatically correct. Zero grep-and-replace.

---

## Implementation Order

1. **packages/logger** (foundation — everything else depends on it)
2. **CORS refactor** (self-contained, fast)
3. **packages/alerting tests** (no new deps needed)
4. **packages/rate-limit tests** (no new deps needed)
5. **api-gateway consent tests** (requires Prisma mock setup)
6. **Wire logger into api-gateway** (replace console.error in index.ts + consent.ts)
7. **Wire logger into alerting** (setAlertErrorHandler)

---

## What's NOT in scope

- E2E tests (separate plan)
- OpenAPI/Swagger docs (separate plan)
- Structured logging for Next.js apps (separate: Next.js has its own logger)
- Sentry/Datadog account setup (template user responsibility)
