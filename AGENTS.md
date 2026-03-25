# AGENTS.md — Nebutra-Sailor

AI coding agent onboarding guide for Cursor, Claude Code, Codex, Windsurf, and GitHub Copilot.

---

## Project Overview

**Nebutra-Sailor** is an enterprise-grade SaaS monorepo for AI-native, multi-tenant platforms.

- **Runtime**: Node.js >= 22, pnpm 10.32+
- **Framework**: Next.js 16 (App Router, React 19, Turbopack)
- **Styling**: Tailwind CSS v4 + CSS variables from `@nebutra/tokens`
- **Language**: TypeScript 5.9 (strict mode)
- **Linting**: Biome (not ESLint)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Monorepo**: Turborepo with pnpm workspaces
- **License**: AGPL-3.0

---

## Repository Structure

```
apps/
  landing-page/   Next.js 16 — public marketing site (next-intl, 7 locales)
  web/            Next.js 16 — authenticated SaaS dashboard (Clerk auth)
  api-gateway/    Hono + OpenAPI — backend APIs (Zod validation, middleware stack)
  storybook/      Storybook 8.x — component library documentation
  design-docs/    Next.js 16 + Fumadocs — internal documentation
  studio/         Sanity Studio v5 — CMS for blog, changelog, pages
  docs/           Mintlify — public product documentation
  idp/            Identity Provider application

packages/
  ui/             Component library (Radix + HeroUI + Lobe UI + framer-motion)
  tokens/         Runtime CSS variables — SINGLE SOURCE OF TRUTH for theming
  brand/          Brand primitives (colors, gradients, motion language)
  theme/          Multi-theme CSS engine (6 oklch presets)
  icons/          541 Geist icons as tree-shakable TSX components
  preset/         Feature-based SaaS starter config system
  db/             Prisma v7 + PostgreSQL (pgvector, RLS, multi-schema)
  billing/        Stripe integration (subscriptions, credits, usage metering)
  identity/       Auth abstraction layer (Clerk adapter active)
  email/          Resend transactional emails (welcome, invite, quota alerts)
  ai-sdk/         Vercel AI SDK wrapper (OpenAI, OpenRouter, streaming)
  i18n/           next-intl integration
  analytics/      PostHog + Dub.co analytics
  audit/          Audit logging (37 action types, actor/tenant scoping)
  event-bus/      Inngest background jobs
  cache/          Redis caching adapter
  rate-limit/     Token bucket rate limiting
  alerting/       Email + Slack alert system
  errors/         Typed error definitions
  health/         Health check probes
  logger/         Structured logging (Sentry integration)
  contracts/      API contract definitions
  config/         Environment variable validation
  legal/          Legal content + GDPR consent tracking
  marketing/      Marketing components (FAQ, pricing, testimonials, waitlist)
  sanity/         Sanity CMS client + queries
  storage/        S3-compatible file storage
  oauth-server/   OAuth 2.0 provider
  mcp/            Model Context Protocol server
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Start infrastructure (PostgreSQL, Redis, ClickHouse)
pnpm infra:up          # full stack
pnpm infra:lite        # lightweight (PostgreSQL only)

# Start development
pnpm dev               # all apps
pnpm dev:dashboard     # web + api-gateway only
pnpm dev:marketing     # landing-page + studio only

# Run tests
pnpm test              # unit tests (Vitest)
pnpm e2e               # E2E tests (Playwright)
pnpm test:arch         # architecture smoke tests

# Type checking & linting
pnpm typecheck         # TypeScript check (turbo)
pnpm lint              # Biome linting
pnpm lint:fix          # Auto-fix lint issues

# Build
pnpm build             # production build (all apps)
```

---

## Key Conventions

### Imports — Always Use the Right Package

```tsx
// UI components
import { Button, Input, Card } from "@nebutra/ui/components";

// Layout wrappers
import { PageHeader, EmptyState, LoadingState, ErrorState } from "@nebutra/ui/layout";

// Icons — Geist icons preferred, Lucide for generic
import { Search, Settings } from "@nebutra/icons";
import { ChevronRight } from "lucide-react";

// Theme switching
import { ThemeProvider, useTheme } from "@nebutra/tokens";

// Utility
import { cn } from "@nebutra/ui/utils";
```

### Styling — Semantic Tokens, Not Raw Values

```tsx
// Use CSS variables from @nebutra/tokens
<div className="bg-[var(--neutral-1)] text-[var(--neutral-12)] border-[var(--neutral-7)]">

// Brand gradient
<h1 style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>

// Never use inline hex values for brand colors
// Never import JS color tokens from @nebutra/ui/theme
```

### Animations — Always Use AnimateIn

```tsx
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

// Single element
<AnimateIn preset="emerge"><Component /></AnimateIn>

// Staggered list
<AnimateInGroup stagger="normal">
  {items.map(item => <AnimateIn key={item.id} preset="fadeUp"><Card /></AnimateIn>)}
</AnimateInGroup>

// Presets: emerge (default), flow, fade, fadeUp, scale
// Never use raw motion.div with hardcoded values
```

### Component Variants — Use CVA

```tsx
import { cva, type VariantProps } from "class-variance-authority";
const variants = cva("base-classes", { variants: { size: { sm: "p-4", md: "p-6" } } });
```

---

## Data Fetching Patterns

### Server Components (API Gateway)

```tsx
// Auto-generated typed client from OpenAPI spec
import { getTypedApi } from "@/lib/api/client";

// Server-side (auto-injects Clerk JWT)
const api = await getTypedApi();
const { data } = await api.GET("/api/v1/resource");
```

### Client Components (TanStack Query)

```tsx
import { useQuery } from "@tanstack/react-query";
import { browserApiClient } from "@/lib/api/client";

const { data, isLoading } = useQuery({
  queryKey: ["resource"],
  queryFn: () => browserApiClient.GET("/api/v1/resource"),
});
```

### API Types

Types are auto-generated from the Hono OpenAPI spec:
```bash
pnpm --filter @nebutra/api-gateway generate:spec   # Export OpenAPI JSON
pnpm generate:api-types                             # Generate TypeScript types
```

---

## Authentication & Authorization

- **Provider**: Clerk (via `@clerk/nextjs`)
- **Auth helpers**: `apps/web/src/lib/auth.ts`
  - `getAuth()` — Get userId, orgId, sessionClaims
  - `requireAuth()` — Server-side auth guard (redirects to /sign-in)
  - `requireOrg()` — Org check (redirects to /select-org)
  - `getTenantContext()` — Get tenantId + plan from org metadata

- **RBAC**: `apps/web/src/lib/permissions.ts`
  - Roles: `admin`, `member`, `viewer`
  - Scopes: `resource:action` format (e.g., `billing:manage`, `team:invite`)
  - Use `<PermissionGate require="scope">` component for UI gating
  - Use `hasPermission(role, scope)` for programmatic checks

---

## Database

- **ORM**: Prisma v7 with PostgreSQL adapter
- **Schema**: `packages/db/prisma/schema.prisma` (~1,400 lines)
- **Schemas**: `public`, `ecommerce`, `recsys`, `web3`
- **Extensions**: pgvector, RLS
- **Key models**: Organization, User, Subscription, AuditLog, ApiKey, Content, Integration

```bash
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run migrations
pnpm db:push           # Push schema changes (dev)
pnpm db:studio         # Open Prisma Studio
```

---

## API Gateway (Hono)

Located at `apps/api-gateway/`. Middleware stack (in order):
1. Request/trace ID correlation
2. CORS (dynamic domain allowlist)
3. Compression (gzip/deflate/brotli)
4. Security headers (HSTS, X-Frame-Options, etc.)
5. Rate limiting (token bucket)
6. Idempotency (request deduplication)
7. Usage metering
8. Audit mutation logging
9. API versioning
10. Tenant context extraction

Route groups: `admin/`, `ai/`, `billing/`, `events/`, `legal/`, `webhooks/`

---

## Testing

### Unit Tests (Vitest)
- Config: `vitest.workspace.ts` (workspace-level), per-package `vitest.config.ts`
- Coverage thresholds: 80% lines/functions, 70% branches
- Run: `pnpm test` or `pnpm test:coverage`

### Architecture Tests
- Property-based tests using `fast-check`
- Validates dependency flow, token usage, no-inline-CSS
- Run: `pnpm test:arch`

### E2E Tests (Playwright)
- Config: `playwright.config.ts`
- Tests: `e2e/*.spec.ts` (landing, auth, dashboard)
- CI: 4-way sharded, Chromium
- Run: `pnpm e2e` or `pnpm e2e:ui`

---

## CI/CD

14 GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` — Primary pipeline (lint → typecheck → build → test → e2e → coverage)
- `deploy.yml` — Kubernetes deployment
- `docker-build-push.yml` — Multi-service Docker builds
- `security-scan.yml` — CodeQL + dependency scanning
- `chromatic.yml` — Storybook visual regression
- `lighthouse-dashboard.yml` — Performance monitoring

Change detection: Turborepo `--affected` + `dorny/paths-filter` for conditional jobs.

---

## Content Management (Sanity)

- **Studio**: `apps/studio/` (Sanity v5)
- **Client**: `packages/sanity/`
- **Schema types**: Post, Author, Category, Page, SiteSettings
- **Queries**: `getPosts()`, `getPostBySlug()`, `getCategories()`, `getSiteSettings()`

---

## What NOT to Do

```tsx
// Never import from @primer/react (removed)
import { Box } from "@primer/react";

// Never use inline hex for brand colors
<div style={{ color: "#0033FE" }}>

// Never use raw motion.div with hardcoded values
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

// Never use console.log (use @nebutra/logger)
console.log("debug");

// Never hardcode secrets
const key = "sk-proj-xxxxx";

// Never create components without Storybook stories
```

---

## Useful Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm dev:dashboard` | Dashboard + API only |
| `pnpm dev:marketing` | Landing page + Studio |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | Biome lint |
| `pnpm test` | Run unit tests |
| `pnpm e2e` | Run E2E tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm infra:up` | Start Docker infrastructure |
| `pnpm brand:sync` | Sync brand assets |
| `pnpm generate:api-types` | Regenerate API types from OpenAPI |

---

## File Naming Conventions

- Components: `kebab-case.tsx` (e.g., `auth-banner.tsx`)
- Tests: `*.test.ts` or `*.spec.ts`
- E2E tests: `e2e/*.spec.ts`
- Storybook: `*.stories.tsx`
- Config: `*.config.ts`
- Types: co-located with source, or `types.ts`

---

## Package Boundaries

| Need | Package | Import |
|------|---------|--------|
| UI components | `@nebutra/ui` | `@nebutra/ui/components` |
| Layout shells | `@nebutra/ui` | `@nebutra/ui/layout` |
| CSS variables | `@nebutra/tokens` | `@import "@nebutra/tokens/styles.css"` |
| Icons | `@nebutra/icons` | Named exports |
| Database | `@nebutra/db` | Prisma client |
| Auth adapter | `@nebutra/identity` | Provider adapters |
| Billing | `@nebutra/billing` | Stripe operations |
| Email | `@nebutra/email` | Send templates |
| AI | `@nebutra/ai-sdk` | streamText, generateText, embed |
| Logging | `@nebutra/logger` | Structured logger |
| Errors | `@nebutra/errors` | Typed errors |
| Audit | `@nebutra/audit` | Log audit events |
