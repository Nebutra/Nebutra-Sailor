/**
 * Code samples shown in the feature detail page main showcase.
 *
 * A package page shows PACKAGE_CODE_SAMPLES[slug]; a domain page shows
 * GROUP_CODE_SAMPLES[group]. Nothing is synthesized.
 */

import type { FeatureCodeSample } from "./feature-group-code-samples";
import { GROUP_CODE_SAMPLES } from "./feature-group-code-samples";
import type { PackageFeatureEntry } from "./package-feature-data";

export type { FeatureCodeSample } from "./feature-group-code-samples";
export { GROUP_CODE_SAMPLES } from "./feature-group-code-samples";

// ─────────────────────────────────────────────────────────────────────────
// Per-package curated samples — these are the differentiated, real-feeling
// snippets that make each package page distinct.
// ─────────────────────────────────────────────────────────────────────────

const ts = (filename: string, code: string, highlightedLines?: number[]): FeatureCodeSample => ({
  filename,
  language: "typescript",
  code,
  highlightedLines,
});

export const PACKAGE_CODE_SAMPLES: Record<string, FeatureCodeSample> = {
  // ─── ai ────────────────────────────────────────────────────────────

  agents: ts(
    "agents.ts",
    `import { generateText, streamText, embed } from "@nebutra/agents";

// One unified surface — providers swap via env / config.
const { text } = await generateText({
  model: "anthropic/claude-sonnet-5",
  prompt: "Summarize this support ticket in 3 bullets.",
  system: "You are a senior support engineer.",
});

const { embedding } = await embed({
  model: "openai/text-embedding-3-large",
  value: ticket.body,
});`,
    [4, 11],
  ),

  // ─── iam ──────────────────────────────────────────────────────────

  vault: ts(
    "vault.ts",
    `import { getVault } from "@nebutra/vault";

const vault = await getVault();

// Envelope encryption — AWS KMS unwraps the DEK per-record.
const encrypted = await vault.encrypt(secretKey, {
  tenantId: org.id,
  metadata: { name: "OpenAI API Key", type: "api_key" },
});

const plaintext = await vault.decrypt(encrypted);`,
    [5, 6],
  ),

  // ─── integrations ─────────────────────────────────────────────────
  queue: ts(
    "queue.ts",
    `import { getQueue, createJob } from "@nebutra/queue";

// QStash in production; falls back to in-memory when no env is set.
const queue = await getQueue();

await queue.enqueue(
  createJob("billing", "send-invoice", { orderId: order.id }, { tenantId }),
);

queue.registerHandler("billing", "send-invoice", async (job) => {
  await sendInvoice(job.data.orderId);
});`,
    [3, 6],
  ),

  search: ts(
    "search.ts",
    `import { getSearch } from "@nebutra/search";

// Postgres pgvector + full-text — no separate search cluster to run.
const search = await getSearch();

await search.indexDocument("posts", {
  id: post.id,
  title: post.title,
  body: post.body,
  tenantId: post.tenantId,
});

const results = await search.search("posts", {
  query: "billing migration",
  tenantId: org.id,
});`,
    [4, 12],
  ),

  notifications: ts(
    "notifications.ts",
    `import { getNotificationProvider } from "@nebutra/notifications";

const notifications = await getNotificationProvider();

await notifications.send({
  id: crypto.randomUUID(),
  type: "invoice.paid",
  recipientId: user.id,
  tenantId: org.id,
  channels: ["in_app", "email"],
  data: { amount: invoice.total, currency: invoice.currency },
});`,
    [5, 10],
  ),

  webhooks: ts(
    "webhooks.ts",
    `import { getWebhooks } from "@nebutra/webhooks";

const webhooks = await getWebhooks();

await webhooks.sendEvent({
  id: crypto.randomUUID(),
  eventType: "user.created",
  payload: { userId: user.id, email: user.email },
  timestamp: new Date().toISOString(),
  tenantId: org.id,
});`,
    [5, 6],
  ),

  uploads: ts(
    "uploads.ts",
    `import { getUploadProvider } from "@nebutra/uploads";

const uploads = await getUploadProvider();

// Small file — presigned PUT.
const { url, headers } = await uploads.createPresignedUpload({
  bucket: "nebutra-uploads",
  key: \`docs/\${file.name}\`,
  contentType: file.type,
  tenantId: org.id,
});

// Large file — resumable multipart.
const mp = await uploads.createMultipartUpload({ bucket, key }, 10);`,
    [5, 12],
  ),

  // ─── platform ─────────────────────────────────────────────────────

  logger: ts(
    "logger.ts",
    `import { logger } from "@nebutra/logger";

logger.info("user.signup", {
  userId: user.id,
  tenantId: org.id,
  source: "marketing-site",
});

const requestLogger = logger.child({ requestId, traceId });
requestLogger.error("payment.failed", { orderId, code });`,
    [3, 8],
  ),

  // ─── design ───────────────────────────────────────────────────────
  tokens: ts(
    "tokens.css",
    `@import "@nebutra/tokens/styles.css";

:root {
  --brand-primary: oklch(0.55 0.24 256);
  --brand-accent: oklch(0.85 0.18 175);
  --brand-gradient: linear-gradient(135deg, hsl(var(--primary)), var(--brand-accent));
}

.cta {
  background: hsl(var(--primary));
  color: var(--neutral-1);
  border-radius: var(--radius-md);
}`,
    [4, 5, 9],
  ),

  ui: ts(
    "page.tsx",
    `import { Button, Card, CardContent, CardHeader, CardTitle } from "@nebutra/ui/primitives";
import { ArrowRight } from "@nebutra/icons";

export function Pricing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pro plan</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Get started <ArrowRight className="size-4" /></Button>
      </CardContent>
    </Card>
  );
}`,
    [1, 11],
  ),

  icons: ts(
    "icons.tsx",
    `import { MagnifyingGlass, Sparkles } from "@nebutra/icons";

<button>
  <MagnifyingGlass className="size-4" />
  Search docs
</button>

<div className="flex items-center gap-2">
  <Sparkles className="size-3" />
  AI-generated
</div>`,
    [1],
  ),

  theme: ts(
    "theme.tsx",
    `import { ThemeProvider } from "@nebutra/tokens";

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}`,
    [1, 7],
  ),

  "design-sync": ts(
    "design-sync.ts",
    `import { getDesignSync } from "@nebutra/design-sync";

// Auto-detects git-only / design-md from env.
const sync = await getDesignSync();

await sync.healthcheck();
await sync.pull();                  // re-read DTCG token files (git is the source)
await sync.push({ dryRun: true });  // validate + reformat in place (dry-run safe)`,
    [3, 4],
  ),

  // ─── commerce ─────────────────────────────────────────────────────
  billing: ts(
    "billing.ts",
    `import { createCheckoutSession } from "@nebutra/billing";

// Card checkout; WeChat Pay / Alipay have their own adapter for mainland China.
const session = await createCheckoutSession({
  customerId: org.stripeCustomerId,
  priceId: "price_pro_monthly",
  successUrl: \`\${origin}/billing/success\`,
  cancelUrl: \`\${origin}/billing\`,
});

return Response.redirect(session.url);`,
    [4],
  ),
};

// ─────────────────────────────────────────────────────────────────────────
// Public lookup API
// ─────────────────────────────────────────────────────────────────────────

/**
 * The snippet a feature page shows, or null. A package without a curated
 * snippet shows none: code invented from its slug calls an API that does not
 * exist, which is worse than no code.
 */
export function getCodeSampleForEntry(entry: PackageFeatureEntry): FeatureCodeSample | null {
  if (entry.kind === "package") return PACKAGE_CODE_SAMPLES[entry.slug] ?? null;
  return DOMAIN_CODE_SAMPLES[entry.group] ?? null;
}

/** A domain page leads with its group snippet, or with its lead package's. */
const DOMAIN_CODE_SAMPLES: Record<string, FeatureCodeSample | undefined> = {
  ...GROUP_CODE_SAMPLES,
  ai: PACKAGE_CODE_SAMPLES.agents,
  iam: PACKAGE_CODE_SAMPLES.vault,
};
