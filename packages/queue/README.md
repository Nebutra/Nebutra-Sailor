> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/queue

Provider-agnostic message queue with support for **Upstash QStash** (serverless) and **BullMQ** (self-hosted Redis).

## Quick Start

```ts
import { getQueue, createJob } from "@nebutra/queue";

// Auto-detects provider from environment variables
const queue = await getQueue();

// Enqueue a job
await queue.enqueue(
  createJob("email", "send", { to: "user@example.com", template: "welcome" })
);

// Register a handler
queue.registerHandler("email", "send", async (job) => {
  await sendEmail(job.data.to, job.data.template);
});
```

## Provider Selection

The factory auto-detects the provider:

| Priority | Condition                     | Provider   |
|----------|-------------------------------|------------|
| 1        | `QUEUE_PROVIDER` env var set  | As specified |
| 2        | `QSTASH_TOKEN` exists         | `qstash`   |
| 3        | `REDIS_URL` exists            | `bullmq`   |
| 4        | Fallback                      | `memory`   |

## Environment Variables

### QStash

```env
QUEUE_PROVIDER="qstash"
QSTASH_TOKEN="your-qstash-token"
QSTASH_CALLBACK_BASE_URL="https://api.nebutra.com"
QSTASH_CURRENT_SIGNING_KEY="sig_..."
QSTASH_NEXT_SIGNING_KEY="sig_..."
```

### BullMQ

```env
QUEUE_PROVIDER="bullmq"
REDIS_URL="redis://localhost:6379"
```

## QStash Webhook Route

Mount the verification handler in your API:

```ts
import { createQStashWebhookHandler } from "@nebutra/queue";

// Hono
app.post("/api/queue/:queue/:type", async (c) => {
  const handler = createQStashWebhookHandler();
  return handler(c.req.raw);
});
```
