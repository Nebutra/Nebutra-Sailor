export type FeatureCodeSample = {
  filename: string;
  language: string;
  code: string;
  highlightedLines?: number[];
};

export const GROUP_CODE_SAMPLES: Record<string, FeatureCodeSample> = {
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
    code: `import { getTenantDb } from "@nebutra/db";
import { getCurrentTenant } from "@nebutra/tenant";

const tenant = getCurrentTenant();

// Row-level security scopes every query to the tenant.
const posts = await getTenantDb(tenant.tenantId).post.findMany({
  where: { published: true },
  orderBy: { publishedAt: "desc" },
  take: 10,
});`,
    highlightedLines: [7],
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
  customerId: org.stripeCustomerId,
  priceId: "price_pro_monthly",
  successUrl: \`\${origin}/billing/success\`,
  cancelUrl: \`\${origin}/billing\`,
});

return Response.redirect(session.url);`,
    highlightedLines: [3],
  },
};
