# 88→100 Architecture Design

Date: 2026-03-05
Status: Approved

## Problem

12-point gap from 100/100 against 2026 SV unicorn standards. Root causes:

1. **No token SSOT** — HEX (ui) + HSL (@theme) + oklch (themes.css) coexist. 455 raw Tailwind violations.
2. **API not type-safe** — OpenAPI skeleton only, repositories empty, webhooks unvalidated.
3. **CSP unsafe-inline** — No nonce middleware.

## Solution: 4 Parallel Workstreams

### WS1: Token Codemod + ESLint Rule

**Scope:** `packages/design/ui/src/`, `apps/web/src/`, `apps/landing-page/src/`, `eslint.config.mjs`

**Deliverables:**
1. `scripts/codemod-tokens.ts` — regex-based transformer:
   - Maps `bg-gray-*`/`bg-zinc-*`/`bg-slate-*` → `bg-[var(--neutral-N)]`
   - Maps `text-gray-*`/`text-zinc-*`/`text-slate-*` → `text-[var(--neutral-N)]`
   - Maps `border-gray-*`/`border-zinc-*`/`border-slate-*` → `border-[var(--neutral-N)]`
   - Maps `rounded-{sm,md,lg,xl,2xl,3xl}` → `rounded-[var(--radius-*)]`
   - Strips paired `dark:` variants (tokens auto-switch via data-theme)

2. ESLint rule in `eslint.config.mjs` using `eslint-plugin-regexp` or custom:
   - Bans `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`, `text-slate-*`, etc.
   - Bans `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`

**Mapping table:**

| Tailwind gray/zinc/slate scale | Semantic token | 12-step role |
|---|---|---|
| 50 | `--neutral-2` | Subtle bg |
| 100 | `--neutral-3` | Component bg |
| 200 | `--neutral-4` | Component hover |
| 300 | `--neutral-5` / `--neutral-7` | Active / border |
| 400 | `--neutral-8` | Hovered border |
| 500 | `--neutral-9` | Solid fill |
| 600 | `--neutral-10` | Solid hover |
| 700 | `--neutral-11` | Secondary text |
| 800 | `--neutral-3` (dark ctx) | Dark component bg |
| 900 | `--neutral-2` (dark ctx) | Dark subtle bg |
| 950 | `--neutral-1` (dark ctx) | Dark app bg |

### WS2: OpenAPIHono Migration

**Scope:** `backends/gateway/src/`

**Deliverables:**
1. Replace `new Hono()` with `new OpenAPIHono()` in `src/index.ts`
2. Convert all route files to use `createRoute()` + Zod schemas
3. Wire `app.doc()` to auto-generate OpenAPI spec from routes
4. Add Zod validation to webhook routes (clerk.ts, stripe.ts)

### WS3: Repository Implementation

**Scope:** `packages/platform/repositories/src/`

**Deliverables:**
1. `user.repository.ts` — UserRepository class wrapping Prisma User model
2. `organization.repository.ts` — OrganizationRepository wrapping Prisma Organization model
3. `index.ts` — re-export all repositories
4. Types match what api-gateway imports expect

### WS4: CSP Nonce Middleware

**Scope:** `apps/web/src/middleware.ts`, `apps/web/next.config.ts`

**Deliverables:**
1. Generate `crypto.randomUUID()` nonce per request in middleware
2. Set `Content-Security-Policy` header with nonce (replacing `'unsafe-inline'`)
3. Pass nonce via `x-nonce` request header for Next.js to consume
4. Update next.config.ts CSP to be template-based

## Parallel Safety

Zero file overlap between workstreams. All can execute concurrently.

## Expected Score Impact

| Dimension | Before | After | Delta |
|---|---|---|---|
| Token Architecture | 7.0 | 10.0 | +3.0 |
| API/Contract | 6.0 | 9.5 | +3.5 |
| Performance | 6.5 | 7.5 | +1.0 |
| Security | 7.5 | 9.5 | +2.0 |
| Governance | 9.5 | 10.0 | +0.5 |
| Visual Design | 9.0 | 9.5 | +0.5 |
| **Total** | **88** | **~100** | **+12** |
