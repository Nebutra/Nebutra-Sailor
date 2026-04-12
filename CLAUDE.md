# Nebutra-Sailor — Claude Code Instructions

This file is the single source of truth for how Claude Code should work in this codebase.
Read it in full before writing any code.

---

## Project Structure


> `@nebutra/design-system` has been merged into `@nebutra/ui` (layout components now at `@nebutra/ui/layout`).

```
apps/
  landing-page/   Next.js 16 + Tailwind v4 — public marketing site
  web/            Next.js 16 + Tailwind v4 — authenticated dashboard
  storybook/      Storybook 8.x — component library documentation
  api-gateway/    Hono + OpenAPI — backend APIs
  design-docs/    Next.js 16 + Fumadocs — internal docs
  studio/         Sanity Studio v4 — content management
  docs/           Mintlify — public product docs

packages/
  ui/             PRIMARY component library — Radix + HeroUI + Lobe UI + layout + framer-motion
  tokens/         Runtime design tokens (CSS variables) + next-themes ThemeProvider  ★ SOURCE OF TRUTH
  brand/          Brand colors, gradients, motion language (VI manual)
  theme/          CSS-only multi-theme engine (data-theme attribute, 6 oklch themes)
  icons/          541 Geist icons as tree-shakable TSX components
  preset/         Feature-based SaaS starter config system
  queue/          Provider-agnostic message queue — QStash (serverless) + BullMQ (self-hosted Redis)
  search/         Full-text search — Meilisearch (self-hosted) + Typesense + Algolia (managed)
  notifications/  Multi-channel notification center — Novu (managed) + direct dispatchers
  permissions/    RBAC/ABAC permissions engine — CASL (in-process) + OpenFGA (Zanzibar)
  webhooks/       Outbound webhook management — Svix (managed) + custom (self-hosted)
  metering/       Usage metering pipeline — ClickHouse real-time aggregation for billing
  uploads/        Large file uploads — S3/R2 multipart + Tus resumable + presigned URLs
  vault/          Application-layer secrets — envelope encryption (AWS KMS + local HKDF)
  tenant/         Multi-tenancy context — AsyncLocalStorage + RLS + schema isolation
```

---

## Component Generation Rules

### 1. Always import from the right package

```tsx
// UI components (Lobe UI re-exports + Radix + HeroUI)
import { Button, Input, Card } from "@nebutra/ui/components";

// Layout wrapper components (merged from design-system)
import { PageHeader, EmptyState, LoadingState, ErrorState } from "@nebutra/ui/layout";

// Icons — Geist icons from @nebutra/icons, Lucide for generic
import { Search, Settings } from "@nebutra/icons";
import { ChevronRight } from "lucide-react";

// Theme switching (light/dark) — from @nebutra/tokens
import { ThemeProvider, useTheme } from "@nebutra/tokens";

// Lobe UI theme wrapper — from @nebutra/ui
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
| `--neutral-7` | Default border | gray-300 |
| `--neutral-11` | Secondary text | gray-700 |
| `--neutral-12` | Primary text | gray-900 |
| `--blue-9` | Primary solid fill | #0033FE |
| `--blue-3` | Primary component bg | blue-200 |
| `--cyan-9` | Accent solid fill | #0BF1C3 |
| `--brand-gradient` | Blue→Cyan gradient | 135deg |

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

**Never use raw `motion.div` with hardcoded values.** Always use `AnimateIn` or import from `packages/brand/src/motion.ts`.

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
- Keyboard navigation support (focus rings via `focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1`)

```tsx
// ✅ Accessible icon button
<button
  type="button"
  aria-label="Close dialog"
  className="rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
>
  <X className="h-4 w-4" />
</button>
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

After creating the component, add to `packages/ui/src/components/index.ts`:
```ts
export { MyComponent, type MyComponentProps } from "./my-component";
```

---

## Rebranding (no Figma required)

To change the brand colors:
1. Edit `packages/tokens/styles.css` — the runtime token source of truth
2. Edit `packages/brand/src/` — the brand primitive definitions
3. Optionally edit `packages/theme/themes.css` — for multi-theme presets

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

### QStash webhook route (Hono / api-gateway)

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
@nebutra/brand    → Brand primitives (color definitions, motion language)
                     Source data — not imported at runtime by apps
                     ↓
@nebutra/tokens   → Runtime CSS variables (★ SINGLE SOURCE OF TRUTH)
                     @import "@nebutra/tokens/styles.css" in each app's globals.css
                     Light/dark mode, 12-step color scales, brand gradients
                     ThemeProvider + useTheme re-exported from next-themes
                     ↓
@nebutra/theme    → Multi-theme presets (oklch, 6 variants)
                     Product feature: neon, gradient, dark-dense, minimal, vibrant, ocean
                     Used by the SaaS preset system
                     ↓
@nebutra/ui       → Component library
                     Components use CSS variables (var(--color-primary), etc.)
                     NebutraThemeProvider wraps Lobe UI with brand tokens (internal bridge)
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
pnpm --filter @nebutra/landing-page dev       # start landing page
pnpm --filter @nebutra/web dev                # start dashboard
node scripts/generate-palette.mjs --primary=#HEX --secondary=#HEX  # rebrand
```
