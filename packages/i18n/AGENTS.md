# AGENTS.md — packages/i18n

Execution contract for Nebutra's shared internationalization package.

## Scope

Applies to everything under `packages/i18n/`.

This package owns shared locale routing and request-time message loading for
apps using `next-intl`.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical locale routing and navigation helpers: `src/routing.ts`
- Canonical request-time locale resolution and message loading:
  `src/request.ts`
- Checked-in locale message catalogs: `locales/*.json`

## Contract Boundaries

- Treat `src/routing.ts` as the canonical source for supported locales,
  `defaultLocale`, locale-prefix behavior, and generated navigation helpers. Do
  not redefine locale lists in consumers.
- Treat `src/request.ts` as the canonical request-side fallback and dynamic
  message-loading behavior. If locale resolution changes, update it there
  instead of patching app-local wrappers.
- Treat `locales/*.json` as the checked-in source for shared messages. Do not
  hand-edit compiled message output or duplicate messages into app code when the
  package catalog should change instead.
- Keep this package focused on routing and messages. Product-specific copy
  choices belong in the message catalogs, not in new TypeScript branching logic.
- Preserve export compatibility for `./request` and `./routing`; these are
  consumer-facing integration points for Next.js apps.

## Generated And Derived Files

- Compiled app bundles that inline locale messages are derived from
  `locales/*.json`, `src/request.ts`, and `src/routing.ts`.
- Compiler caches and temporary build artifacts are derived files.

## Validation

- Routing, request, or export changes:
  `pnpm --filter @nebutra/i18n typecheck`
- If package linting matters for touched files:
  `pnpm --filter @nebutra/i18n lint`
