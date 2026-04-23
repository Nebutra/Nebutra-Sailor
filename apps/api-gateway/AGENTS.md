# AGENTS.md — apps/api-gateway

Execution contract for the Hono API gateway.

## Scope

Applies to everything under `apps/api-gateway/`.

## Source Of Truth

- HTTP entrypoint and middleware composition: `src/index.ts`
- Environment contract: `src/config/env.ts`
- Route behavior: `src/routes/**`
- Middleware semantics: `src/middlewares/**`
- Background workflows: `src/inngest/**`
- Exported OpenAPI contract: generated from this app via `scripts/export-spec.ts`

Preserve middleware order unless the task explicitly changes request lifecycle
semantics.

## Defaults

- Prefer contract-first changes: route tests, env tests, middleware tests.
- Keep route groups thin. Push reusable business logic into services or packages.
- Do not patch `dist/`; edit `src/` and rebuild.
- If API shapes change, regenerate and propagate the OpenAPI spec rather than
  making consuming apps drift.

## Do Not Edit Directly

- `dist/`
- exported spec outputs unless you are regenerating from source

## Validation

```bash
pnpm --filter @nebutra/api-gateway test
pnpm --filter @nebutra/api-gateway typecheck
pnpm --filter @nebutra/api-gateway generate:spec
```

Run `generate:spec` whenever route contracts or OpenAPI annotations change.
