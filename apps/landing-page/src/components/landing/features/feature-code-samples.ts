/**
 * Per-group code samples shown in the feature detail page's main showcase.
 *
 * Each sample is a realistic usage snippet for a representative package in
 * the capability domain. Snippets are written so they could plausibly appear
 * in the project's docs — using real Nebutra package names and APIs.
 */

export type FeatureCodeSample = {
  filename: string;
  language: string;
  code: string;
  highlightedLines?: number[];
};

export const GROUP_CODE_SAMPLES: Record<string, FeatureCodeSample> = {
  ai: {
    filename: "agent.ts",
    language: "typescript",
    code: `import { Agent, tool } from "@nebutra/agents";
import { z } from "zod";

const agent = new Agent({
  model: "claude-sonnet-4-6",
  tools: {
    search: tool({
      description: "Search internal docs",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => searchDocs(query),
    }),
  },
});

const stream = await agent.stream({
  prompt: "Find Q4 revenue trends",
  maxSteps: 6,
});

for await (const event of stream) {
  console.log(event.type, event.data);
}`,
    highlightedLines: [4, 13],
  },

  iam: {
    filename: "audit.ts",
    language: "typescript",
    code: `import { logAudit } from "@nebutra/audit";
import { requirePermission } from "@nebutra/permissions";

export async function inviteUser(orgId: string, email: string) {
  await requirePermission("user.invite", { orgId });

  const invite = await createInvite({ orgId, email });

  await logAudit({
    actor: getCurrentActor(),
    action: "user.invite",
    target: { type: "user", id: invite.id },
    metadata: { email, expires: invite.expiresAt },
  });

  return invite;
}`,
    highlightedLines: [5, 9],
  },

  integrations: {
    filename: "queue.ts",
    language: "typescript",
    code: `import { getQueue, createJob } from "@nebutra/queue";

// Provider-agnostic: auto-detects QStash, BullMQ, or memory.
const queue = await getQueue();

await queue.enqueue(
  createJob("email", "send", {
    to: "user@example.com",
    template: "welcome",
  }, { tenantId: org.id }),
);

queue.registerHandler("email", "send", async (job) => {
  await sendEmail(job.data);
});`,
    highlightedLines: [4, 6],
  },

  platform: {
    filename: "query.ts",
    language: "typescript",
    code: `import { prisma } from "@nebutra/db";
import { getCurrentTenant } from "@nebutra/tenant";

// Tenant-scoped query — RLS enforced at the database layer.
const tenant = getCurrentTenant();

const posts = await prisma.post.findMany({
  where: {
    tenantId: tenant.tenantId,
    published: true,
  },
  orderBy: { publishedAt: "desc" },
  take: 10,
});`,
    highlightedLines: [5, 9],
  },

  design: {
    filename: "theme.css",
    language: "css",
    code: `@import "@nebutra/tokens/styles.css";

:root {
  --brand-primary: oklch(0.55 0.24 256);
  --brand-accent: oklch(0.85 0.18 175);
  --brand-gradient: linear-gradient(
    135deg,
    var(--brand-primary),
    var(--brand-accent)
  );
}

.cta {
  background: var(--brand-gradient);
  color: var(--neutral-1);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
}`,
    highlightedLines: [4, 5, 13],
  },

  commerce: {
    filename: "checkout.ts",
    language: "typescript",
    code: `import { createCheckoutSession } from "@nebutra/billing";

export async function POST(req: Request) {
  const { orgId, priceId } = await req.json();

  // Auto-routes to Stripe / Polar / LemonSqueezy / ChinaPay
  // depending on the tenant's configured provider.
  const session = await createCheckoutSession({
    customerId: orgId,
    priceId,
    successUrl: \`\${origin}/billing/success\`,
    cancelUrl: \`\${origin}/billing\`,
  });

  return Response.json({ url: session.url });
}`,
    highlightedLines: [8, 9, 10],
  },

  gateway: {
    filename: "router.ts",
    language: "typescript",
    code: `import { createApp } from "@nebutra/gateway-core";
import { tenancy, rateLimit, idempotency } from "@nebutra/gateway-core/middleware";

const app = createApp()
  .use(tenancy())
  .use(rateLimit({ rps: 100 }))
  .use(idempotency());

app.get("/v1/posts", async (c) => {
  const posts = await c.var.prisma.post.findMany({
    where: { tenantId: c.var.tenant.id },
  });
  return c.json({ posts });
});

export default app;`,
    highlightedLines: [5, 6, 7],
  },

  ops: {
    filename: "create-sailor.sh",
    language: "bash",
    code: `# Scaffold a new SaaS workspace
$ npx create-sailor my-saas
✔ Cloning template
✔ Installing dependencies (pnpm)
✔ Setting up environment
✔ Running database migrations
✔ Seeding initial data

Ready in 12.3s.

$ cd my-saas
$ pnpm dev:dashboard

  ➜ Dashboard:  http://localhost:3000
  ➜ Gateway:    http://localhost:8787`,
  },
};

export const DEFAULT_CODE_SAMPLE: FeatureCodeSample = GROUP_CODE_SAMPLES.platform;

export function getCodeSampleForGroup(group: string): FeatureCodeSample {
  return GROUP_CODE_SAMPLES[group] ?? DEFAULT_CODE_SAMPLE;
}
