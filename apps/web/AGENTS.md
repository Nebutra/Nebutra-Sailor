# AGENTS.md — apps/web

Execution contract for the authenticated dashboard app.

## Scope

Applies to everything under `apps/web/`.

## Source Of Truth

- App Router structure: `src/app`
- Shared web auth helpers and tenant resolution: `src/lib/auth.ts`
- Organization and workspace state helpers: `src/lib/active-organization.ts`,
  `src/lib/workspace-selection.ts`
- API client generation target: `src/lib/api/types.generated.ts`
- Settings and shell behavior: `src/components`, route handlers under `src/app/api`

If a frontend behavior is derived from API contracts, regenerate types from
`apps/api-gateway` instead of hand-editing generated API types.

## Defaults

- Default to Server Components. Add `"use client"` only when interactivity or
  browser APIs are required.
- Reuse `@nebutra/ui` and tokenized styling. Do not create app-local visual
  primitives unless the package boundary is clearly wrong.
- Keep server actions and route handlers predictable and testable. Prefer stable
  JSON or redirect contracts over ad hoc exceptions.
- When touching auth, organization, notifications, or settings flows, add or
  update route or action contract tests.

## Do Not Edit Directly

- `.next/`
- generated API types in `src/lib/api/types.generated.ts`

Regenerate generated API types with:

```bash
pnpm --filter @nebutra/api-gateway generate:spec
pnpm --filter @nebutra/web generate:api-types
```

## Validation

Use the smallest relevant set:

```bash
pnpm --filter @nebutra/web exec vitest run <targeted-tests>
pnpm --filter @nebutra/web exec tsc --noEmit --pretty false
```

If you modify route handlers or server actions, prefer targeted tests before
typecheck.
