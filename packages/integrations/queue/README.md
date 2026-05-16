> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. The in-memory provider exposes a test-only dead-letter queue, BullMQ exposes retry-exhausted failed jobs, and QStash can map records returned by an injected DLQ fetcher into the shared dead-letter contract.

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

## Queuebase-style Jobs

`@nebutra/queue` also exposes a Queuebase-compatible job layer for app-owned
background jobs: define typed jobs with Zod input, enqueue through a typed
client, and execute callbacks through a single webhook route.

```ts
import {
  createJobClient,
  createJobRouter,
  createQueuebaseWebhookHandler,
  defineQueueJob,
} from "@nebutra/queue";
import { z } from "zod";

export const jobs = createJobRouter({
  sendWelcomeEmail: defineQueueJob({
    input: z.object({ to: z.string().email(), name: z.string() }),
    defaults: { retries: 3, backoff: "exponential" },
    handler: async ({ input, jobId, attempt }) => {
      await sendWelcomeEmail(input.to, input.name, { jobId, attempt });
      return { sent: true };
    },
  }),
  dailyCleanup: defineQueueJob({
    input: z.object({}),
    schedule: { cron: "0 2 * * *", timezone: "UTC", overlap: "skip" },
    handler: async () => ({ cleaned: true }),
  }),
});

export const jobClient = createJobClient(jobs, {
  callbackUrl: "https://app.nebutra.com/api/webhooks/queuebase",
});

export const webhookHandler = createQueuebaseWebhookHandler(jobs);
```

The default Nebutra web app mounts `queuebaseWebhookHandler` at
`/api/webhooks/queuebase`. `queuebaseJobClient` uses:

- `QUEUEBASE_API_URL`, defaulting to `http://localhost:3847`
- `QUEUEBASE_API_KEY`, required by hosted Queuebase
- `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL`, or `PORT` to derive the callback URL

Local development mirrors Queuebase's callback model:

```bash
# Terminal 1: Queuebase-compatible dev server / sync process
npx queuebase dev

# Terminal 2: Nebutra app
pnpm dev:web
```

For production, set the env vars on the host and run the provider sync step
after deployment configuration changes:

```bash
npx queuebase sync
```

Use `listQueuebaseSchedules(queuebaseJobs)` to inspect schedule metadata for
sync tooling without executing handlers.

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

## Failure Observability

Providers may expose `getDeadLetteredJobs(queue?)` for jobs that exhausted retries and need operator attention. The memory provider implements this for deterministic tests and local harnesses. The BullMQ provider maps durable failed jobs whose attempts are exhausted into the same contract, including the original payload, attempt count, configured retry limit, failure reason, and `failedAt` timestamp.

For QStash, pass an injected `dlqFetcher` and optional `dlqEndpoint`; this package does not assume unstable provider SDK DLQ APIs. The fetcher returns provider-side records, and the provider maps records whose body is the original `JobPayload` into `DeadLetterJob`. Fetcher errors fail closed to `[]` and are logged.
