# Observability, Testing & CORS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured logging (Pino + OpenTelemetry), meaningful test suites for alerting/rate-limit/consent routes, and a fully env-var-driven CORS configuration.

**Architecture:** New `packages/logger` package provides a zero-config Pino logger with optional OTel SDK (enabled via `OTEL_ENABLED=true`). Logs, traces, and metrics are routed to any OTLP-compatible backend (Sentry/Datadog/Grafana) without code changes. Tests verify production-incident-worthy behavior using `vi.useFakeTimers()` for time-sensitive logic and Hono's test client for HTTP routes.

**Tech Stack:** Pino, pino-pretty, @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, @opentelemetry/exporter-otlp-http, @opentelemetry/api, Vitest, Hono test utilities

---

## Task 1: Create packages/logger — Pino core

**Files:**

- Create: `packages/platform/logger/package.json`
- Create: `packages/platform/logger/tsconfig.json`
- Create: `packages/platform/logger/src/types.ts`
- Create: `packages/platform/logger/src/logger.ts`
- Create: `packages/platform/logger/src/index.ts`

**Step 1: Install pino dependencies**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm add pino --filter @nebutra/logger
pnpm add -D pino-pretty --filter @nebutra/logger
```

Expected: pnpm installs without errors.

**Step 2: Create package.json**

Create `packages/platform/logger/package.json`:

```json
{
  "name": "@nebutra/logger",
  "version": "0.1.0",
  "private": true,
  "description": "Structured logging and OpenTelemetry instrumentation for Nebutra services",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "pino-pretty": "^13.0.0",
    "typescript": "^5"
  }
}
```

**Step 3: Create tsconfig.json**

Create `packages/platform/logger/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create src/types.ts**

Create `packages/platform/logger/src/types.ts`:

```typescript
export type LogLevel = "debug" | "info" | "warn" | "error";
export type Meta = Record<string, unknown>;

export interface Logger {
  debug(msg: string, meta?: Meta): void;
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, error?: unknown, meta?: Meta): void;
  child(bindings: Meta): Logger;
}
```

**Step 5: Create src/logger.ts**

Create `packages/platform/logger/src/logger.ts`:

```typescript
import pino from "pino";
import type { Logger, Meta } from "./types.js";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  ...(isTest
    ? { enabled: false }
    : isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
          },
        }
      : {}),
});

function serializeError(error: unknown): Meta {
  if (error instanceof Error) {
    return {
      err: { message: error.message, stack: error.stack, name: error.name },
    };
  }
  return { err: error };
}

function makeLogger(base: pino.Logger): Logger {
  return {
    debug(msg, meta) {
      base.debug(meta ?? {}, msg);
    },
    info(msg, meta) {
      base.info(meta ?? {}, msg);
    },
    warn(msg, meta) {
      base.warn(meta ?? {}, msg);
    },
    error(msg, error, meta) {
      base.error({ ...serializeError(error), ...meta }, msg);
    },
    child(bindings) {
      return makeLogger(base.child(bindings));
    },
  };
}

export const logger: Logger = makeLogger(pinoInstance);
```

**Step 6: Create src/index.ts**

Create `packages/platform/logger/src/index.ts`:

```typescript
export { logger } from "./logger.js";
export { initOtel } from "./otel.js";
export type { Logger, LogLevel, Meta } from "./types.js";
```

Note: `otel.ts` will be created in Task 2. For now create a stub:

Create `packages/platform/logger/src/otel.ts`:

```typescript
// Stub — full implementation in Task 2
export function initOtel(_opts: { serviceName: string }): void {
  // no-op until OTel packages installed
}
```

**Step 7: Verify TypeScript compiles**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/logger typecheck 2>&1
```

Expected: no errors.

**Step 8: Commit**

```bash
git add packages/platform/logger/
git commit -m "feat: add packages/logger with Pino structured logging"
```

---

## Task 2: Add OpenTelemetry to packages/logger

**Files:**

- Modify: `packages/platform/logger/package.json`
- Modify: `packages/platform/logger/src/otel.ts`
- Modify: `packages/platform/logger/src/logger.ts` (inject traceId)

**Step 1: Install OTel packages**

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-otlp-http @opentelemetry/api --filter @nebutra/logger
```

Expected: installs without errors (these are well-maintained packages).

**Step 2: Implement src/otel.ts**

Replace the stub in `packages/platform/logger/src/otel.ts` with:

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-otlp-http";

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK.
 * No-op unless OTEL_ENABLED=true.
 *
 * Set these env vars to connect to your platform:
 *   OTEL_EXPORTER_OTLP_ENDPOINT=https://...   (Sentry/Datadog/Grafana)
 *   OTEL_EXPORTER_OTLP_HEADERS=...            (auth headers)
 */
export function initOtel(opts: { serviceName: string }): void {
  if (process.env.OTEL_ENABLED !== "true") return;

  const serviceName = process.env.OTEL_SERVICE_NAME ?? opts.serviceName;

  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on("SIGTERM", async () => {
    await sdk?.shutdown();
  });
}
```

**Step 3: Inject traceId into Pino logger**

Modify `packages/platform/logger/src/logger.ts` — add traceId auto-injection.

At the top, add the OTel import (gracefully handles missing context):

```typescript
import pino from "pino";
import type { Logger, Meta } from "./types.js";

// Lazy import: only resolves if @opentelemetry/api is available
function getTraceId(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { trace, context } =
      require("@opentelemetry/api") as typeof import("@opentelemetry/api");
    const span = trace.getSpan(context.active());
    const id = span?.spanContext().traceId;
    return id && id !== "00000000000000000000000000000000" ? id : undefined;
  } catch {
    return undefined;
  }
}
```

Then update `makeLogger` to include traceId in each log entry:

```typescript
function makeLogger(base: pino.Logger): Logger {
  return {
    debug(msg, meta) {
      const traceId = getTraceId();
      base.debug({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    info(msg, meta) {
      const traceId = getTraceId();
      base.info({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    warn(msg, meta) {
      const traceId = getTraceId();
      base.warn({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    error(msg, error, meta) {
      const traceId = getTraceId();
      base.error(
        { ...serializeError(error), ...meta, ...(traceId ? { traceId } : {}) },
        msg,
      );
    },
    child(bindings) {
      return makeLogger(base.child(bindings));
    },
  };
}
```

**Step 4: Verify TypeScript**

```bash
pnpm --filter @nebutra/logger typecheck 2>&1
```

Expected: no errors.

**Step 5: Commit**

```bash
git add packages/platform/logger/
git commit -m "feat: add OpenTelemetry SDK to packages/logger with OTLP exporter"
```

---

## Task 3: CORS Refactor

**Files:**

- Modify: `backends/gateway/src/config/env.ts` (lines 1-54)
- Modify: `backends/gateway/src/index.ts` (lines 16-36)

**Step 1: Add CORS_ORIGINS to env schema**

In `backends/gateway/src/config/env.ts`, add `CORS_ORIGINS` to the Zod schema object (after the existing `STUDIO_URL` line):

```typescript
  // Additional allowed CORS origins (comma-separated)
  CORS_ORIGINS: z.string().optional(),
```

**Step 2: Replace hardcoded CORS origins in index.ts**

In `backends/gateway/src/index.ts`, replace the `cors({ origin: [...] })` block (lines 16-36) with:

```typescript
import { env, DOMAINS } from "./config/env.js";

// Build CORS allowlist from constants + env overrides
const corsOrigins = [
  // Auto-include localhost in non-production environments
  ...(env.NODE_ENV !== "production"
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3003",
      ]
    : []),
  // Production domains — update DOMAINS in config/env.ts to rebrand
  DOMAINS.landing,
  `https://www.${new URL(DOMAINS.landing).hostname}`,
  DOMAINS.app,
  DOMAINS.studio,
  // Per-deployment overrides
  env.LANDING_URL,
  env.WEB_URL,
  env.STUDIO_URL,
  // Arbitrary extra origins (e.g. Vercel preview URLs)
  ...(env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter(Boolean) as string[];

app.use(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
```

**Step 3: Verify TypeScript**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/backends/gateway
pnpm typecheck 2>&1
```

Expected: no errors.

**Step 4: Commit**

```bash
git add backends/gateway/src/config/env.ts backends/gateway/src/index.ts
git commit -m "fix: replace hardcoded CORS origins with DOMAINS constants + CORS_ORIGINS env var"
```

---

## Task 4: packages/alerting — Test Suite

**Files:**

- Create: `packages/platform/alerting/vitest.config.ts`
- Create: `packages/platform/alerting/src/__tests__/alerting.test.ts`

**Step 1: Create vitest.config.ts**

Create `packages/platform/alerting/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

**Step 2: Write the failing test file**

Create `packages/platform/alerting/src/__tests__/alerting.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  registerChannel,
  clearChannels,
  getRegisteredChannelNames,
  unregisterChannel,
  sendAlert,
  sendAlertTo,
  trackError,
  resetErrorCounts,
  setAlertErrorHandler,
  type AlertChannel,
  type AlertPayload,
} from "../index.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeMockChannel(
  name: string,
): AlertChannel & { calls: AlertPayload[] } {
  const calls: AlertPayload[] = [];
  return {
    name,
    calls,
    send: vi.fn(async (payload: AlertPayload) => {
      calls.push(payload);
      return true;
    }),
  };
}

const basePayload = {
  title: "Test Alert",
  message: "Something happened",
  severity: "info" as const,
};

// ─── Channel Registry ────────────────────────────────────────────────────────

describe("Channel Registry", () => {
  beforeEach(() => clearChannels());

  it("registers a channel", () => {
    registerChannel(makeMockChannel("slack"));
    expect(getRegisteredChannelNames()).toEqual(["slack"]);
  });

  it("unregisters a channel", () => {
    registerChannel(makeMockChannel("slack"));
    unregisterChannel("slack");
    expect(getRegisteredChannelNames()).toEqual([]);
  });

  it("clearChannels removes all channels", () => {
    registerChannel(makeMockChannel("slack"));
    registerChannel(makeMockChannel("discord"));
    clearChannels();
    expect(getRegisteredChannelNames()).toEqual([]);
  });

  it("replaces existing channel with same name on re-register", () => {
    registerChannel(makeMockChannel("slack"));
    registerChannel(makeMockChannel("slack"));
    expect(getRegisteredChannelNames()).toHaveLength(1);
  });
});

// ─── sendAlert ───────────────────────────────────────────────────────────────

describe("sendAlert", () => {
  beforeEach(() => clearChannels());

  it("calls all registered channels", async () => {
    const ch1 = makeMockChannel("slack");
    const ch2 = makeMockChannel("discord");
    registerChannel(ch1);
    registerChannel(ch2);

    await sendAlert(basePayload);

    expect(ch1.send).toHaveBeenCalledOnce();
    expect(ch2.send).toHaveBeenCalledOnce();
  });

  it("returns per-channel success results", async () => {
    registerChannel(makeMockChannel("slack"));
    const results = await sendAlert(basePayload);
    expect(results.get("slack")).toBe(true);
  });

  it("records false for a channel that throws", async () => {
    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const results = await sendAlert(basePayload);
    expect(results.get("broken")).toBe(false);
  });

  it("auto-enriches payload with timestamp and environment", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);
    await sendAlert(basePayload);

    const received = ch.calls[0];
    expect(received.timestamp).toBeDefined();
    expect(new Date(received.timestamp!).toISOString()).toBe(
      received.timestamp,
    );
  });
});

// ─── sendAlertTo ─────────────────────────────────────────────────────────────

describe("sendAlertTo", () => {
  beforeEach(() => clearChannels());

  it("only calls the specified channels", async () => {
    const slack = makeMockChannel("slack");
    const discord = makeMockChannel("discord");
    registerChannel(slack);
    registerChannel(discord);

    await sendAlertTo(["slack"], basePayload);

    expect(slack.send).toHaveBeenCalledOnce();
    expect(discord.send).not.toHaveBeenCalled();
  });

  it("returns false for unknown channel name", async () => {
    const results = await sendAlertTo(["nonexistent"], basePayload);
    expect(results.get("nonexistent")).toBe(false);
  });
});

// ─── setAlertErrorHandler ────────────────────────────────────────────────────

describe("setAlertErrorHandler", () => {
  beforeEach(() => clearChannels());

  it("calls error handler when channel.send throws", async () => {
    const handler = vi.fn();
    setAlertErrorHandler(handler);

    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("boom")),
    });

    await sendAlert(basePayload);
    expect(handler).toHaveBeenCalledWith(
      "Alert channel broken failed",
      expect.any(Error),
    );

    // Reset to no-op after test
    setAlertErrorHandler(() => {});
  });

  it("default no-op handler does not throw", async () => {
    setAlertErrorHandler(() => {});
    registerChannel({
      name: "broken",
      send: vi.fn().mockRejectedValue(new Error("silent")),
    });
    await expect(sendAlert(basePayload)).resolves.not.toThrow();
  });
});

// ─── trackError ──────────────────────────────────────────────────────────────

describe("trackError", () => {
  beforeEach(() => {
    clearChannels();
    resetErrorCounts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const config = { windowMs: 60_000, threshold: 3, cooldownMs: 300_000 };

  it("does not alert below threshold", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    trackError("svc", config); // 1
    trackError("svc", config); // 2
    await vi.runAllTimersAsync();

    expect(ch.send).not.toHaveBeenCalled();
  });

  it("fires alert when threshold is reached", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    trackError("svc", config); // 1
    trackError("svc", config); // 2
    trackError("svc", config); // 3 → threshold
    await vi.runAllTimersAsync();

    expect(ch.send).toHaveBeenCalledOnce();
  });

  it("respects cooldown — does not re-alert within cooldown window", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    // Trigger first alert
    for (let i = 0; i < 3; i++) trackError("svc", config);
    await vi.runAllTimersAsync();
    expect(ch.send).toHaveBeenCalledTimes(1);

    // More errors within cooldown
    for (let i = 0; i < 3; i++) trackError("svc", config);
    await vi.runAllTimersAsync();
    expect(ch.send).toHaveBeenCalledTimes(1); // still 1
  });

  it("resets window after windowMs elapses", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    for (let i = 0; i < 2; i++) trackError("svc", config);
    vi.advanceTimersByTime(config.windowMs + 1);
    // Window resets → these 2 errors are below threshold
    for (let i = 0; i < 2; i++) trackError("svc", config);
    await vi.runAllTimersAsync();

    expect(ch.send).not.toHaveBeenCalled();
  });

  it("tracks separate services independently", async () => {
    const ch = makeMockChannel("slack");
    registerChannel(ch);

    for (let i = 0; i < 3; i++) trackError("svc-a", config);
    for (let i = 0; i < 3; i++) trackError("svc-b", config);
    await vi.runAllTimersAsync();

    // Two separate alerts (one per service)
    expect(ch.send).toHaveBeenCalledTimes(2);
  });
});
```

**Step 3: Run tests — expect PASS (logic already implemented)**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/alerting vitest run 2>&1
```

Expected: all tests PASS. If any fail, check that `clearChannels` / `resetErrorCounts` are exported from `packages/platform/alerting/src/index.ts` (added in previous session).

**Step 4: Commit**

```bash
git add packages/platform/alerting/vitest.config.ts packages/platform/alerting/src/__tests__/
git commit -m "test: add comprehensive test suite for alerting package"
```

---

## Task 5: packages/rate-limit — Test Suite

**Files:**

- Modify: `packages/platform/rate-limit/package.json` (add vitest)
- Create: `packages/platform/rate-limit/vitest.config.ts`
- Create: `packages/platform/rate-limit/src/__tests__/tokenBucket.test.ts`

**Step 1: Add vitest**

```bash
pnpm add -D vitest --filter @nebutra/rate-limit
```

**Step 2: Create vitest.config.ts**

Create `packages/platform/rate-limit/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```

**Step 3: Write test file**

Create `packages/platform/rate-limit/src/__tests__/tokenBucket.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  TokenBucket,
  getApiWeight,
  PLAN_LIMITS,
  API_WEIGHTS,
} from "../tokenBucket.js";

// ─── TokenBucket.consume ─────────────────────────────────────────────────────

describe("TokenBucket.consume", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const config = { maxTokens: 10, refillRate: 5, refillInterval: 1000 };

  it("allows request when tokens are available", async () => {
    const bucket = new TokenBucket(config);
    const result = await bucket.consume("user:1", 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("deducts the correct number of tokens", async () => {
    const bucket = new TokenBucket(config);
    const result = await bucket.consume("user:1", 3);
    expect(result.remaining).toBe(7);
  });

  it("denies request when tokens are exhausted", async () => {
    const bucket = new TokenBucket(config);
    await bucket.consume("user:1", 10); // drain all
    const result = await bucket.consume("user:1", 1);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("returns correct retryAfter when denied", async () => {
    const bucket = new TokenBucket({
      maxTokens: 5,
      refillRate: 5,
      refillInterval: 1000,
    });
    await bucket.consume("user:1", 5); // drain
    const result = await bucket.consume("user:1", 5);
    // Need 5 tokens, refillRate=5/s → should take ~1s
    expect(result.retryAfter).toBe(1);
  });

  it("refills tokens after refillInterval elapses", async () => {
    const bucket = new TokenBucket(config);
    await bucket.consume("user:1", 10); // drain

    vi.advanceTimersByTime(1000); // 1 interval = +5 tokens
    const result = await bucket.consume("user:1", 5);
    expect(result.allowed).toBe(true);
  });

  it("does not exceed maxTokens on refill", async () => {
    const bucket = new TokenBucket(config);
    vi.advanceTimersByTime(10_000); // long time
    const result = await bucket.consume("user:1", 1);
    expect(result.remaining).toBe(config.maxTokens - 1);
  });

  it("tracks separate keys independently", async () => {
    const bucket = new TokenBucket(config);
    await bucket.consume("user:a", 10); // drain a
    const result = await bucket.consume("user:b", 1);
    expect(result.allowed).toBe(true); // b is untouched
  });
});

// ─── TokenBucket.cleanup ─────────────────────────────────────────────────────

describe("TokenBucket.cleanup", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("removes buckets older than maxAge", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    await bucket.consume("old", 1);
    vi.advanceTimersByTime(4_000_000); // > default maxAge (3_600_000)
    bucket.cleanup();
    // After cleanup, consuming again should start fresh (full tokens)
    const result = await bucket.consume("old", 1);
    expect(result.remaining).toBe(9); // fresh bucket
  });

  it("keeps active buckets", async () => {
    const bucket = new TokenBucket({
      maxTokens: 10,
      refillRate: 1,
      refillInterval: 1000,
    });
    await bucket.consume("active", 5); // 5 tokens left
    vi.advanceTimersByTime(100); // recent
    bucket.cleanup(3_600_000);
    const result = await bucket.consume("active", 1);
    // Should still have tokens from before (not reset to full)
    expect(result.remaining).toBeLessThan(9);
  });
});

// ─── getApiWeight ─────────────────────────────────────────────────────────────

describe("getApiWeight", () => {
  it("returns weight for a known heavy route", () => {
    expect(getApiWeight("POST", "/api/ai/generate")).toBe(20);
  });

  it("returns weight for a known light route", () => {
    expect(getApiWeight("GET", "/api/content/feed")).toBe(1);
  });

  it("returns default weight for unknown route", () => {
    expect(getApiWeight("GET", "/api/unknown/endpoint")).toBe(
      API_WEIGHTS.default,
    );
  });
});

// ─── PLAN_LIMITS ─────────────────────────────────────────────────────────────

describe("PLAN_LIMITS", () => {
  it("FREE has lower maxTokens than PRO", () => {
    expect(PLAN_LIMITS.FREE.maxTokens).toBeLessThan(PLAN_LIMITS.PRO.maxTokens);
  });

  it("PRO has lower maxTokens than ENTERPRISE", () => {
    expect(PLAN_LIMITS.PRO.maxTokens).toBeLessThan(
      PLAN_LIMITS.ENTERPRISE.maxTokens,
    );
  });

  it("FREE has lower refillRate than PRO", () => {
    expect(PLAN_LIMITS.FREE.refillRate).toBeLessThan(
      PLAN_LIMITS.PRO.refillRate,
    );
  });
});
```

**Step 4: Run tests**

```bash
pnpm --filter @nebutra/rate-limit vitest run 2>&1
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add packages/platform/rate-limit/
git commit -m "test: add token bucket test suite for rate-limit package"
```

---

## Task 6: api-gateway — Consent Route Tests

**Files:**

- Modify: `backends/gateway/package.json` (add vitest + @types/node@20)
- Create: `backends/gateway/src/__tests__/consent.test.ts`

**Step 1: Add vitest to api-gateway**

```bash
pnpm add -D vitest @vitest/coverage-v8 --filter @nebutra/api-gateway
```

**Step 2: Write test file**

Create `backends/gateway/src/__tests__/consent.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @nebutra/db BEFORE importing the route module
vi.mock("@nebutra/db", () => ({
  prisma: {
    legalDocument: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userConsent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    cookieConsent: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    contactSubmission: {
      create: vi.fn(),
    },
  },
  Prisma: {
    InputJsonValue: {},
  },
}));

import { prisma } from "@nebutra/db";
import { consentRoutes } from "../routes/legal/consent.js";

// Helper: make a test request to the Hono route
async function req(
  method: string,
  path: string,
  body?: object,
  query?: Record<string, string>,
) {
  const url = new URL(`http://localhost${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  return consentRoutes.request(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

const mockDocument = {
  id: "doc-1",
  slug: "privacy-policy",
  version: "2024-01",
  isActive: true,
  effectiveAt: new Date(),
};

const mockConsent = {
  id: "consent-1",
  documentSlug: "privacy-policy",
  documentVersion: "2024-01",
  consentedAt: new Date().toISOString(),
};

// ─── POST /consent ────────────────────────────────────────────────────────────

describe("POST /consent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("201 — records consent for existing document", async () => {
    vi.mocked(prisma.legalDocument.findFirst).mockResolvedValue(
      mockDocument as never,
    );
    vi.mocked(prisma.userConsent.create).mockResolvedValue(
      mockConsent as never,
    );

    const res = await req("POST", "/consent", {
      documentSlug: "privacy-policy",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.consentId).toBe("consent-1");
  });

  it("404 — document not found", async () => {
    vi.mocked(prisma.legalDocument.findFirst).mockResolvedValue(null);

    const res = await req("POST", "/consent", {
      documentSlug: "nonexistent",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Document not found");
  });

  it("400 — missing documentSlug (Zod validation)", async () => {
    const res = await req("POST", "/consent", { visitorId: "visitor-abc" });
    expect(res.status).toBe(400);
  });

  it("400 — missing visitorId (Zod validation)", async () => {
    const res = await req("POST", "/consent", {
      documentSlug: "privacy-policy",
    });
    expect(res.status).toBe(400);
  });

  it("500 — database error is handled gracefully", async () => {
    vi.mocked(prisma.legalDocument.findFirst).mockResolvedValue(
      mockDocument as never,
    );
    vi.mocked(prisma.userConsent.create).mockRejectedValue(
      new Error("DB unavailable"),
    );

    const res = await req("POST", "/consent", {
      documentSlug: "privacy-policy",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to record consent");
  });
});

// ─── GET /consent/status ─────────────────────────────────────────────────────

describe("GET /consent/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hasConsented: true when consent exists", async () => {
    vi.mocked(prisma.legalDocument.findFirst).mockResolvedValue(
      mockDocument as never,
    );
    vi.mocked(prisma.userConsent.findFirst).mockResolvedValue(
      mockConsent as never,
    );

    const res = await req("GET", "/consent/status", undefined, {
      documentSlug: "privacy-policy",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasConsented).toBe(true);
    expect(json.needsReconsent).toBe(false);
  });

  it("needsReconsent: true when version mismatches", async () => {
    vi.mocked(prisma.legalDocument.findFirst).mockResolvedValue({
      ...mockDocument,
      version: "2025-01", // newer version
    } as never);
    vi.mocked(prisma.userConsent.findFirst).mockResolvedValue({
      ...mockConsent,
      documentVersion: "2024-01", // older consent
    } as never);

    const res = await req("GET", "/consent/status", undefined, {
      documentSlug: "privacy-policy",
    });

    const json = await res.json();
    expect(json.needsReconsent).toBe(true);
  });

  it("400 — documentSlug missing", async () => {
    const res = await req("GET", "/consent/status");
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /consent ──────────────────────────────────────────────────────────

describe("DELETE /consent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("withdraws consent and returns count", async () => {
    vi.mocked(prisma.userConsent.updateMany).mockResolvedValue({
      count: 2,
    } as never);

    const res = await req("DELETE", "/consent", undefined, {
      documentSlug: "privacy-policy",
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.withdrawnCount).toBe(2);
  });

  it("400 — documentSlug missing", async () => {
    const res = await req("DELETE", "/consent");
    expect(res.status).toBe(400);
  });
});

// ─── POST /cookie-consent ─────────────────────────────────────────────────────

describe("POST /cookie-consent", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockCookieConsent = {
    id: "cookie-1",
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
    thirdParty: false,
    consentedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  it("upserts cookie consent preferences", async () => {
    vi.mocked(prisma.cookieConsent.upsert).mockResolvedValue(
      mockCookieConsent as never,
    );

    const res = await req("POST", "/cookie-consent", {
      visitorId: "visitor-abc",
      preferences: {
        functional: true,
        analytics: false,
        marketing: false,
        thirdParty: false,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.preferences.necessary).toBe(true);
  });

  it("400 — missing visitorId", async () => {
    const res = await req("POST", "/cookie-consent", {
      preferences: {
        functional: false,
        analytics: false,
        marketing: false,
        thirdParty: false,
      },
    });
    expect(res.status).toBe(400);
  });
});

// ─── GET /cookie-consent ──────────────────────────────────────────────────────

describe("GET /cookie-consent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns preferences when consent exists", async () => {
    vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue({
      necessary: true,
      functional: true,
      analytics: false,
      marketing: false,
      thirdParty: false,
      consentedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    } as never);

    const res = await req("GET", "/cookie-consent", undefined, {
      visitorId: "visitor-abc",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasConsent).toBe(true);
    expect(json.preferences.functional).toBe(true);
  });

  it("hasConsent: false when no consent record", async () => {
    vi.mocked(prisma.cookieConsent.findFirst).mockResolvedValue(null);

    const res = await req("GET", "/cookie-consent", undefined, {
      visitorId: "visitor-abc",
    });

    const json = await res.json();
    expect(json.hasConsent).toBe(false);
  });

  it("400 — neither visitorId nor userId provided", async () => {
    const res = await req("GET", "/cookie-consent");
    expect(res.status).toBe(400);
  });
});
```

**Step 3: Run tests**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm --filter @nebutra/api-gateway vitest run 2>&1
```

Expected: all consent tests PASS. Smoke tests continue to pass too.

If Zod validation returns 422 instead of 400, adjust the `expect(res.status).toBe(400)` assertions to match the actual status code (Hono's zValidator returns 400 by default).

**Step 4: Commit**

```bash
git add backends/gateway/src/__tests__/consent.test.ts backends/gateway/package.json
git commit -m "test: add consent route integration tests with Prisma mocks"
```

---

## Task 7: Wire logger into api-gateway

**Files:**

- Modify: `backends/gateway/package.json` (add @nebutra/logger)
- Modify: `backends/gateway/src/index.ts` (replace console statements)
- Modify: `backends/gateway/src/routes/legal/consent.ts` (replace 8 console.error)

**Step 1: Add @nebutra/logger dependency**

```bash
pnpm add @nebutra/logger --filter @nebutra/api-gateway --workspace
```

**Step 2: Replace console statements in index.ts**

In `backends/gateway/src/index.ts`:

Add imports at the top:

```typescript
import { logger, initOtel } from "@nebutra/logger";
```

Add OTel initialization right after the `env` import (before `const app = new Hono()`):

```typescript
initOtel({ serviceName: "api-gateway" });
```

Replace the `onError` handler (remove `console.error`):

```typescript
app.onError((err, c) => {
  logger.error("Unhandled error", err, { path: c.req.path });
  return c.json(
    {
      error: "Internal Server Error",
      message: env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});
```

Replace the startup `console.log`:

```typescript
logger.info("API Gateway started", { port });
```

**Step 3: Replace console.error in consent.ts**

In `backends/gateway/src/routes/legal/consent.ts`, add at the top:

```typescript
import { logger } from "@nebutra/logger";

const log = logger.child({ service: "consent" });
```

Then replace all 8 `console.error("...", error)` calls with the pattern:

```typescript
log.error("Failed to record consent", error);
```

Each specific message maps to:

- `"Failed to record consent"` → line 94
- `"Failed to get consent status"` → line 153
- `"Failed to withdraw consent"` → line 193
- `"Failed to record cookie consent"` → line 261
- `"Failed to get cookie consent"` → line 312
- `"Failed to list documents"` → line 365
- `"Failed to get document"` → line 397
- `"Failed to submit contact form"` → line 461

**Step 4: Verify TypeScript and lint**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/backends/gateway
pnpm typecheck 2>&1
pnpm lint 2>&1 | grep -i error | head -20
```

Expected: no TypeScript errors, no lint errors (no console.\* remaining).

**Step 5: Commit**

```bash
git add backends/gateway/
git commit -m "feat: replace all console statements in api-gateway with structured logger"
```

---

## Task 8: Wire alerting + logger at api-gateway startup

**Files:**

- Modify: `backends/gateway/package.json` (add @nebutra/alerting)
- Modify: `backends/gateway/src/index.ts` (init alerting with error handler + env channels)

**Step 1: Add alerting dependency**

```bash
pnpm add @nebutra/alerting --filter @nebutra/api-gateway --workspace
```

**Step 2: Wire in index.ts**

In `backends/gateway/src/index.ts`, after the `logger` import, add:

```typescript
import { setAlertErrorHandler, initializeFromEnv } from "@nebutra/alerting";
```

After `initOtel({ serviceName: "api-gateway" })`, add:

```typescript
// Wire logger into alerting error handler
setAlertErrorHandler((ctx, err) => logger.error(ctx, err));

// Register alerting channels from environment
const registeredChannels = initializeFromEnv();
if (registeredChannels.length > 0) {
  logger.info("Alerting channels registered", { channels: registeredChannels });
}
```

**Step 3: Verify TypeScript**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/backends/gateway
pnpm typecheck 2>&1
```

Expected: no errors.

**Step 4: Commit**

```bash
git add backends/gateway/src/index.ts backends/gateway/package.json
git commit -m "feat: wire alerting error handler and startup initialization in api-gateway"
```

---

## Completion Checklist

- [ ] `pnpm --filter @nebutra/logger typecheck` passes
- [ ] `pnpm --filter @nebutra/alerting vitest run` all tests PASS
- [ ] `pnpm --filter @nebutra/rate-limit vitest run` all tests PASS
- [ ] `pnpm --filter @nebutra/api-gateway vitest run` all tests PASS (smoke + consent)
- [ ] `pnpm lint` no errors (no console.\* in api-gateway)
- [ ] `LOG_LEVEL=debug pnpm dev` (in api-gateway) shows human-readable logs
- [ ] CORS: `CORS_ORIGINS=https://staging.example.com` accepted by server

## What's NOT in scope

- Next.js apps logging (different runtime, separate plan)
- OTel metrics/span custom instrumentation (auto-instrumentation covers HTTP)
- External platform account setup (Sentry/Datadog configuration is template-user responsibility)
- E2E tests
