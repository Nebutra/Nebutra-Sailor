# AGENTS.md — apps/design-docs

Scoped execution contract for the internal design docs app.

## Scope

This app owns the Fumadocs-based design documentation surface for Nebutra.

It owns:

- docs routing and page composition under `src/app`
- checked-in documentation content under `content/`
- MDX and docs generation config in `source.config.ts`
- local remark helpers and sync/build scripts under `lib/` and `scripts/`

It does not own shared UI primitives, tokens, or package contracts exposed from
workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `source.config.ts` for docs collection shape, frontmatter schema, and MDX
  processing
- `content/` for checked-in docs content
- `src/app/[lang]/` for app shell, routing, and docs page behavior
- `lib/remark-component.ts` and `scripts/build-registry.mjs` for local docs
  transformations and registry generation

Do not treat `CONTRIBUTING.md` or generated caches under `.next/` as the
implementation truth.

## Contract Boundaries

- Content changes belong in `content/`; routing and rendering changes belong in
  `src/app/`.
- Frontmatter and MDX plugin behavior must stay aligned with `source.config.ts`.
- `openapi.json` is an imported docs input for this app, not a place to invent
  new API behavior.
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` are derived
  presentation surfaces and should stay consistent with the checked-in docs
  source.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`
- generated caches created by Fumadocs or TypeScript tooling

If docs generation output is wrong, update the checked-in docs source or local
generator script instead of editing build output.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/design-docs typecheck`
- `pnpm --filter @nebutra/design-docs lint:links`
- `pnpm --filter @nebutra/design-docs build`
