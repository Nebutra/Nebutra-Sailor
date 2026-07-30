# Nebutra-Sailor — Claude Code Instructions

This file is the single source of truth for how Claude Code should work in this codebase.
Read it in full before writing any code.

---

## Project Structure


> `@nebutra/design-system` has been merged into `@nebutra/ui` (layout components now at `@nebutra/ui/layout`).

```
apps/                  # User-facing apps (Next.js / Hono)
  landing/        # Public marketing site (Next.js 16 + Tailwind v4)
  web/                 # Authenticated dashboard (Next.js 16 + Tailwind v4)
  storybook/           # Component library documentation (Storybook 8.x)
  design-docs/         # Internal design docs (Next.js + Fumadocs)
  studio/              # Sanity Studio v4 — content management
  sailor-docs/         # Public product docs (Fumadocs)
  sleptons/  idp/  mail-preview/

backends/              # No-UI backends (split by language à la vercel/vercel)
  gateway/             # TypeScript / Hono — BFF, auth, tenancy, rate-limit, routing — DEFAULT for new backend work
  python/              # Python / FastAPI — only when batch / ML / specialized libs justify it (see ADR 2026-05-10)
    _shared/  ai/        # active — real callers (LLM, embeddings, agent orchestration)

packages/              # Shared TypeScript libraries — categorized layout: <category>/<name>
  design/
    ui/                PRIMARY component library — Nebutra primitives + layout + shared Motion
    design-tokens/     W3C DTCG ($value/$type) tokens — Style Dictionary 4 pipeline  ★ TOKEN SOURCE (edit here)
    tokens/            Runtime consumption: styles.css (GENERATED from design-tokens),
                       recipe.css (hand-written), next-themes ThemeProvider
    brand/             Brand colors, gradients, motion language (VI manual)
    theme/             Design-language catalog — Brand Packages on html[data-brand],
                       7 built-in (gsap linear notion raycast stripe vanta vercel)
    icons/             541 Geist icons as tree-shakable TSX components
    design-sync/       Provider-agnostic design-tool sync (Figma | Penpot | git-only)
  iam/
    auth/              Multi-provider auth (Clerk | Better Auth | NextAuth)
    audit/             SOC 2-grade audit logging
    vault/             Application-layer secrets — envelope encryption (AWS KMS + local HKDF)
    tenant/            Multi-tenancy context — AsyncLocalStorage + RLS + schema isolation
    permissions/       RBAC/ABAC engine — CASL (in-process) + OpenFGA (Zanzibar)
    identity/          Shared identity primitives
  commerce/
    billing/           Multi-provider billing (Stripe | Polar | LemonSqueezy | ChinaPay | Manual)
    contracts/         Cross-package event/identity/billing/notification contracts
    license/           License key generation + validation
    marketing/         Marketing-site shared components/hooks/utils
    metering/          Usage metering pipeline — ClickHouse real-time aggregation
    waitlist/          Pre-launch waitlist (foundation tier)
  integrations/
    queue/             Provider-agnostic message queue — QStash + BullMQ
    search/            Full-text search — Meilisearch + Typesense + Algolia
    notifications/     Multi-channel notification center — Novu + direct dispatchers
    webhooks/          Outbound webhook management — Svix + custom
    uploads/           Large file uploads — S3/R2 multipart + Tus resumable + presigned URLs
    storage/           Lower-tier object storage (L3 simpler tier vs L4 uploads)
    email/             Email rendering + send (React Email + Resend/SES/SMTP)
    saga/              Distributed transactions (WIP — not yet integrated)
  platform/
    db/                Prisma client wrapper
    logger/            Structured logging (pino + Sentry transport)
    config/            Shared config utilities
  ops/
    cli/               `nebutra` CLI (npm-published)
    create-sailor/     `create-sailor` scaffold CLI (npm-published)
    sanity/            Sanity Studio v4 helpers
    preset/            Feature-based SaaS starter config system
  ai/
    mcp/               MCP server primitives
    ai-providers/      AI provider metadata (consumed by @nebutra/agents)
  (+ ~59 more under platform/, ai/, ops/)

infra/                 # iac/ + runtime/ + data/ + ops/  (W2.2)
workflows/             # inngest/ + n8n/ + pusher/  (W2.3)
e2e/                   # smoke/ + golden/ + sleptons/ + 4 playwright configs  (W2.1)
tests/                 # architecture/ + load/  (vitest + k6)
```

---

## Component Generation Rules

### 1. Always import from the right package

```tsx
// UI components (Nebutra primitives, patterns, and curated AI/chat surfaces)
// Note: many primitives also live under @nebutra/ui/primitives — prefer
// /primitives for low-level building blocks, /components for composed patterns.
import { Button, Input, Card } from "@nebutra/ui/components";

// Layout wrapper components (merged from design-system)
import { PageHeader, EmptyState, LoadingState, ErrorState } from "@nebutra/ui/layout";

// Icons — three-tier hierarchy (2026 governance, see also MEMORY.md):
//   1. @nebutra/icons (Geist 541) — DEFAULT for product/app/dashboard surfaces (Vercel/v0 same visual)
//   2. @phosphor-icons/react/light — ONLY for AI-brand thin/duotone weight in marketing surfaces
//      (apps/landing/** + packages/design/ui/src/marketing/**) — lint-enforced
//   3. lucide-react — DEPRECATED, ZERO new imports allowed (lint-enforced)
import { MagnifyingGlass, SettingsGear, ChevronRight, Sparkles } from "@nebutra/icons";
// import { Brain } from "@phosphor-icons/react/dist/ssr"; // only in apps/landing/** or packages/design/ui/src/marketing/**
// CI guard: scripts/lint-phosphor-marketing-only.mjs (wired into `pnpm lint`) — Phosphor outside marketing = fail

// Theme switching (light/dark) — from @nebutra/tokens
import { ThemeProvider, useTheme } from "@nebutra/tokens";

// Lobe compatibility theme wrapper — from @nebutra/ui
import { NebutraThemeProvider } from "@nebutra/ui";

// NEVER import from @primer/react — it has been removed
```

### 2. Tailwind CSS — use semantic tokens, not raw values

```tsx
// ✅ Correct — semantic CSS variables
<div className="bg-[var(--neutral-1)] text-[var(--neutral-12)] border-[var(--neutral-7)]">

// ✅ Correct — Tailwind utility classes that map to tokens
<div className="bg-white text-gray-900 border-gray-200">

// ❌ Wrong — arbitrary values without semantic meaning
<div style={{ backgroundColor: "#f8fafc" }}>
```

**Key semantic tokens:**

| Token | Meaning | Light value |
|-------|---------|------------|
| `--neutral-1` | App background | #ffffff |
| `--neutral-2` | Subtle background | #f8fafc |
| `--neutral-7` | Default border | #96a3b5 |
| `--neutral-11` | Secondary text | #334155 |
| `--neutral-12` | Primary text | #0f172a |
| `--primary` | **Action fill** — the one to reach for | `222.8 85% 55.7%` → #2e65ee |
| `--primary-foreground` | Label on the action fill | #ffffff |
| `--blue-3` | Primary component bg (tint) | #bac8ff |
| `--brand-gradient` | Blue→Cyan gradient | 135deg |

**Not in that table on purpose:**

| Token | Value | Why it is not a surface colour |
|-------|-------|-------------------------------|
| `--blue-9` / `--brand-primary` | #0033FE | The **VI identity lock**. OKLCH chroma 0.290 — 23% beyond the most saturated primary any comparable product ships, and white on it reads 7.23:1 where the field sits at 4.5–5.2. It belongs to the logo, the favicon and print. It reached 31 component call sites across 17 files because this table used to call it "Primary solid fill", including the sign-in, sign-up and phone-login buttons. Use `--primary`. |
| `--cyan-9` / `--brand-accent` | #0BF1C3 | A **bright** accent: L\* 85.4, so it takes **dark** ink, not white. White on it is 1.46:1. Pair it with `--neutral-12` (12.23:1). Treat it the way Linear treats acid-lime — sparingly, and never as a fill that carries white text. |

Use `bg-primary text-primary-foreground` rather than either of them. `--primary` is a
bare HSL triple, so hand-written CSS needs `hsl(var(--primary))` — see the slot-type
section below, where getting this wrong deletes the whole declaration.

### 3. Brand gradients

```tsx
// Gradient text — standard pattern
<h1
  className="font-bold"
  style={{
    background: "var(--brand-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  }}
>
  Your headline
</h1>

// Gradient button
<button
  className="rounded-lg px-6 py-3 font-semibold text-white"
  style={{ background: "var(--brand-gradient)" }}
>
  Get Started
</button>

// Gradient border (outline variant)
<div className="rounded-lg p-[1px]" style={{ background: "var(--brand-gradient)" }}>
  <div className="rounded-[7px] bg-white px-6 py-3">
    Inner content
  </div>
</div>
```

### 4. Animation — ALWAYS use AnimateIn for entrance animations

```tsx
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

// Single element entrance
<AnimateIn preset="emerge">
  <YourComponent />
</AnimateIn>

// Staggered list — children enter one by one
<AnimateInGroup stagger="normal" className="grid grid-cols-3 gap-6">
  {items.map((item, i) => (
    <AnimateIn key={item.id} preset="fadeUp">
      <Card>{item.title}</Card>
    </AnimateIn>
  ))}
</AnimateInGroup>

// Scroll-triggered (for landing page sections)
<AnimateIn preset="emerge" inView>
  <FeatureSection />
</AnimateIn>
```

**Presets:** `emerge` (default, blur+rise), `flow` (slide left), `fade`, `fadeUp`, `scale`

**Never use raw `motion.div` with hardcoded values.** Always use `AnimateIn` or import from `packages/design/brand/src/motion.ts`.

### 5. Component variants — use CVA

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@nebutra/ui/utils";

const cardVariants = cva(
  "rounded-lg border bg-white shadow-sm transition-shadow",
  {
    variants: {
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md",
        false: "",
      },
    },
    defaultVariants: { size: "md", interactive: false },
  }
);

interface CardProps extends VariantProps<typeof cardVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ size, interactive, children, className }: CardProps) {
  return (
    <div className={cn(cardVariants({ size, interactive }), className)}>
      {children}
    </div>
  );
}
```

### 6. Accessibility requirements

Every interactive component must have:
- `type="button"` on all `<button>` elements
- `aria-label` on icon-only buttons
- `role` attribute where semantic HTML isn't possible
- Keyboard navigation support — **do NOT add component-level focus rings**. The global `:focus-visible` rule in [packages/design/design-tokens/static/base.css](packages/design/design-tokens/static/base.css) supplies a translucent 2px outline (`hsl(var(--ring) / 0.5)`) with 2px offset for every focusable element. Keyboard users get the ring; mouse users don't.

### Form controls — primitive-only rule (lint-enforced)

**Banned in `apps/**`** — raw `<input>` / `<textarea>` / `<select>`. Use `@nebutra/ui/primitives`:

```tsx
import { Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Field } from "@nebutra/ui/primitives";

<Field label="Email *" htmlFor="email">
  <Input id="email" type="email" name="email" required />
</Field>

<Field label="Plan *" htmlFor="plan">
  <Select name="plan" defaultValue="pro">
    <SelectTrigger id="plan"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="pro">Pro</SelectItem>
      <SelectItem value="enterprise">Enterprise</SelectItem>
    </SelectContent>
  </Select>
</Field>
```

**Native opt-out** — add `data-allow-native` for legitimate **input/textarea** cases:

```tsx
<input data-allow-native type="hidden" name="orgId" value={orgId} />  {/* form data */}
<input data-allow-native type="file" ref={inputRef} className="sr-only" />  {/* trigger via button */}
```

**Never use raw `<select>` in product apps** — OS option menus cannot be themed (dark UI → white system popup). Use DS Select (compound or `options={…}` listbox). Empty “All” uses a sentinel value, not `value=""`:

```tsx
const ALL = "__all__";
<Select
  value={filters.outcome ?? ALL}
  onValueChange={(v) => setOutcome(!v || v === ALL ? undefined : v)}
  options={[
    { value: ALL, label: "All" },
    { value: "success", label: "Success" },
  ]}
/>
```

Escape hatch only with `// allow-os-select: <reason>` on the preceding line (lint still documents it; avoid).

CI guard: `scripts/lint-no-raw-inputs.mjs` (wired into `pnpm lint`). Whitelist: storybook stories, design-docs/sailor-docs previews, test files, all `packages/**/primitives/**`.

```tsx
// ✅ Accessible icon button — no focus classes needed
<button
  type="button"
  aria-label="Close dialog"
  className="rounded-md p-1"
>
  <X className="h-4 w-4" />
</button>

// ✅ Input — keep border-color change for mouse focus feedback, use --ring token
<input
  className="rounded-md border border-neutral-7 focus:border-[hsl(var(--ring))] focus:outline-none"
/>

// ❌ Never reintroduce hardcoded brand-blue rings
// focus:ring-[var(--blue-9)] focus:ring-offset-1 — 100% saturation, double-rings with global rule
```

---

## Adding New Components

### Step 1: Choose the right layer

| Component type | Package | Location |
|---------------|---------|----------|
| Generic UI primitive (button, input, badge) | `ui` | `src/components/` |
| Complex pattern (data table, command palette) | `ui` | `src/components/` |
| Marketing section (hero, feature grid) | `ui` | `src/components/` |
| Dashboard layout wrapper | `ui` | `src/layout/` |

### Step 2: File structure

```
src/components/
  my-component.tsx          ← component implementation
  my-component.stories.tsx  ← Storybook stories (REQUIRED)
  index.ts                  ← re-export (update existing file)
```

### Step 3: Required story structure

Every new component MUST have a Storybook story:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta: Meta<typeof MyComponent> = {
  title: "Primitives/MyComponent",   // or "Patterns/", "Marketing/"
  component: MyComponent,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = { args: { /* ... */ } };
export const AllVariants: Story = { render: () => ( /* showcase */ ) };
```

### Step 4: Export from index.ts

After creating the component, add to `packages/design/ui/src/components/index.ts`:
```ts
export { MyComponent, type MyComponentProps } from "./my-component";
```

---

## Rebranding (no Figma required)

To change the brand colors:
1. Edit `packages/design/design-tokens/tokens/` — the DTCG token source.
   Light and dark live in separate files (`themes/light.json`, `themes/dark.json`)
   and must be edited **together**, or the token exists in one mode only.
   Then `pnpm --filter @nebutra/design-tokens build && pnpm --filter @nebutra/tokens build`.
2. Edit `packages/design/brand/src/` — the brand primitive definitions
3. To ship a whole alternate design language rather than a recolour, add a
   Brand Package in `packages/design/theme/src/languages.ts` — see below.
   `theme/themes.css` is a deprecated alias for `keyframes.css`, not a place
   to put colours.

**Do not edit `packages/design/tokens/styles.css`.** It is a build artifact:
`@nebutra/tokens`'s build copies the Style Dictionary output over it. An edit
there survives until the next build of anything depending on the package, then
disappears with no error — the file still parses, the token is simply gone, and
the `var()` that wanted it silently falls back or voids its whole declaration.

Same shape elsewhere, two steps rather than one: `emit-skins.mjs` writes
`packages/design/tokens/skins/<id>.css` from `src/brand-package/emit-css.ts`, and
`packages/design/theme/scripts/sync-skins.mjs` concatenates those into
`packages/design/theme/skins.css`. `recipe.css` is **not** generated — the
`@property` registrations and the `.btn-brand-default` / `.badge-brand-default`
recipes are hand-maintained there.

Or use the palette generator:
```bash
node scripts/generate-palette.mjs --primary=#7C3AED --secondary=#F59E0B
```

---

## Message Queue (`@nebutra/queue`)

Provider-agnostic message queue supporting **Upstash QStash** (serverless) and **BullMQ** (self-hosted Redis). Customers choose their backend; application code stays the same.

### Provider auto-detection

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `QUEUE_PROVIDER` env var | As specified |
| 2 | `QSTASH_TOKEN` exists | `qstash` |
| 3 | `REDIS_URL` exists | `bullmq` |
| 4 | Fallback | `memory` (dev/test only) |

### Usage (TypeScript — Node.js)

```ts
import { getQueue, createJob } from "@nebutra/queue";

// Auto-detects provider from env
const queue = await getQueue();

// Enqueue a job
await queue.enqueue(
  createJob("email", "send", { to: "user@example.com" }, { tenantId: "org_123" })
);

// Register a handler (BullMQ: starts a Worker; QStash: use webhook route)
queue.registerHandler("email", "send", async (job) => {
  await sendEmail(job.data.to);
});
```

### QStash webhook route (Hono / backends/gateway)

```ts
import { createQStashWebhookHandler } from "@nebutra/queue";

app.post("/api/queue/:queue/:type", async (c) => {
  const handler = createQStashWebhookHandler();
  return handler(c.req.raw);
});
```

### Usage (Python — microservices)

```python
from _shared.queue import get_queue, create_job

queue = await get_queue()
await queue.enqueue(create_job("report", "generate", {"tenant_id": "org_123"}))

@queue.handler("report", "generate")
async def handle_report(job):
    await generate_report(job.data["tenant_id"])
```

### Environment variables

```env
QUEUE_PROVIDER=""                    # "qstash" | "bullmq" | "memory" (auto-detect if empty)
QSTASH_TOKEN=""                      # Upstash QStash REST token
QSTASH_CURRENT_SIGNING_KEY=""        # Webhook signature verification
QSTASH_NEXT_SIGNING_KEY=""           # Key rotation support
QSTASH_CALLBACK_BASE_URL=""          # e.g. https://api.nebutra.com
# BullMQ reuses REDIS_URL — no extra config
```

---

## Design Sync (`@nebutra/design-sync`)

Provider-agnostic design-tool sync. Keeps the W3C DTCG token files in `packages/design/design-tokens/tokens/` in lock-step with the customer's design tool. Customers swap providers without changing application code.

### Provider auto-detection

| Priority | Condition | Provider | Customer profile |
|----------|-----------|----------|------------------|
| 1 | `DESIGN_SYNC_PROVIDER` env var | as specified | — |
| 2 | `FIGMA_PERSONAL_ACCESS_TOKEN` + `FIGMA_FILE_ID` | `figma` | NA / global w/ Figma seat |
| 3 | `PENPOT_API_URL` + `PENPOT_TOKEN` | `penpot` | self-host / China-friendly |
| 4 | fallback | `git-only` | indie hackers, AI-driven dev |

`memory` is never auto-detected; reserved for tests.

### Usage (TypeScript)

```ts
import { getDesignSync } from "@nebutra/design-sync";

const sync = await getDesignSync();         // auto-detects provider
await sync.healthcheck();                   // diagnose env / creds
await sync.pull();                          // design-tool → repo (DTCG)
await sync.push({ dryRun: true });          // repo → design-tool (dry-run safe)
```

### CLI

```bash
pnpm --filter @nebutra/design-sync exec design-sync detect       # which provider + env diag
pnpm --filter @nebutra/design-sync exec design-sync healthcheck  # provider readiness
pnpm --filter @nebutra/design-sync exec design-sync pull         # design-tool → repo
pnpm --filter @nebutra/design-sync exec design-sync push --dry-run  # repo → design-tool
```

### Environment variables

```env
DESIGN_SYNC_PROVIDER=""              # figma | penpot | git-only | memory (auto-detect if empty)

# Figma
FIGMA_PERSONAL_ACCESS_TOKEN=""
FIGMA_FILE_ID=""
FIGMA_GITHUB_REPO="Nebutra/Nebutra-Sailor"
FIGMA_GITHUB_BRANCH="main"

# Penpot
PENPOT_API_URL="https://design.penpot.app/api"
PENPOT_TOKEN=""
PENPOT_FILE_ID=""
PENPOT_TEAM_ID=""
```

### Safety

`figma.push()` and `penpot.push()` default to **dry-run** until the operator opts in by providing credentials AND omitting `dryRun: true`. The package never silently writes to a remote design tool. CI workflow: `.github/workflows/design-sync.yml`.

---

## Full-Text Search (`@nebutra/search`)

Provider-agnostic search supporting **Meilisearch**, **Typesense**, and **Algolia**.

| Priority | Condition | Provider |
|----------|-----------|----------|
| 1 | `SEARCH_PROVIDER` env var | As specified |
| 2 | `MEILISEARCH_URL` exists | `meilisearch` |
| 3 | `TYPESENSE_URL` exists | `typesense` |
| 4 | `ALGOLIA_APP_ID` exists | `algolia` |

```ts
import { getSearch } from "@nebutra/search";

const search = await getSearch();
await search.indexDocument("products", { id: "1", name: "Widget", tenantId: "org_123" });
const results = await search.search("products", { query: "widget", tenantId: "org_123" });
```

---

## Notifications (`@nebutra/notifications`)

Multi-channel notification system: `in_app`, `email`, `push`, `sms`, `chat`.

```ts
import { getNotificationProvider, type NotificationPayload } from "@nebutra/notifications";

const notifications = await getNotificationProvider();
await notifications.send({
  id: crypto.randomUUID(),
  type: "invoice.paid",
  recipientId: "user_123",
  tenantId: "org_123",
  channels: ["in_app", "email"],
  data: { amount: 99.99, invoiceId: "inv_456" },
});
```

---

## Permissions (`@nebutra/permissions`)

RBAC/ABAC with **CASL** (in-process) or **OpenFGA** (Zanzibar-style).

```ts
// API middleware (Hono)
import { requirePermission } from "@nebutra/permissions";
app.delete("/api/projects/:id", requirePermission("delete", "Project"), handler);

// React UI gates
import { Can } from "@nebutra/permissions/react";
<Can action="edit" resource="Document" subject={doc}>
  <EditButton />
</Can>
```

---

## Webhooks (`@nebutra/webhooks`)

Outbound webhook management with **Svix** (managed) or custom delivery.

```ts
import { getWebhooks } from "@nebutra/webhooks";

const webhooks = await getWebhooks();
await webhooks.sendEvent({
  id: crypto.randomUUID(),
  eventType: "invoice.paid",
  payload: { invoiceId: "inv_123", amount: 99.99 },
  timestamp: new Date().toISOString(),
  tenantId: "org_123",
});
```

---

## Metering (`@nebutra/metering`)

Usage metering pipeline for consumption-based billing via **ClickHouse**.

```ts
import { getMetering, createUsageEvent, COMMON_METERS } from "@nebutra/metering";

const metering = await getMetering();
await metering.ingest(createUsageEvent(COMMON_METERS.API_CALLS.id, "org_123", 1, { endpoint: "/api/chat" }));
const quota = await metering.getQuota("org_123", "api_calls");
// → { limit: 10000, used: 4521, remaining: 5479, percentage: 0.4521 }
```

---

## Uploads (`@nebutra/uploads`)

Large file uploads with **S3/R2 multipart**, **Tus resumable**, and **presigned URLs**.

```ts
import { getUploadProvider } from "@nebutra/uploads";

const uploads = await getUploadProvider();

// Small file — presigned URL
const { url, headers } = await uploads.createPresignedUpload({
  bucket: "nebutra-uploads", key: "docs/report.pdf", contentType: "application/pdf", tenantId: "org_123",
});

// Large file — multipart
const mp = await uploads.createMultipartUpload({ bucket: "nebutra-uploads", key: "videos/demo.mp4" }, 10);
```

---

## Vault (`@nebutra/vault`)

Application-layer envelope encryption for customer secrets.

```ts
import { getVault } from "@nebutra/vault";

const vault = await getVault();
const encrypted = await vault.encrypt("sk-live-abc123", { tenantId: "org_123", name: "OpenAI Key" });
const plaintext = await vault.decrypt(encrypted);
```

---

## Multi-Tenancy (`@nebutra/tenant`)

Request-scoped tenant context via AsyncLocalStorage + database isolation.

```ts
// Hono middleware
import { tenantMiddleware } from "@nebutra/tenant/middleware";
app.use("*", tenantMiddleware({ resolvers: [fromHeader("x-tenant-id")] }));

// Access anywhere in the call stack
import { getCurrentTenant } from "@nebutra/tenant";
const tenant = getCurrentTenant(); // → { tenantId: "org_123", plan: "pro", ... }

// Prisma with RLS
import { withRls } from "@nebutra/tenant";
const db = withRls(prisma, tenant.tenantId);
```

---

## Data Access — Repository Seam (selective, lint-enforced)

Repository seam is a best practice for **core, long-evolving business modules —
NOT every table**. Wrapping a trivial CRUD table in a repository that only
forwards to Prisma is over-abstraction (Prisma already gives type-safe queries).
So the seam is enforced **only in core domains**; simple CRUD stays direct.

**Decision test** for a piece of data access — *"could this ever change
implementation, or add caching / permissions / multi-tenancy / RLS / audit /
async workers / external stores (S3·OSS·vector·search)?"*
→ **yes → repository seam**; → **no (simple read/write) → direct Prisma is fine**.

| Module | Seam? |
|---|---|
| users · teams · permissions · tenancy · identity | ✅ required |
| subscriptions · quota · payments · license · metering | ✅ required |
| agent runs · execution · logs | ✅ required |
| file · PDF · markdown · upload/object-store tasks | ✅ required |
| simple CMS content · config tables | ➖ optional (direct Prisma OK) |
| one-off scripts · marketing surfaces · side apps | ❌ not governed |

**The seam** (may touch the Prisma client directly): `packages/platform/repositories/**`
and `packages/platform/db/**`. Keeps the ORM swappable (Prisma → Drizzle) without
a big-bang rewrite — a future swap re-implements repositories, not the whole app.

```ts
// ✅ Core module — depend on the repository seam
import { UserRepository } from "@nebutra/repositories";
import { getTenantDb } from "@nebutra/db";
await new UserRepository(getTenantDb(tenantId)).findPaginated({ take: 20 });

// ✅ Simple CMS read outside core domains — direct Prisma is fine, don't over-abstract
await getTenantDb(tenantId).post.findMany();
```

**Shrink-only ratchet** (`scripts/lint-repository-seam.mjs`, wired into `pnpm lint`):
enforced ONLY in the core domains listed in `governance.config.json` →
`repositorySeam.coreDomains`. A new core-domain file that bypasses the seam
**fails CI**; the 27 existing core bypasses are tracked in
`repositorySeam.allowlist` in the same file and migrated **on-touch** (route
through a repository, create one if the entity has none, then delete its entry
— the list may only shrink).
Anything outside the core domains is intentionally ungoverned. Legitimate
raw-SQL/migration/store cases use a top-level `// @seam-exempt: <reason>` comment.
New core modules should follow `modules/<domain>/{service, repository}` with the
Prisma implementation behind the repository interface.

---

## Microcopy governance — seven-prohibition rule (lint-enforced)

Governed path: `apps/web/src` (the authenticated product surface). The engine
enforces only the **mechanically-lintable** families — do not add semantic rules
as bannedPatterns; those belong to human review via the 黄金50 acceptance gate.

**Lint-enforced (CI fails on new violations):**
- **禁七** — generic empty-state strings: `暂无…` / `No X (yet|available)`
- **禁四** — LinkedIn/corporate-speak: `赋能` / `闭环` / `抓手` / `颗粒度` / `打法` / `系统检测到` / `请您`
- **禁一 (partial)** — over-incentive words: `加油` / `你能行` / `冲鸭` / `梦想成真`
- **禁标点** — emoji in JSX string literals; trailing `!` / full-caps shout

**Human-review only (黄金50 acceptance gate, NOT lint-enforced):**
禁二 (空洞成功学 / empty motivational copy), 禁三 (自我感动 / self-moved copy),
禁五 (subtle 尬梗/谐音), 禁六 (裸引用 / naked references), §6.5 IP red lines.

**Escape hatch** — add a top-level comment in the file:
```ts
// @microcopy-exempt: <reason>  ← e.g. "technical API label, not user-facing copy"
```
Use sparingly; API route error bodies are already excluded structurally via
`excludePaths: ["/api/"]`.

**Shrink-only ratchet:** existing offenders are listed in
`governance.config.json` → `microcopyRules.allowlist` and migrate on-touch
(list may only shrink). New violations in governed paths fail CI immediately.

`create-sailor` ships an empty `microcopyRules` section into every scaffold's
`governance.config.json` so downstream projects inherit the engine on day one.

Authoritative bible: `docs/microcopy/nebutra-microcopy-system.md`

---

## What NOT to do

```tsx
// ❌ Never import from @primer/react
import { Box, Button } from "@primer/react";

// ❌ Never use inline px/hex values for brand colors
<div style={{ color: "#0033FE" }}>

// ❌ Never use raw motion.div with hardcoded animation values
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

// ❌ Never add new HeroUI imports unless Radix has NO equivalent
import { HeroNewComponent } from "@heroui/new-component";

// ❌ Never create a component without a Storybook story
// ❌ Never use console.log in production code (use @nebutra/logger)
// ❌ Never hardcode secrets or API keys
```

---

## Token Governance — Execution Rules

### Brand color aliases (use these, not raw hex)

| Token | Resolves to | Use for |
|-------|-------------|---------|
| `var(--brand-primary)` | `var(--blue-9)` → `#0033FE` | Primary brand, CTA, charts |
| `var(--brand-accent)` | `var(--cyan-9)` → `#0BF1C3` | Accent, success highlight, charts |
| `var(--brand-tertiary)` | `#8b5cf6` | Infrastructure, tertiary data viz |
| `var(--brand-gradient)` | `135deg, blue→cyan` | Gradient backgrounds, text |

### Status colors (for inline styles, SVG, charts)

| Token | Hex | Use for |
|-------|-----|---------|
| `var(--status-danger)` | `#ef4444` | Breaking changes, errors |
| `var(--status-warning)` | `#f59e0b` | Improvements, pending |
| `var(--status-success)` | `#10b981` | Fixes, completed, foundation |
| `var(--status-info)` | `var(--brand-primary)` | Informational |

For Tailwind classes, use the semantic tokens: `bg-destructive`, `bg-success`, `bg-warning`.

### CSS variable syntax in Tailwind — canonical form

```tsx
// ✅ Tailwind 12-step scale classes (registered in @theme)
<div className="bg-neutral-3 text-neutral-12 border-neutral-7" />
<div className="bg-blue-9 text-cyan-11" />

// ✅ Semantic Tailwind classes
<div className="bg-primary text-foreground border-border" />
<div className="bg-destructive text-destructive-foreground" />

// ✅ Brand aliases via Tailwind
<div className="bg-brand-primary text-brand-accent" />

// ✅ CSS variables in inline styles (SVG, recharts, dynamic values)
<stop stopColor="var(--brand-primary)" />
<Cell fill="var(--brand-accent)" />
<div style={{ background: "var(--brand-gradient)" }} />

// ✅ Arbitrary Tailwind with [color:var()] for non-scale tokens
<div className="text-[color:var(--status-warning)]" />

// ❌ NEVER hardcode brand hex — always use token aliases
<stop stopColor="#0033FE" />       // → var(--brand-primary)
<Cell fill="#0BF1C3" />            // → var(--brand-accent)
<div className="bg-[#0a0a0a]" />  // → bg-neutral-1

// ❌ NEVER hardcode status hex
tagColor: "#ef4444"                // → var(--status-danger)
tagColor: "#f59e0b"                // → var(--status-warning)
```

### A token in the wrong slot deletes the whole declaration

The shadcn-style semantic tokens — `--background`, `--foreground`, `--primary`,
`--border`, `--muted`, `--ring`, … — hold **bare HSL channels** (`222 47% 11%`),
not colours. The 12-step scales (`--neutral-N`, `--blue-N`) hold real hex.

When `var()` substitutes something the property's grammar rejects, CSS does not
ignore the bad part: the **entire declaration** is invalid at computed-value
time and falls back to the initial value. There is no warning of any kind — the
build is green, the class is in the stylesheet, the element carries it, and it
does nothing. This shipped for months: every default Button had no fill, every
marketing card shadow was discarded, and the docs colour swatches had no colour.

```tsx
// ✅ Semantic utilities — they wrap the channels in hsl() for you
<div className="bg-background text-foreground border-border" />

// ✅ By hand, when composing a shadow or gradient
className="shadow-[0_0_10px_hsl(var(--primary)/0.4)]"

// ✅ A solid colour behind a gradient is a background-COLOR, a separate class
<div className="bg-neutral-1 bg-[radial-gradient(circle_at_50%_0%,var(--blue-2),transparent_42%)]" />

// ❌ Bare channels in a colour slot — the declaration is dropped, silently
<div className="bg-[var(--background)] text-[var(--foreground)]" />
className="shadow-[0_18px_70px_-58px_var(--foreground)]"
style={{ backgroundColor: "var(--muted)" }}

// ❌ A colour as a background-image layer — takes the gradient down with it
className="bg-[radial-gradient(…),var(--neutral-1)]"

// ❌ Shadowing a core token on an element — breaks it for the whole subtree
style={{ "--background": "linear-gradient(…)" }}   // name it --beam-fill
```

Shadows are a ramp, not a per-component decision: `shadow-ambient-sm|md|lg`,
`shadow-glass-sm|md|lg` (ambient + lit top edge, for translucent panels over a
blurred backdrop), `shadow-sheen` (top edge on solid inverted fills). Base takes
one step, hover the next. Each has a real dark-mode value — do not reach for
`hsl(var(--foreground))` in a shadow, it is near-white in dark mode.

Three further steps exist for the cases a directional neutral shadow cannot express:

| Step | Shape | Use for |
|---|---|---|
| `shadow-ambient-glow` | centred, no offset, 80px blur | a translucent panel that needs separation from its backdrop without reading as lifted. The only non-directional step. Inverts to a low-alpha *light* halo in dark mode, because a black halo has nothing to darken against a dark surround. |
| `shadow-glow-accent` / `-lg` / `-sm` | pool + `--brand-accent` halo | fixed dark-glass surfaces. `-lg` is the hover escalation, `-sm` is the halo alone for a chip or icon plate. The pool is deliberately identical in light and dark: these surfaces present the same dark glass in both themes. |
| `shadow-glow-primary` | `xl` geometry tinted with `--primary` at 5% | the emphasised card in a set, where the lift should read as coloured. |

A coloured shadow never hand-types the accent. `--brand-accent` is a complete
colour, not HSL channels, so alpha comes from
`color-mix(in srgb, var(--brand-accent) 8%, transparent)` — `hsl(var(--brand-accent)/.08)`
is invalid and voids the whole declaration.

**Detecting this:** `node scripts/audit-css-var-types.mjs <built .css>` resolves
every `var()` against the values the stylesheet defines and asks the browser's
own parser whether the result survives. It needs **built** CSS — Tailwind
arbitrary values do not exist before that — and it should be validated against a
known-bad stylesheet before a clean result is trusted.

Where a slot is reused across brands, register it instead of documenting it:
`recipe.css` declares `@property --btn-default-stroke-gradient { syntax: "<image>" }`
so a colour written there is rejected at that property rather than voiding the
declaration that reads it.

### Layout container widths (use these, not arbitrary max-w values)

| Token | CSS Variable | Tailwind | Use for |
|-------|-------------|----------|---------|
| `text` | `var(--container-text)` | `max-w-[var(--container-text)]` or `max-w-4xl` | Hero copy, CTA, FAQ — optimized for reading |
| `content` | `var(--container-content)` | `max-w-[var(--container-content)]` or `max-w-6xl` | Pricing, architecture, blog |
| `wide` | `var(--container-wide)` | `max-w-[1400px]` | Feature bento, testimonials, product demos, navbar |

```tsx
// ✅ Correct — use wide container for feature sections
<div className="mx-auto max-w-[1400px] px-4 md:px-6">

// ✅ Correct — use text container for reading-focused content
<div className="mx-auto max-w-4xl px-4 text-center">

// ❌ NEVER use max-w-5xl or max-w-7xl for feature sections — too narrow/inconsistent
<div className="mx-auto max-w-5xl">  // → max-w-[1400px]
<div className="mx-auto max-w-7xl">  // → max-w-[1400px]
```

### Exception: `global-error.tsx`

`global-error.tsx` renders **outside the root layout** (no CSS imports). Hardcoded hex values are allowed here because CSS variables are unavailable.

---

## Token Architecture

```
@nebutra/brand         → Brand primitives (color definitions, motion language)
                          Source data — not imported at runtime by apps
                          ↓
@nebutra/design-tokens → W3C DTCG token files (★ EDIT HERE)
                          tokens/core.json          primitive scales
                          tokens/themes/light.json  ┐ semantic + elevation —
                          tokens/themes/dark.json   ┘ always change as a pair
                          Style Dictionary 4 → build/css/styles.generated.css
                          ↓  (sync-styles.mjs copies it across)
@nebutra/tokens        → Runtime CSS variables consumed by apps
                          styles.css   GENERATED — never edit, see Rebranding
                          recipe.css   hand-written: @property + chrome recipes
                          @import "@nebutra/tokens/styles.css" in each globals.css
                          ThemeProvider + useTheme re-exported from next-themes
                          ↓
@nebutra/theme         → Design-language catalog (Brand Packages)
                          A language is roles + chrome recipe + elevation + zones
                          + fonts, applied whole — not a colour swap.
                          skins.css, scoped to html[data-brand="…"], generated by
                          emit-skins.mjs; applyLanguage() / LANGUAGE_REGISTRY.
                          7 built-in: gsap linear notion raycast stripe vanta vercel
                          Selected through @nebutra/preset (packages/ops/preset).
                          The 78 oklch [data-theme] mood presets were removed in
                          2026-07 for dual-writing product chrome — do not revive.
                          ↓
@nebutra/ui            → Component library
                          Components use CSS variables (var(--color-primary), etc.)
                          NebutraThemeProvider wraps Lobe UI with brand tokens
                          (internal bridge)
```

**In app code, always use CSS variables from `@nebutra/tokens`:**
```tsx
// ✅ Tailwind classes from tokens
<div className="bg-primary text-foreground border-border" />

// ✅ CSS variables
<div style={{ color: "var(--color-primary)" }} />

// ❌ Never import JS hex tokens from @nebutra/ui/theme
import { colors } from "@nebutra/ui/theme"; // deprecated — internal only
```

---

## Design Token Reference

View ALL tokens visually in Storybook:
```bash
pnpm --filter @nebutra/storybook dev
# → http://localhost:6006 → Design Tokens section
```

The **Design Tokens** section in Storybook shows:
- All brand colors (blue + cyan scales)
- Semantic 12-step scales
- Brand gradients
- Typography scale
- Motion presets
- Shadow/elevation system

---

## Package Commands

```bash
pnpm --filter @nebutra/ui typecheck     # typecheck component library
pnpm --filter @nebutra/storybook dev          # start Storybook
pnpm --filter @nebutra/storybook typecheck    # typecheck stories
pnpm --filter @nebutra/landing dev       # start landing page
pnpm --filter @nebutra/web dev                # start dashboard
node scripts/generate-palette.mjs --primary=#HEX --secondary=#HEX  # rebrand
```

---

## Backend Language Policy (TS-by-Default)

> See full reasoning in [ADR 2026-05-10 — TS-by-Default, Python Only When Justified](docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md).

### The rule

New backend work goes in **TypeScript** (`backends/gateway/` or `packages/<category>/<name>/`) by default.

A new Python service is acceptable **only** when its `README.md` cites at least one of:

1. **Batch / queued work** that is too long for edge runtimes (>5s typical)
2. **ML / scientific compute** that depends on the Python ecosystem (transformers, vLLM, etc.)
3. **Specialized libraries** with no comparable TS port

CRUD, webhooks, billing, content management, blockchain RPC reads, third-party API proxies — these go in **TS**, no exceptions.

### Where the canonical implementations live

| Domain | Canonical (use this) | Do not duplicate |
|---|---|---|
| Billing / subscriptions | `packages/commerce/billing` (TS) — multi-provider, full surface | ❌ no Python billing |
| Content management | `apps/studio` (Sanity) | ❌ no Python content |
| Auth / identity | `packages/iam/auth` + `apps/idp` | ❌ no Python auth |
| Webhooks | `packages/integrations/webhooks` | ❌ no Python webhook receiver |
| Edge AI (interactive) | `packages/ai/agents` (Vercel AI SDK) | use Python AI service only for batch/translate |

If you find yourself writing Python code that does what one of the above already does, stop and read the ADR.

### Three-tier module lifecycle

Every module under `backends/python/` and `packages/` has exactly one tier:

```
active     — has real callers; participates in build, typecheck, tests, CI
stub       — concept preserved (README + interface) but src/ is empty;
             activate by landing a real caller in the same PR
incubator  — moved to incubator/; excluded from workspaces and CI
```

Promotion rules:
- `stub → active`: requires a real consumer landing in the same PR
- `active → stub`: zero callers for one quarter (run quarterly caller-graph audit)
- `stub → incubator`: untouched for two quarters

### Caller-graph audit command

```bash
# Find external callers of a Python backend (by env-var URL)
rg "<SERVICE_NAME>_SERVICE_URL" --type ts -g '!**/node_modules/**' -g '!**/dist/**'
# Status-check probes and MCP registry entries do NOT count as real callers.
```

Status: as of 2026-05-12, after a follow-up audit, `backends/python/` contains only `_shared` + `ai`. recsys/ecommerce (mock data / broken callers), event-ingest (migrated in-process to gateway), content/web3/third-party (empty stubs) — all removed. The Three-Tier Lifecycle is now structurally enforced, not just documented.

---

## Deployment Target Policy

> See [ADR 2026-06-04 — Production Runtime Closure and Deploy Target Switchability](docs/architecture/2026-06-04-production-runtime-closure.md).

Default production topology:

```text
Vercel frontends -> Cloudflare Workers gateway -> ECS Origin -> Supabase / Upstash / R2 or OSS
```

This default is provider-switchable, not provider-locked. Use the per-service
selectors from `@nebutra/preset/deploy-target`:

| Service | Default | Selector |
|---|---|---|
| `web` | `vercel` | `DEPLOY_TARGET_WEB` |
| `landing` | `vercel` | `DEPLOY_TARGET_LANDING` |
| `gateway` | `cloudflare-workers` | `DEPLOY_TARGET_GATEWAY` |
| `python-ai` | `ecs-docker` | `DEPLOY_TARGET_PYTHON_AI` |

Frontends may switch to `standalone`, `cloudflare-pages`, or `railway` when an
adapter is intentionally selected. Gateway may switch to `vercel-functions`,
`ecs-docker`, `k8s`, `aws`, or `railway`. `python-ai` may switch to `k8s`,
`aws`, or `railway`. The rule is one service, one environment, one active
target.

`packages/*` do not deploy. They provide domain capabilities consumed by apps,
the gateway, or the origin backend.
