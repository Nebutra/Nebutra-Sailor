# GitHub Copilot Instructions — Nebutra-Sailor

This file provides project-wide context for GitHub Copilot Chat and inline completions.

## Project Identity

**Nebutra-Sailor** is an enterprise-grade SaaS monorepo for AI-native, multi-tenant platforms built on Next.js 16, Hono, Prisma, and Clerk.

- **Runtime**: Node.js 22+, pnpm 10.32+
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **Styling**: Tailwind CSS v4 + CSS variables (`@nebutra/tokens`)
- **Language**: TypeScript 5.9 (strict mode)
- **Linter**: Biome (NOT ESLint — never suggest ESLint)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: Prisma v7 + PostgreSQL with pgvector + RLS

## Monorepo Structure

```
apps/landing-page/  → public marketing site (next-intl, 7 locales)
apps/web/           → authenticated SaaS dashboard (Clerk auth, RBAC)
apps/api-gateway/   → Hono + OpenAPI backend (Zod, 10-layer middleware)
apps/storybook/     → Storybook 8.x component docs
apps/studio/        → Sanity Studio v5 CMS
apps/docs/          → Mintlify product docs

packages/ui/        → PRIMARY component library (Radix + HeroUI + Lobe UI)
packages/tokens/    → CSS variables — SINGLE SOURCE OF TRUTH for theming
packages/icons/     → 541 Geist icons as TSX components
packages/db/        → Prisma v7 + PostgreSQL schema
packages/billing/   → Stripe subscriptions + usage metering
packages/identity/  → Auth abstraction layer (Clerk adapter)
packages/email/     → Resend transactional email
packages/ai-sdk/    → Vercel AI SDK wrapper
packages/permissions/ → RBAC/ABAC (CASL + OpenFGA)
packages/webhooks/  → Outbound webhooks via Svix
packages/metering/  → ClickHouse usage metering
packages/logger/    → Structured logging (Sentry integration)
packages/errors/    → Typed error definitions
packages/audit/     → Audit logging (37 action types)
```

## Import Conventions

Always use these import paths — never import directly from node_modules for these:

```tsx
import { Button, Input, Card, Badge } from "@nebutra/ui/components";
import { PageHeader, EmptyState, LoadingState, ErrorState } from "@nebutra/ui/layout";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Search, Settings, ChevronDown } from "@nebutra/icons";
import { ChevronRight, MoreHorizontal } from "lucide-react";  // generic icons
import { ThemeProvider, useTheme } from "@nebutra/tokens";
import { cn } from "@nebutra/ui/utils";
```

**Never** import from:
- `@primer/react` (removed from project)
- `@nebutra/ui/theme` JS tokens (deprecated)
- Direct `@heroui/*` unless Radix has no equivalent

## Styling Guidelines

Use Tailwind CSS with `@nebutra/tokens` CSS variables:

```tsx
// ✅ 12-step semantic color scale
<div className="bg-neutral-1 text-neutral-12 border-neutral-7" />
<button className="bg-blue-9 text-white hover:bg-blue-10" />
<span className="text-cyan-11" />

// ✅ Semantic aliases
<div className="bg-primary text-foreground border-border" />
<div className="bg-destructive text-destructive-foreground" />

// ✅ Brand gradient (always inline style or CSS var)
<h1 style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} />

// ✅ Container widths
<section className="mx-auto max-w-[1400px] px-4 md:px-6" />  // wide content
<div className="mx-auto max-w-4xl px-4" />                    // reading content

// ❌ Never hardcode brand hex
style={{ color: "#0033FE" }}  // → use var(--brand-primary) or className="text-blue-9"
style={{ color: "#0BF1C3" }}  // → use var(--brand-accent) or className="text-cyan-9"
```

## Animation

Always use `AnimateIn` or `AnimateInGroup` from `@nebutra/ui/components`:

```tsx
// Single element entrance
<AnimateIn preset="emerge">
  <Card>content</Card>
</AnimateIn>

// Scroll-triggered (landing page sections)
<AnimateIn preset="emerge" inView>
  <FeatureSection />
</AnimateIn>

// Staggered list
<AnimateInGroup stagger="normal">
  {items.map(item => (
    <AnimateIn key={item.id} preset="fadeUp">
      <Card>{item.title}</Card>
    </AnimateIn>
  ))}
</AnimateInGroup>
```

**Never** use `motion.div` with hardcoded `initial`/`animate` values.

## Component Development Rules

1. **CVA for variants**: Use `class-variance-authority` for all component variants
2. **Accessibility**: `type="button"` on all buttons, `aria-label` on icon buttons, focus rings
3. **Stories required**: Every new component needs a `*.stories.tsx` file in `apps/storybook/`
4. **Co-location**: `component.tsx` + `component.stories.tsx` in same directory

## Next.js 16 Rules

- Prefer **Server Components** by default — `'use client'` only when truly needed
- Use `proxy.ts` NOT `middleware.ts` (renamed in Next.js 16)
- All request APIs are async: `await cookies()`, `await headers()`, `await params`
- Server Actions (`'use server'`) for mutations, NOT Route Handlers
- Client data fetching: TanStack Query + typed API client from `@/lib/api/client`
- Route Handlers only for public APIs, webhooks, large file uploads

## API Gateway (Hono)

```ts
// Routes in: apps/api-gateway/src/routes/
// All routes must use Zod for validation
import { zValidator } from "@hono/zod-validator";

// Permissions
import { requirePermission } from "@nebutra/permissions";
app.delete("/api/v1/projects/:id", requirePermission("delete", "Project"), handler);

// Tenant context (available in any handler after tenantMiddleware)
import { getCurrentTenant } from "@nebutra/tenant";
const tenant = getCurrentTenant(); // { tenantId, plan, features }

// API error format
import { NebutraError } from "@nebutra/errors";
throw new NebutraError({ code: "NOT_FOUND", status: 404, message: "Project not found" });
```

## Authentication

```ts
// Always use these helpers from @/lib/auth
import { getAuth, requireAuth, requireOrg, getTenantContext } from "@/lib/auth";

// Server Component — get current user
const { userId, orgId } = await getAuth();

// Protected route — throws if not authed
await requireAuth();

// Org required — throws if no org selected
await requireOrg();

// Full tenant context
const { tenantId, plan, features } = await getTenantContext();
```

## Database

```ts
// Import from @nebutra/db — never import prisma directly
import { db } from "@nebutra/db";

// With Row-Level Security (multi-tenant operations)
import { withRls } from "@nebutra/tenant";
const tenant = getCurrentTenant();
const dbWithRls = withRls(db, tenant.tenantId);
const projects = await dbWithRls.project.findMany();
```

## Error Handling

```ts
import { NebutraError, NotFoundError, ForbiddenError, ValidationError } from "@nebutra/errors";

// Throw typed errors — the middleware handles HTTP status codes
throw new NotFoundError("Project not found");
throw new ForbiddenError("Insufficient permissions");
throw new ValidationError("Invalid input", [{ field: "email", message: "Invalid email" }]);
```

## Logging

```ts
// Never use console.log in production code
// Always use @nebutra/logger
import { logger } from "@nebutra/logger";

logger.info("Project created", { projectId, tenantId });
logger.error("Payment failed", { error, invoiceId });
```

## Testing

```ts
// Vitest for unit tests
import { describe, it, expect, vi } from "vitest";

// Coverage requirements: 80% lines/functions, 70% branches
// Run: pnpm test
// Run with coverage: pnpm test:coverage
```

## What NOT to Generate

- `console.log` statements (use `@nebutra/logger`)
- Hardcoded secrets or API keys (use env vars)
- `@primer/react` imports (removed)
- Raw hex values for brand colors (use CSS variables)
- `motion.div` with hardcoded animation values (use AnimateIn)
- `middleware.ts` (renamed to `proxy.ts` in Next.js 16)
- Components without Storybook stories
- Direct `prisma` imports (use `db` from `@nebutra/db`)
