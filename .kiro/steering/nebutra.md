# Nebutra-Sailor — Kiro Steering Document

This document is always included in Kiro's context window. It provides the foundational knowledge needed to work effectively on the Nebutra-Sailor codebase.

## Project Overview

**Nebutra-Sailor** is an enterprise-grade SaaS monorepo for AI-native, multi-tenant platforms.

| Property | Value |
|----------|-------|
| Runtime | Node.js 22+, pnpm 10.32+ |
| Frameworks | Next.js 16 (App Router), Hono (API) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 + `@nebutra/tokens` |
| Linter | Biome (NOT ESLint) |
| Testing | Vitest + Playwright |
| Auth | `@nebutra/auth` — Clerk \| Better Auth \| NextAuth \| Supabase (env-swappable) |
| Database | Prisma v7 + PostgreSQL (pgvector, RLS) |
| Monorepo | Turborepo + pnpm workspaces |

## Repository Structure

### Apps

| App | Port | Purpose |
|-----|------|---------|
| `apps/landing-page` | 3002 | Public marketing site (next-intl, 7 locales) |
| `apps/web` | 3000 | Authenticated SaaS dashboard |
| `apps/storybook` | 6006 | Component documentation |
| `apps/studio` | 3333 | Sanity CMS |
| `apps/docs` | — | Mintlify product docs |

### Backends (non-UI services)

| Backend | Language | Purpose |
|---------|----------|---------|
| `backends/gateway/` | TypeScript / Hono | BFF, auth, tenancy, rate-limit, routing — **default for new backend work** |
| `backends/python/ai/` | Python / FastAPI | LLM completions, embeddings, E2B sandbox, agent orchestration |
| `backends/go/event-ingest/` | Go / chi | High-throughput usage event ingestion (202 Accepted stub → ClickHouse) |

### Key Packages

| Package | Purpose |
|---------|---------|
| `@nebutra/ui` | PRIMARY component library (Radix + HeroUI + Lobe UI) |
| `@nebutra/tokens` | CSS variables — color scales, brand, theming |
| `@nebutra/icons` | 541 Geist icons as TSX components |
| `@nebutra/db` | Prisma v7 + PostgreSQL client |
| `@nebutra/billing` | Multi-provider billing (Stripe \| Polar \| LemonSqueezy \| ChinaPay) |
| `@nebutra/auth` | Auth abstraction — Clerk \| Better Auth \| NextAuth \| Supabase (`packages/iam/auth/`) |
| `@nebutra/email` | Resend transactional email |
| `@nebutra/agents` | AI runtime: Vercel AI SDK helpers + multi-agent orchestration |
| `@nebutra/ai-providers` | Provider registry metadata (meta-only) |
| `@nebutra/permissions` | RBAC/ABAC — CASL + OpenFGA |
| `@nebutra/webhooks` | Outbound webhooks via Svix |
| `@nebutra/metering` | ClickHouse usage metering |
| `@nebutra/logger` | Structured logging (Sentry) |
| `@nebutra/errors` | Typed error definitions |
| `@nebutra/tenant` | Multi-tenancy context (AsyncLocalStorage + RLS) |

## Core Conventions

### Imports

```tsx
// UI — always from @nebutra/ui
import { Button, Input, Card } from "@nebutra/ui/components";
import { PageHeader, EmptyState } from "@nebutra/ui/layout";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

// Icons
import { Search, Bell } from "@nebutra/icons";
import { ChevronRight } from "lucide-react";

// Utilities
import { cn } from "@nebutra/ui/utils";
import { ThemeProvider } from "@nebutra/tokens";
```

### Styling

```tsx
// ✅ Use token-based Tailwind classes
<div className="bg-neutral-1 text-neutral-12 border-neutral-7" />
<button className="bg-blue-9 text-white" />
<span className="text-cyan-11" />

// ✅ Brand gradient (inline style only)
<h1 style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>

// ❌ Never hardcode hex values
// #0033FE → var(--brand-primary) or className="text-blue-9"
// #0BF1C3 → var(--brand-accent) or className="text-cyan-9"
```

### Animations

```tsx
// Always use AnimateIn — never raw motion.div
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

<AnimateIn preset="emerge">         {/* blur+rise */}
<AnimateIn preset="emerge" inView>  {/* scroll-triggered */}
<AnimateIn preset="fadeUp">
```

### Next.js 16 Patterns

```tsx
// File: proxy.ts (NOT middleware.ts — renamed in Next.js 16)
// All request APIs are async
const cookieStore = await cookies();
const headersList = await headers();

// Mutations: Server Actions
async function createProject(formData: FormData) {
  "use server";
  // ...
}

// Data fetching in Client Components: TanStack Query
const { data } = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
```

### BFF Gateway (Hono)

```typescript
// backends/gateway/src/routes/
import { requirePermission } from "@nebutra/permissions";
import { getCurrentTenant } from "@nebutra/tenant";

app.post("/api/v1/projects",
  requirePermission("create", "Project"),
  zValidator("json", createProjectSchema),
  async (c) => {
    const { tenantId } = getCurrentTenant();
    const data = await c.req.json();
    const project = await db.project.create({ data: { ...data, tenantId } });
    return c.json({ data: project }, 201);
  }
);
```

### Error Handling

```typescript
import { NotFoundError, ForbiddenError, ValidationError } from "@nebutra/errors";

// Throw typed errors — middleware converts to correct HTTP responses
throw new NotFoundError("Project not found");
throw new ForbiddenError("You do not have permission to delete this project");
```

### Logging

```typescript
import { logger } from "@nebutra/logger";

// Never use console.log in production code
logger.info("User signed in", { userId, orgId, tenantId });
logger.error("Stripe webhook failed", { error, eventId });
```

## Permission System

### Roles
`OWNER` > `ADMIN` > `MEMBER` > `VIEWER`

### Scope Format
`resource:action` — e.g., `project:create`, `billing:manage`, `team:invite`

### Usage
```tsx
// Hono route protection
app.delete("/api/v1/projects/:id", requirePermission("delete", "Project"), handler);

// React UI gate
import { Can } from "@nebutra/permissions/react";
<Can action="delete" resource="Project" subject={project}>
  <DeleteButton />
</Can>

// Programmatic check
import { hasPermission } from "@nebutra/permissions";
if (!hasPermission(role, "billing:manage")) throw new ForbiddenError("...");
```

## Testing Standards

- **Unit tests**: Vitest, minimum 80% line/function coverage
- **E2E tests**: Playwright, critical user flows only
- **Architecture tests**: `pnpm test:arch` — validates dependency flow
- **Storybook**: Every new component MUST have a story

## Common Commands

```bash
pnpm dev                  # start all apps
pnpm dev:dashboard        # web + api-gateway
pnpm dev:marketing        # landing-page + studio
pnpm typecheck            # TypeScript check
pnpm lint                 # Biome lint
pnpm lint:fix             # auto-fix lint
pnpm test                 # Vitest unit tests
pnpm e2e                  # Playwright E2E
pnpm build                # production build
pnpm db:generate          # regenerate Prisma client
pnpm db:migrate           # run database migrations
pnpm infra:up             # start Docker (PG + Redis + ClickHouse)
pnpm infra:lite           # PostgreSQL only (fast start)
pnpm brand:sync           # sync brand assets
pnpm generate:api-types   # regenerate TypeScript types from OpenAPI
```

## Auth Pattern

```typescript
// Select provider via AUTH_PROVIDER env var (or create-sailor --auth=...)
import { createAuth } from "@nebutra/auth/server";

const auth = await createAuth({ provider: process.env.AUTH_PROVIDER ?? "clerk" });
// Providers: "clerk" | "better-auth" | "nextauth" | "supabase"

const session = await auth.getSession(request);
if (!session) return new Response(null, { status: 401 });
```

## Backend Language Policy

- New backend work → **TypeScript** in `backends/gateway/` by default
- Python (`backends/python/`) only for: batch/ML/LLM work, E2B sandboxes, or libs with no TS equivalent
- Go (`backends/go/`) only for: high-throughput I/O, event pipelines
- CRUD, webhooks, billing, auth → always TS, no exceptions

## Hard Rules

1. No `console.log` — use `@nebutra/logger`
2. No hardcoded secrets — use environment variables
3. No `@primer/react` — removed from the project
4. No inline hex brand colors — use CSS variable tokens
5. No raw `motion.div` — use `AnimateIn` from `@nebutra/ui/components`
6. No component without a Storybook story
7. No `middleware.ts` — use `proxy.ts` (Next.js 16)
8. No direct Prisma client — import `db` from `@nebutra/db`
9. Biome linter only — never suggest or configure ESLint
10. Immutable data patterns — spread objects, never mutate

## Multi-Tenancy Pattern

```typescript
// All database operations are tenant-scoped
import { getCurrentTenant } from "@nebutra/tenant";
import { withRls } from "@nebutra/tenant";

const tenant = getCurrentTenant(); // from AsyncLocalStorage context
const db = withRls(prisma, tenant.tenantId); // RLS-enabled Prisma client

// Every query automatically filters by tenantId via RLS policies
const projects = await db.project.findMany(); // only this tenant's projects
```
