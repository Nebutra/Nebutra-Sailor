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
    filename: "permissions.ts",
    language: "typescript",
    code: `import { ability } from "@nebutra/permissions";
import { requirePermission } from "@nebutra/permissions/server";

await requirePermission("user.invite", { orgId });

const can = ability(currentUser);
if (can("delete", "Project", project)) {
  await deleteProject(project.id);
}`,
    highlightedLines: [3, 6],
  },

  integrations: {
    filename: "queue.ts",
    language: "typescript",
    code: `import { getQueue, createJob } from "@nebutra/queue";

const queue = await getQueue();

await queue.enqueue(
  createJob("email", "send", {
    to: "user@example.com",
    template: "welcome",
  }, { tenantId: org.id }),
);`,
    highlightedLines: [3, 5],
  },

  platform: {
    filename: "platform.ts",
    language: "typescript",
    code: `import { prisma } from "@nebutra/db";
import { getCurrentTenant } from "@nebutra/tenant";

const tenant = getCurrentTenant();

const posts = await prisma.post.findMany({
  where: { tenantId: tenant.tenantId, published: true },
  orderBy: { publishedAt: "desc" },
  take: 10,
});`,
    highlightedLines: [3, 6],
  },

  design: {
    filename: "theme.css",
    language: "css",
    code: `@import "@nebutra/tokens/styles.css";

.cta {
  background: hsl(var(--primary));
  color: var(--neutral-1);
  border-radius: var(--radius-md);
  padding: 0.75rem 1.25rem;
}`,
    highlightedLines: [3, 4],
  },

  commerce: {
    filename: "checkout.ts",
    language: "typescript",
    code: `import { createCheckoutSession } from "@nebutra/billing";

const session = await createCheckoutSession({
  customerId: orgId,
  priceId: "price_pro_monthly",
  successUrl: \`\${origin}/billing/success\`,
});

return Response.redirect(session.url);`,
    highlightedLines: [2],
  },

  gateway: {
    filename: "router.ts",
    language: "typescript",
    code: `import { createApp } from "@nebutra/gateway-core";
import { tenancy, rateLimit } from "@nebutra/gateway-core/middleware";

const app = createApp()
  .use(tenancy())
  .use(rateLimit({ rps: 100 }));

app.get("/v1/posts", async (c) => {
  return c.json({ tenant: c.var.tenant.id });
});`,
    highlightedLines: [3, 4, 5],
  },

  ops: {
    filename: "create-sailor.sh",
    language: "bash",
    code: `$ npx create-sailor my-saas
✔ Cloning template
✔ Installing dependencies
✔ Setting up environment
✔ Running database migrations

Ready in 12.3s.

$ cd my-saas && pnpm dev:dashboard`,
  },
};

export const DEFAULT_GROUP_CODE_SAMPLE: FeatureCodeSample = GROUP_CODE_SAMPLES.platform;

export function getCodeSampleForGroup(group: string): FeatureCodeSample {
  return GROUP_CODE_SAMPLES[group] ?? DEFAULT_GROUP_CODE_SAMPLE;
}
