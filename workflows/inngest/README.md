# Inngest Workflows

Background jobs, cron tasks, and event-driven workflows powered by [Inngest](https://inngest.com).

## Workflows

| File                    | Schedule     | Description                     |
| ----------------------- | ------------ | ------------------------------- |
| `auto_translate.ts`     | On-demand    | AI-powered i18n translation     |
| `daily_digest_email.ts` | Daily 8 AM   | User notification emails        |
| `ecommerce_sync.ts`     | Every 15 min | Shopify/Shopline inventory sync |
| `recsys_refresh.ts`     | Daily 3 AM   | Recommendation model refresh    |
| `db_backup.ts`          | Daily 2 AM   | Database backup to R2           |

## Setup

### 1. Install Inngest Dev Server

```bash
# Via npm
npm install -g inngest-cli

# Or via brew
brew install inngest/tap/inngest
```

### 2. Start Dev Server

```bash
inngest dev
```

This starts the Inngest Dev Server at `http://localhost:8288`.

### 3. Register Functions

In your Next.js app, create the Inngest route handler:

```typescript
// apps/web/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { allFunctions } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
```

## Environment Variables

```bash
# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# For dev server
INNGEST_DEV=true
```

## Usage

### Trigger a workflow manually

```typescript
import { inngest } from "@/lib/inngest/client";

// Send an event
await inngest.send({
  name: "user/created",
  data: { userId: "123", email: "user@example.com" },
});
```

### Create a new workflow

```typescript
import { inngest } from "./client";

export const myWorkflow = inngest.createFunction(
  { id: "my-workflow" },
  { event: "my/event" },
  async ({ event, step }) => {
    // Step 1
    const result = await step.run("step-1", async () => {
      return doSomething();
    });

    // Step 2
    await step.run("step-2", async () => {
      return doSomethingElse(result);
    });
  },
);
```

## Production Deployment

1. Create account at [inngest.com](https://inngest.com)
2. Get your Event Key and Signing Key
3. Set environment variables in Vercel
4. Deploy your app

Inngest will automatically discover your functions via the `/api/inngest` endpoint.

## Related

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Next.js Guide](https://www.inngest.com/docs/quick-start/nextjs)
