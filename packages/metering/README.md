> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/metering

Provider-agnostic usage metering and billing pipeline for consumption-based SaaS billing.

## Overview

`@nebutra/metering` provides a unified API for recording, aggregating, and querying usage events across multiple backend providers. It's designed for high-throughput environments and supports both real-time queries and historical analytics.

### Supported Providers

- **ClickHouse** — Production analytics database (already in Nebutra stack)
- **Memory** — In-memory storage for local development and testing

## Installation

```bash
pnpm add @nebutra/metering
```

## Quick Start

### Basic Usage

```typescript
import { getMetering, API_CALLS } from "@nebutra/metering";

// Get or create the metering provider (auto-detects backend)
const metering = await getMetering();

// Register a meter definition
await metering.defineMeter(API_CALLS);

// Ingest usage events
await metering.ingest({
  meterId: "api_calls",
  tenantId: "org_123",
  value: 1,
  properties: {
    endpoint: "/v1/chat",
    method: "POST",
  },
});

// Query usage
const usage = await metering.getUsage("org_123", "api_calls", "monthly");
console.log(usage.value); // 42

// Set and check quotas
await metering.setQuota("org_123", "api_calls", 10000, "monthly");
const quota = await metering.getQuota("org_123", "api_calls", "monthly");
console.log(quota.percentage); // 0.42%
```

### High-Throughput Batching

For high-volume events, use batch ingestion:

```typescript
const events = [
  {
    meterId: "api_calls",
    tenantId: "org_123",
    value: 1,
    properties: { endpoint: "/v1/chat" },
  },
  {
    meterId: "api_calls",
    tenantId: "org_456",
    value: 1,
    properties: { endpoint: "/v1/images" },
  },
];

await metering.ingestBatch(events);
```

### Hono Middleware

Automatically meter all API calls:

```typescript
import { Hono } from "hono";
import { getMetering } from "@nebutra/metering";
import { meterApiCall } from "@nebutra/metering";

const app = new Hono();
const metering = await getMetering();

// Register middleware to meter all requests
app.use("*", meterApiCall("api_calls", metering));

app.get("/api/data", (c) => {
  // This request is automatically metered
  return c.json({ ok: true });
});
```

### Manual Operation Metering

Record specific operations within request handlers:

```typescript
import { meterOperation } from "@nebutra/metering";

const recordTokenUsage = meterOperation("ai_tokens");

app.post("/api/chat", async (c) => {
  const metering = await getMetering();
  const tenantId = c.get("tenantId");

  const response = await callAI("gpt-4", prompt);

  await recordTokenUsage(metering, tenantId, response.tokens, {
    model: "gpt-4",
    endpoint: "/api/chat",
  });

  return c.json(response);
});
```

## Standard Meters

Pre-configured meter definitions for common SaaS scenarios:

```typescript
import {
  API_CALLS,        // Requests — counter/sum
  AI_TOKENS,        // Token consumption — counter/sum
  STORAGE_BYTES,    // Storage usage — gauge/max
  ACTIVE_USERS,     // Unique users — unique_count/count_distinct
  BANDWIDTH,        // Data transfer — counter/sum
  REQUEST_LATENCY,  // Latencies — histogram/max
  COMPUTATION_TIME, // CPU/GPU time — counter/sum
  DB_OPERATIONS,    // Database ops — counter/count
  EMAIL_MESSAGES,   // Emails sent — counter/count
  WEBHOOKS_FIRED,   // Webhook invocations — counter/count
} from "@nebutra/metering";

// Register all standard meters
for (const meter of [API_CALLS, AI_TOKENS, STORAGE_BYTES, ...]) {
  await metering.defineMeter(meter);
}
```

## Custom Meters

Define custom meters for your use case:

```typescript
import { MeterDefinition } from "@nebutra/metering";

const customMeter: MeterDefinition = {
  id: "custom_metric",
  name: "Custom Metric",
  type: "counter",
  description: "My custom metric",
  unit: "items",
  aggregation: "sum",
};

await metering.defineMeter(customMeter);
```

### Meter Types

- **counter** — Cumulative count (e.g., API calls, total tokens)
- **gauge** — Point-in-time measurement (e.g., current storage usage)
- **histogram** — Distribution of values (e.g., request latencies)
- **unique_count** — Count of unique identifiers (e.g., active users)

### Aggregation Functions

- **sum** — Total across period
- **max** — Maximum value in period
- **count** — Count of events
- **count_distinct** — Count of unique identifiers

## Usage Queries

### Current Period Usage

```typescript
const usage = await metering.getUsage(tenantId, meterId, "monthly");
// Returns: { meterId, tenantId, periodStart, periodEnd, value, breakdown? }
```

### Historical Usage

```typescript
const history = await metering.getUsageHistory(tenantId, meterId, {
  period: "daily",
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-01-31T23:59:59Z",
});
// Returns: UsageSummary[]
```

### Usage Breakdown

Get usage breakdown by dimension:

```typescript
const byEndpoint = await metering.getBreakdown(
  tenantId,
  "api_calls",
  "endpoint",
  "daily"
);
// Returns: { "/v1/chat": 1500, "/v1/images": 800, ... }
```

## Quota Management

### Set Quota

```typescript
await metering.setQuota(tenantId, meterId, limit, period);
// period: "hourly" | "daily" | "monthly"
```

### Check Quota

```typescript
const quota = await metering.getQuota(tenantId, meterId, "monthly");
// Returns: {
//   meterId, tenantId, limit, used, remaining, percentage, period,
//   periodStart, periodEnd
// }
```

### Threshold Alerts

Check if usage exceeds a threshold:

```typescript
const alert = await metering.checkThreshold(
  tenantId,
  meterId,
  0.8, // 80% of quota
  "monthly"
);
// Returns: ThresholdAlert | null
```

## Provider Configuration

### Auto-Detection

By default, the factory detects the provider based on environment variables:

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `METERING_PROVIDER` env var | As specified |
| 2 | `CLICKHOUSE_HTTP_URL` exists | `clickhouse` |
| 3 | Fallback | `memory` |

### Explicit Configuration

```typescript
// ClickHouse
const metering = await createMetering({
  provider: "clickhouse",
  httpUrl: "http://localhost:8123",
  username: "default",
  password: "password",
  database: "default",
  batchSize: 1000,
  flushIntervalMs: 5000,
});

// Memory (dev/test)
const metering = await createMetering({
  provider: "memory",
});
```

### Environment Variables

```env
# Provider selection
METERING_PROVIDER=clickhouse|memory

# ClickHouse
CLICKHOUSE_HTTP_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

## Architecture

### ClickHouse Backend

- **Table**: `nebutra_usage_events` (ReplacingMergeTree)
- **Partitioning**: Monthly by timestamp
- **Ordering**: tenant_id, meter_id, timestamp
- **Batch Ingestion**: JSONEachRow format
- **Idempotency**: ReplacingMergeTree with version field
- **Aggregation**: Native ClickHouse functions (sumIf, countIf, etc.)

### Memory Backend

- In-memory array-based storage
- Simple aggregation helpers
- Useful for unit tests and local development
- NOT suitable for production

## Best Practices

### 1. Define Meters Early

Define all meters your application uses at startup:

```typescript
const metering = await getMetering();

for (const meter of [API_CALLS, AI_TOKENS, STORAGE_BYTES]) {
  await metering.defineMeter(meter);
}
```

### 2. Use Dimensions

Include dimensions in properties for better breakdown analysis:

```typescript
await metering.ingest({
  meterId: "api_calls",
  tenantId: "org_123",
  value: 1,
  properties: {
    endpoint: "/v1/chat",
    method: "POST",
    model: "gpt-4",
    region: "us-west-2",
  },
});
```

### 3. Batch High-Volume Events

For high-throughput scenarios, collect events and batch insert:

```typescript
const batch: UsageEvent[] = [];

for (const event of events) {
  batch.push(event);
  if (batch.length >= 1000) {
    await metering.ingestBatch(batch);
    batch.length = 0;
  }
}

if (batch.length > 0) {
  await metering.ingestBatch(batch);
}
```

### 4. Handle Errors Gracefully

Metering failures should not block the main application:

```typescript
try {
  await metering.ingest(event);
} catch (error) {
  logger.error("Failed to record usage", { error });
  // Application continues normally
}
```

### 5. Use Idempotency Keys

For critical operations, use idempotency keys to prevent double-counting:

```typescript
await metering.ingest({
  meterId: "api_calls",
  tenantId: "org_123",
  value: 1,
  idempotencyKey: `api_call_${requestId}`,
});
```

## Testing

In tests, use the memory provider:

```typescript
import { setMetering, MemoryProvider } from "@nebutra/metering";

beforeEach(() => {
  const memory = new MemoryProvider();
  setMetering(memory);
});

it("records usage", async () => {
  const metering = await getMetering();
  await metering.ingest({
    meterId: "api_calls",
    tenantId: "test_tenant",
    value: 1,
  });

  const usage = await metering.getUsage("test_tenant", "api_calls", "daily");
  expect(usage?.value).toBe(1);
});
```

## Development

```bash
# Type check
pnpm --filter @nebutra/metering typecheck

# Build
pnpm --filter @nebutra/metering build
```

## License

Proprietary — Nebutra, Inc.
