# AGENTS.md — packages/sanity

Execution contract for Nebutra's shared Sanity client package.

## Scope

Applies to everything under `packages/sanity/`.

This package owns the reusable Sanity client surface, shared GROQ queries, and
image URL helpers consumed by apps.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical Sanity client and environment defaults: `src/client.ts`
- Canonical shared GROQ queries and fetch helpers: `src/queries.ts`
- Canonical image URL builder helpers: `src/image.ts`

## Contract Boundaries

- Treat `src/client.ts` as the canonical source for `projectId`, `dataset`,
  `apiVersion`, CDN behavior, and server-token client creation. Do not duplicate
  those defaults across apps.
- Keep write-capable or token-bearing behavior behind `getServerClient()`. Do
  not leak server-token usage into client-safe imports.
- Treat `src/queries.ts` as the checked-in source of shared GROQ query strings
  and package-level fetch helpers. If content shape changes, update the query
  and helper together.
- Keep image URL behavior under `src/image.ts`. Do not rebuild alternative
  builders in consumers when the shared builder should change instead.
- This package is a shared content-access boundary, not a schema-definition
  package. Studio schema ownership belongs outside this package.

## Generated And Derived Files

- `tsconfig.tsbuildinfo` and compiler artifacts are derived files.
- Consumer-fetched content and rendered images are runtime data derived from the
  Sanity backend, not checked-in source.

## Validation

- Client, query, or image helper changes:
  `pnpm --filter @nebutra/sanity typecheck`
- If emitted JS or declarations matter:
  `pnpm --filter @nebutra/sanity build`
