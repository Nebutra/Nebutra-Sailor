/**
 * Code samples shown in the feature detail page main showcase.
 *
 * Lookup priority:
 *   1. PACKAGE_CODE_SAMPLES[slug]   — curated per-package snippet
 *   2. GROUP_CODE_SAMPLES[group]    — group fallback
 *   3. synthesizeSlugSample(entry)  — last resort, slug-templated
 */

import type { FeatureCodeSample } from "./feature-group-code-samples";
import { GROUP_CODE_SAMPLES } from "./feature-group-code-samples";
import type { PackageFeatureEntry } from "./package-feature-data";

export type { FeatureCodeSample } from "./feature-group-code-samples";
export { GROUP_CODE_SAMPLES, getCodeSampleForGroup } from "./feature-group-code-samples";

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
  "agent-runtime": ts(
    "agent-runtime.ts",
    `import { AgentRuntime } from "@nebutra/agent-runtime";

const runtime = new AgentRuntime({
  model: "claude-sonnet-4-6",
  durable: { store: "redis", ttl: "7d" },
  hooks: {
    onBeforeTool: ({ name, args }) => console.log("tool:", name),
    onTurnComplete: ({ usage }) => meterUsage(usage),
  },
});

const turn = await runtime.run({
  prompt: "Refund the order placed yesterday",
  tools: [refundTool, lookupOrderTool],
  maxSteps: 8,
});`,
    [4, 6],
  ),

  agents: ts(
    "agents.ts",
    `import { generateText, streamText, embed } from "@nebutra/agents";

// One unified surface — providers swap via env / config.
const { text } = await generateText({
  model: "anthropic/claude-sonnet-4-6",
  prompt: "Summarize this support ticket in 3 bullets.",
  system: "You are a senior support engineer.",
});

const { embedding } = await embed({
  model: "openai/text-embedding-3-large",
  value: ticket.body,
});`,
    [4, 11],
  ),

  "knowledge-rag": ts(
    "rag.ts",
    `import { createKnowledgeBase } from "@nebutra/knowledge-rag";

const kb = createKnowledgeBase({
  tenantId: org.id,
  chunkSize: 800,
  overlap: 120,
});

await kb.ingest({ docs: await loadDocs() });

const hits = await kb.search("How do I rotate API keys?", { topK: 5 });
const context = hits.map((h) => h.text).join("\\n---\\n");`,
    [3, 9],
  ),

  mcp: ts(
    "mcp.ts",
    `import { McpRegistry, registerTool } from "@nebutra/mcp";

const registry = new McpRegistry();

registerTool(registry, {
  name: "search_users",
  description: "Search org users by email",
  inputSchema: { type: "object", properties: { q: { type: "string" } } },
  execute: async ({ q }) => searchUsers(q),
});

const agent = await registry.bind({ runtime });`,
    [5, 6],
  ),

  reel: ts(
    "reel.ts",
    `import { renderReel } from "@nebutra/reel";

const reel = await renderReel({
  scenes: [
    { kind: "image", src: hero, duration: 3 },
    { kind: "captions", text: "Q4 growth recap", style: "kinetic" },
    { kind: "video", src: demo, fit: "cover" },
  ],
  audio: { music: "uplift-corporate", voiceover: vo },
  output: { format: "mp4", aspect: "9:16" },
});`,
    [4, 5, 6],
  ),

  "sandbox-runtime": ts(
    "sandbox.ts",
    `import { createSandbox } from "@nebutra/sandbox-runtime";

const sandbox = await createSandbox({
  runtime: "node22",
  timeoutMs: 30_000,
  network: "egress-only",
});

const result = await sandbox.run(code, {
  inputs: { user, plan },
});`,
    [3, 4, 5],
  ),

  "ai-providers": ts(
    "providers.ts",
    `import { resolveProvider } from "@nebutra/ai-providers";

const { provider, model } = resolveProvider("claude-sonnet-4-6");
// → { provider: "anthropic", model: "claude-sonnet-4-6", contextWindow: 1_000_000 }

const fallback = resolveProvider("openai/gpt-5.5", {
  fallback: "anthropic/claude-haiku-4-5",
});`,
    [3, 6],
  ),

  // ─── iam ──────────────────────────────────────────────────────────
  auth: ts(
    "auth.ts",
    `import { auth } from "@nebutra/auth";

export const POST = auth.handler({
  provider: "clerk", // | "better-auth" | "next-auth"
  callbacks: {
    onSignIn: async ({ user, ctx }) => {
      await ctx.audit.log("user.sign_in", { userId: user.id });
    },
  },
});`,
    [4, 7],
  ),

  tenant: ts(
    "tenant.ts",
    `import { withTenant, getCurrentTenant } from "@nebutra/tenant";

// AsyncLocalStorage scope — propagates across all awaits.
await withTenant({ tenantId: org.id, plan: org.plan }, async () => {
  const tenant = getCurrentTenant();
  const posts = await prisma.post.findMany({
    where: { tenantId: tenant.tenantId },
  });
});`,
    [4, 5],
  ),

  permissions: ts(
    "permissions.ts",
    `import { defineAbility } from "@nebutra/permissions";

const ability = defineAbility((can, cannot, user) => {
  if (user.role === "admin") can("manage", "all");
  can("read", "Post", { tenantId: user.tenantId });
  can("update", "Post", { authorId: user.id });
  cannot("delete", "Post", { isPublished: true });
});

ability.can("update", post);`,
    [4, 7],
  ),

  audit: ts(
    "audit.ts",
    `import { logAudit } from "@nebutra/audit";

await logAudit({
  actor: { id: userId, role: "admin" },
  action: "billing.subscription.cancel",
  target: { type: "subscription", id: sub.id },
  metadata: { plan: sub.plan, reason: "user_request" },
  // Tamper-evident hash chain — entry IDs link sequentially.
});`,
    [3],
  ),

  vault: ts(
    "vault.ts",
    `import { getVault } from "@nebutra/vault";

const vault = await getVault();

// Envelope encryption — AWS KMS unwraps the DEK per-record.
const encrypted = await vault.encrypt(secretKey, {
  tenantId: org.id,
  name: "OpenAI API Key",
});

const plaintext = await vault.decrypt(encrypted);`,
    [5, 6],
  ),

  identity: ts(
    "identity.ts",
    `import { type Actor, asActor } from "@nebutra/identity";

const actor: Actor = asActor({
  id: user.id,
  type: "user",
  email: user.email,
  tenantId: org.id,
  roles: ["admin"],
});`,
    [3, 4],
  ),

  // ─── integrations ─────────────────────────────────────────────────
  queue: ts(
    "queue.ts",
    `import { getQueue, createJob } from "@nebutra/queue";

// Auto-detects QStash, BullMQ, or memory from env.
const queue = await getQueue();

await queue.enqueue(
  createJob("billing", "send-invoice", { orderId: order.id }, { tenantId }),
);

queue.registerHandler("billing", "send-invoice", async (job) => {
  await sendInvoice(job.data.orderId);
});`,
    [3, 6],
  ),

  cache: ts(
    "cache.ts",
    `import { getCache } from "@nebutra/cache";

const cache = await getCache();

const user = await cache.fetch(\`user:\${id}\`, {
  ttl: 60,
  fetcher: () => prisma.user.findUnique({ where: { id } }),
});

await cache.invalidate(\`user:\${id}\`);`,
    [5, 6],
  ),

  search: ts(
    "search.ts",
    `import { getSearch } from "@nebutra/search";

// Provider-agnostic: Meilisearch | Typesense | Algolia.
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

  email: ts(
    "email.tsx",
    `import { sendEmail } from "@nebutra/email";
import { WelcomeEmail } from "@/emails/welcome";

await sendEmail({
  to: user.email,
  subject: "Welcome to Nebutra",
  react: <WelcomeEmail name={user.name} orgName={org.name} />,
  // Routes via Resend / SES / SMTP based on env.
});`,
    [4, 6],
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

  storage: ts(
    "storage.ts",
    `import { getStorage } from "@nebutra/storage";

const storage = await getStorage();

await storage.put({
  bucket: "exports",
  key: \`reports/\${tenant}/\${date}.csv\`,
  body: csvBuffer,
  contentType: "text/csv",
});

const blob = await storage.get({ bucket: "exports", key });`,
    [5, 6],
  ),

  // ─── platform ─────────────────────────────────────────────────────
  db: ts(
    "db.ts",
    `import { prisma } from "@nebutra/db";

// Wrapped Prisma client — RLS enforced via withRls() per request.
const posts = await prisma.post.findMany({
  where: { tenantId: ctx.tenant.id, published: true },
  include: { author: true },
  orderBy: { publishedAt: "desc" },
  take: 20,
});

await prisma.$transaction(async (tx) => {
  await tx.post.update({ where: { id }, data: { published: true } });
  await tx.auditLog.create({ data: { action: "post.publish", postId: id } });
});`,
    [4, 11],
  ),

  config: ts(
    "config.ts",
    `import { defineConfig } from "@nebutra/config";

export const config = defineConfig({
  database: {
    url: { env: "DATABASE_URL", required: true },
  },
  ai: {
    defaultModel: { default: "claude-sonnet-4-6" },
    maxTokens: { default: 4096, type: "number" },
  },
});

const dbUrl = config.database.url; // typed + validated at startup`,
    [3, 4, 11],
  ),

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

  "rate-limit": ts(
    "rate-limit.ts",
    `import { rateLimit } from "@nebutra/rate-limit";

const limiter = rateLimit({
  algorithm: "token-bucket",
  rps: 100,
  burst: 250,
  key: (ctx) => \`\${ctx.tenant.id}:\${ctx.actor.id}\`,
});

const { ok, retryAfter } = await limiter.consume(ctx);
if (!ok) return Response.json({ retryAfter }, { status: 429 });`,
    [4, 5, 7],
  ),

  health: ts(
    "health.ts",
    `import { healthCheck } from "@nebutra/health";

export const GET = healthCheck({
  checks: {
    db: () => prisma.$queryRaw\`SELECT 1\`,
    redis: () => redis.ping(),
    queue: () => queue.ping(),
  },
});`,
    [4],
  ),

  "tenant-store": ts(
    "tenant-store.ts",
    `import { TenantStore } from "@nebutra/tenant-store";

const store = new TenantStore({ adapter: "postgres-rls" });

await store.scope({ tenantId }, async () => {
  // every Prisma query in this scope sets app.tenant_id GUC
  return prisma.post.findMany();
});`,
    [3, 5],
  ),

  "gateway-core": ts(
    "gateway-core.ts",
    `import { createApp } from "@nebutra/gateway-core";
import { tenancy, audit, rateLimit, idempotency } from "@nebutra/gateway-core/middleware";

const app = createApp()
  .use(tenancy())
  .use(audit())
  .use(rateLimit({ rps: 100 }))
  .use(idempotency());

export default app;`,
    [4, 5, 6, 7],
  ),

  // ─── design ───────────────────────────────────────────────────────
  tokens: ts(
    "tokens.css",
    `@import "@nebutra/tokens/styles.css";

:root {
  --brand-primary: oklch(0.55 0.24 256);
  --brand-accent: oklch(0.85 0.18 175);
  --brand-gradient: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
}

.cta {
  background: var(--brand-gradient);
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
    `import { ArrowRight, Search, Sparkles, Brain } from "@nebutra/icons";

<button>
  <Search className="size-4" />
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

  brand: ts(
    "brand.ts",
    `import { brand, brandMotion } from "@nebutra/brand";

export const palette = brand.colors.scale("primary"); // 12 oklch steps
export const accent = brand.colors.solid("accent");

const heroAnimation = brandMotion.emerge; // brand motion language`,
    [3, 6],
  ),

  "design-sync": ts(
    "design-sync.ts",
    `import { getDesignSync } from "@nebutra/design-sync";

// Auto-detects Figma / Penpot / git-only from env.
const sync = await getDesignSync();

await sync.healthcheck();
await sync.pull();                  // design tool → repo (DTCG)
await sync.push({ dryRun: true });  // repo → design tool (dry-run safe)`,
    [3, 4],
  ),

  // ─── commerce ─────────────────────────────────────────────────────
  billing: ts(
    "billing.ts",
    `import { createCheckoutSession, getSubscription } from "@nebutra/billing";

// Auto-routes to Stripe / Polar / LemonSqueezy / ChinaPay.
const session = await createCheckoutSession({
  customerId: org.id,
  priceId: "price_pro_monthly",
  successUrl: \`\${origin}/billing/success\`,
});

const sub = await getSubscription(org.id);
if (sub.plan === "pro" && sub.status === "active") {
  // unlock pro features
}`,
    [3, 4],
  ),

  metering: ts(
    "metering.ts",
    `import { getMetering, createUsageEvent, COMMON_METERS } from "@nebutra/metering";

const metering = await getMetering();

await metering.ingest(
  createUsageEvent(COMMON_METERS.API_CALLS.id, org.id, 1, {
    endpoint: "/api/chat",
    model: "claude-sonnet-4-6",
  }),
);

const quota = await metering.getQuota(org.id, "api_calls");
// → { limit: 10000, used: 4521, remaining: 5479, percentage: 0.4521 }`,
    [5, 11],
  ),

  license: ts(
    "license.ts",
    `import { generateLicense, validateLicense } from "@nebutra/license";

const key = generateLicense({
  product: "nebutra-pro",
  customer: org.id,
  expiresAt: addYears(new Date(), 1),
  features: ["sso", "audit-log", "unlimited-seats"],
});

const { valid, license } = await validateLicense(key);
if (!valid) throw new Error("Invalid license");`,
    [3, 9],
  ),

  contracts: ts(
    "contracts.ts",
    `import type { BillingEvent, IdentityEvent } from "@nebutra/contracts";

// Cross-package contracts — TypeScript-validated event shapes.
function onBilling(event: BillingEvent) {
  if (event.type === "subscription.canceled") {
    revokeAccess(event.payload.tenantId);
  }
}`,
    [1, 4],
  ),

  waitlist: ts(
    "waitlist.ts",
    `import { joinWaitlist, getWaitlistPosition } from "@nebutra/waitlist";

const entry = await joinWaitlist({
  email: "founder@example.com",
  referredBy: ref?.code,
  metadata: { source: "marketing-site" },
});

const pos = await getWaitlistPosition(entry.id);
// → { position: 142, total: 1843 }`,
    [3, 9],
  ),
};

// ─────────────────────────────────────────────────────────────────────────
// Fallback synthesizer — when we don't have a curated sample, generate one
// that uses the entry's actual slug + group context so the page still feels
// owned, not generic.
// ─────────────────────────────────────────────────────────────────────────

const SYNTHESIZER_TEMPLATES: Record<string, (slug: string) => FeatureCodeSample> = {
  ai: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

const result = await ${camel(slug)}.run({
  tenantId: org.id,
  // ${slug} is part of the AI runtime — composable with other AI primitives.
  input: payload,
});`,
      [1, 3],
    ),

  iam: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

// Tenant-scoped, audit-logged by default.
await ${camel(slug)}.check({
  actor: getCurrentActor(),
  tenantId: org.id,
});`,
      [1, 4],
    ),

  integrations: (slug) =>
    ts(
      `${slug}.ts`,
      `import { get${pascal(slug)}Provider } from "@nebutra/${slug}";

// Provider-agnostic — backend chosen from env at runtime.
const ${camel(slug)} = await get${pascal(slug)}Provider();

await ${camel(slug)}.connect({ tenantId: org.id });`,
      [1, 4],
    ),

  platform: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

// Lowest shared layer — every higher capability composes on top.
${camel(slug)}.configure({
  tenantId: org.id,
  // Production-tuned defaults; override via @nebutra/config.
});`,
      [1, 4],
    ),

  design: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

// Part of the design supply chain — consumed by both apps and Storybook.
export const surface = ${camel(slug)}({
  brand: "nebutra",
  mode: "system",
});`,
      [1, 4],
    ),

  commerce: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

// Commerce domain — billing-aware, audit-logged, tenant-scoped.
await ${camel(slug)}.record({
  tenantId: org.id,
  amount: charge.total,
  currency: charge.currency,
});`,
      [1, 4],
    ),

  gateway: (slug) =>
    ts(
      `${slug}.ts`,
      `import { ${camel(slug)} } from "@nebutra/${slug}";

// Gateway request-path module — runs before route handlers.
app.use(${camel(slug)}({
  // Composable middleware with full type-safety.
  scope: "tenant",
}));`,
      [1, 4],
    ),

  ops: (slug) =>
    ts(
      `${slug}.sh`,
      `# ${slug} is part of the Nebutra ops surface.
$ pnpm nebutra ${slug.replace(/^@?nebutra\//, "")} status
✔ ${slug}: ready
✔ tenant lock: held
✔ migrations: in sync

$ pnpm nebutra ${slug.replace(/^@?nebutra\//, "")} run --tenant org_abc123
Started in 1.2s. PID 8847.`,
    ),
};

function camel(slug: string): string {
  return slug.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
}

function pascal(slug: string): string {
  const c = camel(slug);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function synthesizeSlugSample(entry: PackageFeatureEntry): FeatureCodeSample {
  const tmpl = SYNTHESIZER_TEMPLATES[entry.group];
  if (tmpl) return tmpl(entry.slug);
  return GROUP_CODE_SAMPLES[entry.group] ?? GROUP_CODE_SAMPLES.platform;
}

// ─────────────────────────────────────────────────────────────────────────
// Public lookup API
// ─────────────────────────────────────────────────────────────────────────

export const DEFAULT_CODE_SAMPLE: FeatureCodeSample = GROUP_CODE_SAMPLES.platform;

export function getCodeSampleForEntry(entry: PackageFeatureEntry): FeatureCodeSample {
  // 1. Curated per-package
  const curated = PACKAGE_CODE_SAMPLES[entry.slug];
  if (curated) return curated;

  // 2. Group anchors (kind = "group" or "capability") fall through to the
  //    group sample — that's the canonical "this domain looks like X" snippet.
  if (entry.kind !== "package") {
    return GROUP_CODE_SAMPLES[entry.group] ?? DEFAULT_CODE_SAMPLE;
  }

  // 3. Unknown leaf package — synthesize from slug + group template.
  return synthesizeSlugSample(entry);
}
